<script setup>
import { computed, ref, watch } from 'vue';
import { listIncidents, createIncident, updateIncident, deleteIncident, listPersons, listViolations } from '../lib/api.js';
import LiquidButton from '../components/LiquidButton.vue';

const props = defineProps({ orgId: String, canWrite: Boolean, isAdmin: Boolean });

const STATUSES = ['Reported', 'Under Review', 'Confirmed', 'Resolved', 'Appealed', 'Closed'];
const SEVERITIES = ['Minor', 'Moderate', 'Serious', 'N/A'];
const EMPTY = () => ({ person_id: '', violation_id: '', incident_date: '', severity: 'Minor', description: '', location: '', reason: '' });

const rows = ref(null);
const persons = ref([]);
const violations = ref([]);
const adding = ref(false);
const form = ref(EMPTY());
const error = ref('');
const notice = ref('');
const busy = ref(false);
const filterStatus = ref('');

async function load() {
  try {
    const [i, p, v] = await Promise.all([listIncidents(props.orgId), listPersons(props.orgId), listViolations(props.orgId)]);
    rows.value = i.data; persons.value = p.data; violations.value = v.data;
  } catch (err) { error.value = err.message; }
}
watch(() => props.orgId, (id) => { if (id) { rows.value = null; error.value = ''; notice.value = ''; load(); } }, { immediate: true });

const filtered = computed(() => {
  if (!filterStatus.value) return rows.value || [];
  return (rows.value || []).filter(i => i.status === filterStatus.value);
});

async function addIncident() {
  busy.value = true; error.value = ''; notice.value = '';
  try {
    const payload = { organization_id: props.orgId, track: 'HIGH_SCHOOL', person_id: form.value.person_id, incident_date: form.value.incident_date, severity: form.value.severity };
    if (form.value.violation_id) payload.violation_id = form.value.violation_id;
    for (const k of ['description', 'location', 'reason']) if (form.value[k]) payload[k] = form.value[k];
    await createIncident(payload);
    form.value = EMPTY(); adding.value = false; notice.value = 'Incident recorded.';
    await load();
  } catch (err) { error.value = err.message; } finally { busy.value = false; }
}

async function changeStatus(i, ev) {
  error.value = ''; notice.value = '';
  try {
    await updateIncident(i.id, { status: ev.target.value }, props.orgId);
    notice.value = 'Status updated.';
    await load();
  } catch (err) { error.value = err.message; }
}

async function remove(i) {
  if (!window.confirm('Delete this incident record? This cannot be undone.')) return;
  error.value = ''; notice.value = '';
  try {
    await deleteIncident(i.id, props.orgId);
    notice.value = 'Incident deleted.';
    await load();
  } catch (err) { error.value = err.message; }
}
</script>

<template>
  <section class="view">
    <div class="row-between">
      <h2 class="page-title">Incidents</h2>
      <LiquidButton v-if="canWrite" @click="adding = !adding">{{ adding ? 'Cancel' : '+ Record incident' }}</LiquidButton>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="notice" class="notice">{{ notice }}</p>

    <form v-if="adding" class="card form-card" @submit.prevent="addIncident">
      <select class="input" v-model="form.person_id" required>
        <option value="">Select person…</option>
        <option v-for="p in persons" :key="p.id" :value="p.id">{{ p.full_name }} ({{ p.person_id }})</option>
      </select>
      <select class="input" v-model="form.violation_id">
        <option value="">Violation type (optional)…</option>
        <option v-for="v in violations.filter(v => v.active)" :key="v.id" :value="v.id">{{ v.name }}</option>
      </select>
      <input class="input" type="date" v-model="form.incident_date" required />
      <select class="input" v-model="form.severity">
        <option v-for="s in SEVERITIES" :key="s">{{ s }}</option>
      </select>
      <input class="input" v-model="form.location" placeholder="Location (optional)" />
      <input class="input" v-model="form.reason" placeholder="Reason (optional)" />
      <textarea class="input wide" v-model="form.description" placeholder="Description of what happened…"></textarea>
      <div class="form-actions"><LiquidButton :disabled="busy">{{ busy ? 'Saving…' : 'Save incident' }}</LiquidButton></div>
    </form>

    <template v-if="rows">
      <div class="table-tools">
        <select class="input filter" v-model="filterStatus" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option v-for="s in STATUSES" :key="s">{{ s }}</option>
        </select>
      </div>
      <p v-if="filtered.length === 0" class="muted">No incidents recorded yet.</p>
      <div v-else class="table-wrap">
        <table class="table">
          <thead><tr><th>Date</th><th>Person</th><th>Violation</th><th>Severity</th><th>Marks</th><th>Status</th><th v-if="canWrite"></th></tr></thead>
          <tbody>
            <tr v-for="i in filtered" :key="i.id">
              <td>{{ i.incident_date }}</td>
              <td>{{ i.persons?.full_name || '—' }}</td>
              <td>{{ i.violation_name || '—' }}</td>
              <td>{{ i.severity }}</td>
              <td>{{ Number(i.marks_deducted) || 0 }}</td>
              <td>
                <select v-if="canWrite" class="input status-select" :value="i.status" @change="changeStatus(i, $event)" :aria-label="`Status for incident of ${i.persons?.full_name || 'person'}`">
                  <option v-for="s in STATUSES" :key="s">{{ s }}</option>
                </select>
                <span v-else class="pill" :class="'st-' + i.status.toLowerCase().replace(/\s/g, '-')">{{ i.status }}</span>
              </td>
              <td v-if="canWrite">
                <button v-if="isAdmin" class="link danger" @click="remove(i)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <p v-else class="muted">Loading…</p>
  </section>
</template>
