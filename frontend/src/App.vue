<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { supabase } from './lib/supabase.js';
import { signOut } from './lib/auth.js';
import { listOrganizations, platformGet } from './lib/api.js';
import LoginView from './views/LoginView.vue';
import PublicHomeView from './views/PublicHomeView.vue';
import AboutView from './views/AboutView.vue';
import CommunityView from './views/CommunityView.vue';
import HelpView from './views/HelpView.vue';
import SetupView from './views/SetupView.vue';
import StructureView from './views/StructureView.vue';
import HistoryView from './views/HistoryView.vue';
import ReportsView from './views/ReportsView.vue';
import StudentScoreCardView from './views/StudentScoreCardView.vue';
import SettingsView from './views/SettingsView.vue';
import PlatformView from './views/PlatformView.vue';
import OverviewView from './views/OverviewView.vue';
import PeopleView from './views/PeopleView.vue';
import IncidentsView from './views/IncidentsView.vue';
import ViolationsView from './views/ViolationsView.vue';
import AdminView from './views/AdminView.vue';

const session = ref(null);
const ready = ref(false);
const orgs = ref([]);
const activeOrgId = ref(localStorage.getItem('sdms.org') || '');
const tab = ref('landing');        // public tab when signed out
const appTab = ref('overview');   // main app tab when signed in
const studentId = ref('');
const isPlatformOwner = ref(false);

// Footer year: updates itself when the year rolls over, even in a long-lived tab.
const now = ref(Date.now());
let yearTimer = 0;
const year = computed(() => new Date(now.value).getFullYear());

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'people', label: 'People' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'violations', label: 'Violations' },
  { id: 'structure', label: 'Structure' },
  { id: 'history', label: 'History' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
  { id: 'admin', label: 'Admin' },
  { id: 'platform', label: 'Platform', ownerOnly: true }
];
const PUBLIC_TABS = [
  { id: 'landing', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'community', label: 'Community' },
  { id: 'help', label: 'Help' }
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
  if (!id) { orgs.value = []; isPlatformOwner.value = false; studentId.value = ''; return; }
  appTab.value = 'overview';
  platformGet('dashboard').then(() => { isPlatformOwner.value = true; }).catch(() => { isPlatformOwner.value = false; });
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
  tab.value = 'landing'; appTab.value = 'overview'; isPlatformOwner.value = false;
}

async function onOrgCreated() {
  const { data } = await listOrganizations();
  orgs.value = data || [];
  if (orgs.value.length) setActiveOrg(orgs.value[0].organization.id);
}

function openStudent(id) {
  studentId.value = id;
  appTab.value = 'student';
}
</script>

<template>
  <div v-if="!ready" class="center muted">Loading…</div>
  <div v-else-if="!session" class="app">
    <header class="topbar">
      <span class="brand">SDMS</span>
      <nav class="tabs" aria-label="Public navigation">
        <button v-for="t in PUBLIC_TABS" :key="t.id" class="tab" :class="{ active: tab === t.id }"
          @click="tab = t.id">{{ t.label }}</button>
        <button class="tab" :class="{ active: tab === 'login' }" @click="tab = 'login'">Sign in</button>
      </nav>
    </header>
    <main class="content" :key="tab">
      <PublicHomeView v-if="tab === 'landing'" @go-login="tab = 'login'" />
      <AboutView v-else-if="tab === 'about'" />
      <CommunityView v-else-if="tab === 'community'" />
      <HelpView v-else-if="tab === 'help'" />
      <LoginView v-else-if="tab === 'login'" />
    </main>
    <footer class="footer">
      <p>© {{ year }} SDMS — Discipline Management System. All rights reserved.</p>
      <p class="muted">Built with Vue 3 + Express · Every action is recorded in the audit trail</p>
    </footer>
  </div>

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
        <button v-for="t in TABS" :key="t.id" class="tab" :class="{ active: appTab === t.id }"
          @click="appTab = t.id" v-show="(t.id !== 'admin' || isAdmin) && (t.id !== 'platform' || isPlatformOwner)">{{ t.label }}</button>
      </nav>
      <button class="link" @click="doSignOut">Sign out</button>
    </header>

    <main class="content" :key="appTab + (appTab === 'student' ? studentId : '') + orgId">
      <SetupView v-if="orgs.length === 0" @created="onOrgCreated" />
      <template v-else>
        <OverviewView v-if="appTab === 'overview'" :org-id="orgId" :org="membership.organization" :role="membership.role" />
        <PeopleView v-else-if="appTab === 'people'" :org-id="orgId" :track="membership.organization.track" :can-write="canWrite" :is-admin="isAdmin" @open-student="openStudent" />
        <IncidentsView v-else-if="appTab === 'incidents'" :org-id="orgId" :can-write="canWrite" :is-admin="isAdmin" />
        <ViolationsView v-else-if="appTab === 'violations'" :org-id="orgId" :can-write="isAdmin" />
        <StructureView v-else-if="appTab === 'structure'" :org-id="orgId" :track="membership.organization.track" :can-write="canWrite" :is-admin="isAdmin" />
        <HistoryView v-else-if="appTab === 'history'" :org-id="orgId" />
        <ReportsView v-else-if="appTab === 'reports'" :org-id="orgId" :track="membership.organization.track" />
        <SettingsView v-else-if="appTab === 'settings'" :org-id="orgId" :org="membership.organization" :role="membership.role" :is-admin="isAdmin" />
        <StudentScoreCardView v-else-if="appTab === 'student' && studentId" :org-id="orgId" :person-id="studentId"
          :track="membership.organization.track" :can-write="canWrite" @back="appTab = 'people'" />
        <AdminView v-else-if="appTab === 'admin' && isAdmin" :org-id="orgId" :org="membership.organization" :role="membership.role" />
        <PlatformView v-else-if="appTab === 'platform' && isPlatformOwner" />
      </template>
    </main>

    <footer class="footer">
      <p>© {{ year }} SDMS — Discipline Management System. All rights reserved.</p>
      <p class="muted">Built with Vue 3 + Express · Every action is recorded in the audit trail</p>
    </footer>
  </div>
</template>
