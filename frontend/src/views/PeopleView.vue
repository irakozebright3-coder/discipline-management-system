<script setup>
import { ref, watch } from 'vue';
import { listPersons, createPerson, updatePerson, deletePerson } from '../lib/api.js';
import LiquidButton from '../components/LiquidButton.vue';

const props = defineProps({ orgId: String, canWrite: Boolean, isAdmin: Boolean });

const STATUSES = ['Active', 'Suspended', 'Inactive', 'Under Review'];
const EMPTY = () => ({ full_name: '', person_id: '', gender: '', status: 'Active', guardian_contact: '', academic_year: '' });

const rows = ref(null);
const search = ref('');
const adding = ref(false);
const form = ref(EMPTY());
const error = ref('');
const notice = ref('');
const busy = ref(false);

async function load() {
  try {
    const { data } = await listPersons(props.orgId);
    rows.value = data;
  } catch (err) { error.value = err.message; }
}
watch(() => props.orgId, (id) => { if (id) { rows.value = null; error.value = ''; notice.value = ''; load(); } }, { immediate: true });

const filtered = () => (rows.value || []).filter(r =>
  (r.full_name + ' ' + r.person_id).toLowerCase().includes(search.value.toLowerCase()));

async function addPerson() {
  busy.value = true; error.value = ''; notice.value = '';
  try {
    const payload = { organization_id: props.orgId, track: 'HIGH_SCHOOL', full_name: form.value.full_name, person_id: form.value.person_id };
    for (const k of ['gender', 'guardian_contact', 'academic_year']) if (form.value[k]) payload[k] = form.value[k];
    if (STATUSES.includes(form.value.status)) payload.status = form.value.status;
    await createPerson(payload);
    form.value = EMPTY(); adding.value = false; notice.value = 'Person added.';
    await load();
  } catch (err) { error.value = err.message; } finally { busy.value = false; }
}

async function changeStatus(p, ev) {
  error.value = ''; notice.value = '';
  try {
    await updatePerson(p.id, { status: ev.target.value }, props.orgId);
    notice.value = 'Status updated.';
    await load();
  } catch (err) { error.value = err.message; }
}

async function remove(p) {
  if (!window.confirm(`Delete ${p.full_name}? This cannot be undone.`)) return;
  error.value = ''; notice.value = '';
  try {
    await deletePerson(p.id, props.orgId);
    notice.value = 'Person deleted.';
    await load();
  } catch (err) { error.value = err.message; }
}
</script>

<template>
  <section class="view">
    <div class="row-between">
      <h2 class="page-title">People</h2>
      <LiquidButton v-if="canWrite" @click="adding = !adding">{{ adding ? 'Cancel' : '+ Add person' }}</LiquidButton>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="notice" class="notice">{{ notice }}</p>

    <form v-if="adding" class="card form-card" @submit.prevent="addPerson">
      <input class="input" v-model="form.full_name" placeholder="Full name" required />
      <input class="input" v-model="form.person_id" placeholder="Person ID (e.g. student number)" required />
      <select class="input" v-model="form.gender">
        <option value="">Gender (optional)</option><option>Male</option><option>Female</option><option>Other</option>
      </select>
      <input class="input" v-model="form.guardian_contact" placeholder="Guardian contact (optional)" />
      <input class="input" v-model="form.academic_year" placeholder="Academic year (optional)" />
      <select class="input" v-model="form.status">
        <option v-for="s in STATUSES" :key="s">{{ s }}</option>
      </select>
      <div class="form-actions"><LiquidButton :disabled="busy">{{ busy ? 'Saving…' : 'Save person' }}</LiquidButton></div>
    </form>

    <template v-if="rows">
      <input class="input search" v-model="search" placeholder="Search by name or ID…" aria-label="Search people" />
      <p v-if="filtered().length === 0" class="muted">No people found.</p>
      <div v-else class="table-wrap">
        <table class="table">
          <thead><tr><th>Name</th><th>Person ID</th><th>Status</th><th>Guardian</th><th>Academic year</th><th v-if="canWrite"></th></tr></thead>
          <tbody>
            <tr v-for="p in filtered()" :key="p.id">
              <td>{{ p.full_name }}</td>
              <td>{{ p.person_id }}</td>
              <td>
                <select v-if="canWrite" class="input status-select" :value="p.status" @change="changeStatus(p, $event)" :aria-label="`Status for ${p.full_name}`">
                  <option v-for="s in STATUSES" :key="s">{{ s }}</option>
                </select>
                <span v-else class="pill">{{ p.status }}</span>
              </td>
              <td>{{ p.guardian_contact || '—' }}</td>
              <td>{{ p.academic_year || '—' }}</td>
              <td v-if="canWrite">
                <button v-if="isAdmin" class="link danger" @click="remove(p)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <p v-else class="muted">Loading…</p>
  </section>
</template>
