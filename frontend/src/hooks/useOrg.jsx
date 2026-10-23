import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext.jsx';
import { listInstitutions } from '../lib/api.js';

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { session } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [orgsLoaded, setOrgsLoaded] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState(localStorage.getItem('dm.institution') || '');

  useEffect(() => {
    let cancelled = false;
    if (!session?.user?.id) { setOrgs([]); setOrgsLoaded(true); return; }
    setOrgsLoaded(false); // keep deep links on their page while memberships load
    (async () => {
      try {
        const { data } = await listInstitutions();
        if (cancelled) return;
        const list = data || [];
        setOrgs(list);
        setActiveOrgId(prev => {
          const stillValid = list.some(m => m.institution.id === prev);
          const next = stillValid ? prev : (list[0]?.institution.id || '');
          if (next) localStorage.setItem('dm.institution', next);
          return next;
        });
      } catch { if (!cancelled) setOrgs([]); }
      finally { if (!cancelled) setOrgsLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const pickActive = (list) => {
    setActiveOrgId(prev => {
      const stillValid = list.some(m => m.institution.id === prev);
      const next = stillValid ? prev : (list[0]?.institution.id || '');
      if (next) localStorage.setItem('dm.institution', next);
      return next;
    });
  };

  const value = {
    orgs,
    orgsLoaded,
    membership: orgs.find(m => m.institution.id === activeOrgId) || null,
    organization: orgs.find(m => m.institution.id === activeOrgId)?.institution || null,
    orgId: activeOrgId,
    setActiveOrg: (id) => { setActiveOrgId(id); if (id) localStorage.setItem('dm.institution', id); },
    refresh: async () => {
      const { data } = await listInstitutions();
      const list = data || [];
      setOrgs(list);
      pickActive(list);
      setOrgsLoaded(true);
      return list;
    }
  };
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export const useOrg = () => useContext(OrgContext);
export const ROLE_WEIGHT = { auditor: 0, staff: 1, reviewer: 2, disciplinary_officer: 3, institution_admin: 4, platform_owner: 5 };
export const ROLE_LABELS = {
  institution_admin: 'Institution admin',
  disciplinary_officer: 'Disciplinary officer',
  reviewer: 'Reviewer',
  staff: 'Staff',
  auditor: 'Auditor',
  platform_owner: 'Platform owner'
};

export function useRole() {
  const { membership } = useOrg();
  const role = membership?.role || null;
  if (!role) return { role: null, isAdmin: false, canWrite: false, canDecide: false, canReport: false, isReadOnly: false };
  return {
    role,
    isAdmin: ['institution_admin', 'platform_owner'].includes(role),
    canWrite: ['institution_admin', 'platform_owner', 'disciplinary_officer'].includes(role),
    canReport: ['institution_admin', 'platform_owner', 'disciplinary_officer', 'staff'].includes(role),
    canDecide: ['institution_admin', 'platform_owner'].includes(role),
    isReadOnly: role === 'auditor'
  };
}
