<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { supabase } from './lib/supabase.js';
import { signOut } from './lib/auth.js';
import { listOrganizations } from './lib/api.js';
import LoginView from './views/LoginView.vue';
import OverviewView from './views/OverviewView.vue';
import PeopleView from './views/PeopleView.vue';
import IncidentsView from './views/IncidentsView.vue';
import ViolationsView from './views/ViolationsView.vue';
import AdminView from './views/AdminView.vue';

const session = ref(null);
const ready = ref(false);
const orgs = ref([]);
const activeOrgId = ref(localStorage.getItem('sdms.org') || '');
const tab = ref('overview');

// Footer year: updates itself when the year rolls over, even in a long-lived tab.
const now = ref(Date.now());
let yearTimer = 0;
const year = computed(() => new Date(now.value).getFullYear());

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'people', label: 'People' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'violations', label: 'Violations' },
  { id: 'admin', label: 'Admin' }
];

const membership = computed(() => orgs.value.find(m => m.organization.id === activeOrgId.value));
const isAdmin = computed(() => membership.value && ['org_admin', 'platform_owner'].includes(membership.value.role));
const canWrite = computed(() => membership.value && ['org_admin', 'platform_owner', 'teacher', 'staff'].includes(membership.value.role));
const orgId = computed(() => membership.value?.organization.id || '');

function setActiveOrg(id) {
  activeOrgId.value = id;
  if (id) localStorage.setItem('sdms.org', id);
}

onMounted(() => {
  supabase.auth.getSession().then(({ data }) => { session.value = data.session; ready.value = true; });
  const { data } = supabase.auth.onAuthStateChange((_event, s) => {
    session.value = s;
    if (!s) { orgs.value = []; setActiveOrg(''); localStorage.removeItem('sdms.org'); }
  });
  unsub = () => data.subscription.unsubscribe();
  // Check the clock every 10 minutes so the copyright year flips right after midnight, Dec 31.
  yearTimer = setInterval(() => { now.value = Date.now(); }, 600000);
});
let unsub = () => {};
onBeforeUnmount(() => { unsub(); clearInterval(yearTimer); });

watch(() => session.value?.user?.id, async (id) => {
  if (!id) { orgs.value = []; return; }
  try {
    const { data } = await listOrganizations();
    orgs.value = data || [];
    if (orgs.value.length && !orgs.value.some(m => m.organization.id === activeOrgId.value)) {
      setActiveOrg(orgs.value[0].organization.id);
    }
  } catch { orgs.value = []; }
});

async function doSignOut() {
  await signOut();
  tab.value = 'overview';
}
</script>

<template>
  <div v-if="!ready" class="center muted">Loading…</div>
  <LoginView v-else-if="!session" />

  <div v-else class="app">
    <header class="topbar">
      <span class="brand">SDMS</span>
      <select class="input org-select" :value="orgId" @change="setActiveOrg($event.target.value)"
        aria-label="Active organization">
        <option v-if="orgs.length === 0" value="">No organization yet</option>
        <option v-for="m in orgs" :key="m.organization.id" :value="m.organization.id">
          {{ m.organization.name }} ({{ m.role }})
        </option>
      </select>
      <nav class="tabs" aria-label="Main navigation">
        <button v-for="t in TABS" :key="t.id" class="tab" :class="{ active: tab === t.id }"
          @click="tab = t.id" v-show="t.id !== 'admin' || isAdmin">{{ t.label }}</button>
      </nav>
      <button class="link" @click="doSignOut">Sign out</button>
    </header>

    <main class="content" :key="tab">
      <div v-if="orgs.length === 0" class="center">
        <div class="card empty-card">
          <h2>You are not in any organization yet</h2>
          <p class="muted">Ask a platform owner or organization admin to add your account, then refresh this page.</p>
        </div>
      </div>
      <template v-else>
        <OverviewView v-if="tab === 'overview'" :org-id="orgId" :org="membership.organization" :role="membership.role" />
        <PeopleView v-else-if="tab === 'people'" :org-id="orgId" :can-write="canWrite" :is-admin="isAdmin" />
        <IncidentsView v-else-if="tab === 'incidents'" :org-id="orgId" :can-write="canWrite" :is-admin="isAdmin" />
        <ViolationsView v-else-if="tab === 'violations'" :org-id="orgId" :can-write="isAdmin" />
        <AdminView v-else-if="tab === 'admin' && isAdmin" :org-id="orgId" :org="membership.organization" :role="membership.role" />
      </template>
    </main>

    <footer class="footer">
      <p>© {{ year }} SDMS — Discipline Management System. All rights reserved.</p>
      <p class="muted">Built with Vue 3 + Express · Every action is recorded in the audit trail</p>
    </footer>
  </div>
</template>
