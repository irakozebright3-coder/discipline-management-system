<script setup>
import { ref, onMounted } from 'vue';
import { platformGet, platformPost, platformPatch, platformDelete } from '../lib/api.js';
import LiquidButton from '../components/LiquidButton.vue';

const section = ref('dashboard');
const dash = ref(null);
const users = ref(null);
const plogs = ref(null);
const ologs = ref(null);
const backups = ref(null);
const config = ref(null);
const creator = ref(null);
const error = ref('');
const busy = ref(false);
const newBackupName = ref('');
const newContributor = ref({ name: '', role: '', contribution: '' });
const newArticle = ref({ category: 'Getting started', title: '', content: '' });

async function tryLoad() {
  try {
    dash.value = (await platformGet('dashboard')).data;
    config.value = dash.value.config;
    creator.value = (await platformGet('creator-profile').catch(() => ({ data: null }))).data;
  } catch (e) { error.value = e.message; }
}

async function loadSection() {
  error.value = '';
  try {
    if (section.value === 'users') users.value = (await platformGet('users')).data;
    if (section.value === 'audit') {
      plogs.value = (await platformGet('audit-logs')).data;
      ologs.value = (await platformGet('org-audit-logs')).data;
    }
    if (section.value === 'backups') backups.value = (await platformGet('backups')).data;
  } catch (e) { error.value = e.message; }
}
onMounted(tryLoad);

async function createBackup() {
  busy.value = true; error.value = '';
  try {
    await platformPost('backups', { name: newBackupName.value || `Backup ${new Date().toLocaleString()}`, status: 'Completed', size: 'auto' });
    newBackupName.value = '';
    await loadSection();
  } catch (e) { error.value = e.message; } finally { busy.value = false; }
}

async function removeBackup(id) {
  try { await platformDelete(`backups/${id}`); await loadSection(); } catch (e) { error.value = e.message; }
}

async function toggleMaintenance() {
  try {
    const { data } = await platformPatch('config', { maintenance_mode: !config.value.maintenance_mode });
    config.value = data; dash.value.config = data;
  } catch (e) { error.value = e.message; }
}

async function saveCreator() {
  busy.value = true;
  try {
    const { data } = await platformPatch('creator-profile', creator.value);
    creator.value = data;
  } catch (e) { error.value = e.message; } finally { busy.value = false; }
}

async function addContributor() {
  if (!newContributor.value.name.trim()) return;
  busy.value = true;
  try {
    await platformPost('contributors', { ...newContributor.value, name: newContributor.value.name.trim() });
    newContributor.value = { name: '', role: '', contribution: '' };
    await tryLoad();
  } catch (e) { error.value = e.message; } finally { busy.value = false; }
}

async function addArticle() {
  if (!newArticle.value.title.trim()) return;
  busy.value = true;
  try {
    await platformPost('help-articles', newArticle.value);
    newArticle.value = { category: 'Getting started', title: '', content: '' };
  } catch (e) { error.value = e.message; } finally { busy.value = false; }
}

const SECTIONS = [['dashboard', 'Dashboard'], ['users', 'Users'], ['audit', 'Audit logs'], ['backups', 'Backups'], ['content', 'Content']];
</script>

<template>
  <section class="view">
    <h2 class="page-title">Platform owner console</h2>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="filter-row">
      <button v-for="[id, label] in SECTIONS" :key="id" class="tab" :class="{ active: section === id }"
        @click="section = id; loadSection()">{{ label }}</button>
    </div>

    <template v-if="section === 'dashboard'">
      <div v-if="dash" class="stats-row">
        <div class="card stat"><span class="muted">Organizations</span><strong>{{ dash.counts.organizations }}</strong></div>
        <div class="card stat"><span class="muted">Users</span><strong>{{ dash.counts.users }}</strong></div>
        <div class="card stat"><span class="muted">People</span><strong>{{ dash.counts.people }}</strong></div>
        <div class="card stat"><span class="muted">Incidents</span><strong>{{ dash.counts.incidents }}</strong></div>
        <div class="card stat"><span class="muted">Visits</span><strong>{{ dash.counts.visitors }}</strong></div>
      </div>
      <div v-if="config" class="card">
        <h3>System</h3>
        <p><span class="muted">Version:</span> {{ config.system_version }} · <span class="muted">Health:</span> {{ config.system_health }}</p>
        <p class="row-between"><span class="muted">Maintenance mode</span>
          <LiquidButton @click="toggleMaintenance">{{ config.maintenance_mode ? 'Turn off' : 'Turn on' }}</LiquidButton>
        </p>
      </div>
      <div v-if="dash?.organizations?.length" class="card">
        <h3>Organizations</h3>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Name</th><th>Type</th><th>Status</th></tr></thead>
          <tbody><tr v-for="o in dash.organizations" :key="o.id">
            <td>{{ o.name }}</td><td>{{ o.type }}</td>
            <td><span class="pill">{{ o.suspended ? 'Suspended' : 'Active' }}</span></td>
          </tr></tbody>
        </table></div>
      </div>
      <p v-else class="muted">Loading…</p>
    </template>

    <template v-if="section === 'users'">
      <div v-if="users" class="card"><div class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Joined</th></tr></thead>
        <tbody><tr v-for="u in users" :key="u.id"><td>{{ u.full_name || u.id }}</td><td>{{ new Date(u.created_at).toLocaleDateString() }}</td></tr></tbody>
      </table></div></div>
      <p v-else class="muted">Loading…</p>
    </template>

    <template v-if="section === 'audit'">
      <div v-if="plogs" class="card">
        <h3>Platform audit</h3>
        <p v-if="plogs.length === 0" class="muted">No platform actions recorded.</p>
        <div v-else class="table-wrap"><table class="table">
          <thead><tr><th>When</th><th>Action</th><th>Target</th><th>User</th></tr></thead>
          <tbody><tr v-for="l in plogs" :key="l.id">
            <td>{{ new Date(l.created_at).toLocaleString() }}</td><td>{{ l.action }}</td><td>{{ l.target }}</td><td>{{ l.user_name }}</td>
          </tr></tbody>
        </table></div>
      </div>
      <div v-if="ologs" class="card">
        <h3>Organization audit</h3>
        <p v-if="ologs.length === 0" class="muted">No organization actions recorded.</p>
        <div v-else class="table-wrap"><table class="table">
          <thead><tr><th>When</th><th>Action</th><th>Entity</th></tr></thead>
          <tbody><tr v-for="l in ologs" :key="l.id">
            <td>{{ new Date(l.created_at).toLocaleString() }}</td><td>{{ l.action }}</td><td>{{ l.entity_type }}</td>
          </tr></tbody>
        </table></div>
      </div>
      <p v-if="!plogs" class="muted">Loading…</p>
    </template>

    <template v-if="section === 'backups'">
      <form class="card form-card" @submit.prevent="createBackup">
        <input class="input" v-model="newBackupName" placeholder="Backup name (optional)" />
        <div class="form-actions"><LiquidButton :disabled="busy">{{ busy ? 'Working…' : 'Create backup record' }}</LiquidButton></div>
      </form>
      <div v-if="backups" class="card">
        <p v-if="backups.length === 0" class="muted">No backups recorded.</p>
        <div v-else class="table-wrap"><table class="table">
          <thead><tr><th>Name</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody><tr v-for="b in backups" :key="b.id">
            <td>{{ b.name }}</td><td><span class="pill">{{ b.status }}</span></td>
            <td>{{ new Date(b.created_at).toLocaleString() }}</td>
            <td><button class="link danger" @click="removeBackup(b.id)">Delete</button></td>
          </tr></tbody>
        </table></div>
      </div>
      <p v-else class="muted">Loading…</p>
    </template>

    <template v-if="section === 'content'">
      <div v-if="creator" class="card form-card">
        <h3>Creator profile</h3>
        <input class="input" v-model="creator.full_name" aria-label="Creator name" />
        <input class="input" v-model="creator.title" aria-label="Creator title" />
        <textarea class="input" v-model="creator.biography" rows="3" aria-label="Creator biography"></textarea>
        <div class="form-actions"><LiquidButton :disabled="busy" @click="saveCreator">{{ busy ? 'Saving…' : 'Save profile' }}</LiquidButton></div>
      </div>
      <form class="card form-card" @submit.prevent="addContributor">
        <h3>Add contributor</h3>
        <input class="input" v-model="newContributor.name" placeholder="Name" required />
        <input class="input" v-model="newContributor.role" placeholder="Role (optional)" />
        <input class="input" v-model="newContributor.contribution" placeholder="Contribution (optional)" />
        <div class="form-actions"><LiquidButton :disabled="busy">{{ busy ? 'Adding…' : 'Add contributor' }}</LiquidButton></div>
      </form>
      <form class="card form-card" @submit.prevent="addArticle">
        <h3>Add help article</h3>
        <select class="input" v-model="newArticle.category" aria-label="Article category">
          <option>Getting started</option><option>Discipline marks</option><option>Reports</option><option>Account & security</option>
        </select>
        <input class="input" v-model="newArticle.title" placeholder="Title" required />
        <textarea class="input" v-model="newArticle.content" rows="4" placeholder="Content"></textarea>
        <div class="form-actions"><LiquidButton :disabled="busy">{{ busy ? 'Publishing…' : 'Publish article' }}</LiquidButton></div>
      </form>
    </template>
  </section>
</template>
