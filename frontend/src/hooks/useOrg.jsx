import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext.jsx';
import { listOrganizations } from '../lib/api.js';

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { session } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [orgsLoaded, setOrgsLoaded] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState(localStorage.getItem('sdms.org') || '');

  useEffect(() => {
    let cancelled = false;
    if (!session?.user?.id) { setOrgs([]); setOrgsLoaded(true); return; }
    (async () => {
      try {
        const { data } = await listOrganizations();
        if (cancelled) return;
        const list = data || [];
        setOrgs(list);
        if (list.length) {
          setActiveOrgId(prev => {
            const stillValid = list.some(m => m.organization.id === prev);
            const next = stillValid ? prev : list[0].organization.id;
            if (next) localStorage.setItem('sdms.org', next);
            return next;
          });
        }
      } catch { if (!cancelled) setOrgs([]); }
      finally { if (!cancelled) setOrgsLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const pickActive = (list) => {
    setActiveOrgId(prev => {
      const stillValid = list.some(m => m.organization.id === prev);
      const next = stillValid ? prev : (list[0]?.organization.id || '');
      if (next) localStorage.setItem('sdms.org', next);
      return next;
    });
  };

  const value = {
    orgs,
    orgsLoaded,
    membership: orgs.find(m => m.organization.id === activeOrgId) || null,
    organization: orgs.find(m => m.organization.id === activeOrgId)?.organization || null,
    orgId: activeOrgId,
    setActiveOrg: (id) => { setActiveOrgId(id); if (id) localStorage.setItem('sdms.org', id); },
    refresh: async () => {
      const { data } = await listOrganizations();
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
export const ROLE_WEIGHT = { viewer: 0, staff: 1, teacher: 1, org_admin: 2, platform_owner: 3 };

export function useRole() {
  const { membership } = useOrg();
  if (!membership) return { role: null, isAdmin: false, canWrite: false };
  const role = membership.role;
  return {
    role,
    isAdmin: ['org_admin', 'platform_owner'].includes(role),
    canWrite: ['org_admin', 'platform_owner', 'teacher', 'staff'].includes(role)
  };
}
