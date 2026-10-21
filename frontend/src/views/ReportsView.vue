<script setup>
import { ref, computed, watch } from 'vue';
import { listIncidents, listPersons } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';
import LiquidButton from '../components/LiquidButton.vue';

const props = defineProps({ orgId: String, track: String });

const incidents = ref(null);
const people = ref(null);
const termFilter = ref('');
const error = ref('');

async function load() {
  try {
    const [i, p] = await Promise.all([listIncidents(props.orgId), listPersons(props.orgId)]);
    incidents.value = i.data || [];
    people.value = p.data || [];
  } catch (e) { error.value = e.message; }
}
watch(() => props.orgId, (id) => { if (id) { incidents.value = null; error.value = ''; load(); } }, { immediate: true });

const filtered = computed(() => (incidents.value || []).filter(r => !termFilter.value || r.term === termFilter.value));
const totalIncidents = computed(() => filtered.value.length);
const confirmed = computed(() => filtered.value.filter(r => r.confirmed).length);
const totalDeducted = computed(() => filtered.value.reduce((s, r) => s + Number(r.marks_deducted || 0), 0));
const bySeverity = computed(() => {
  const counts = {};
  for (const r of filtered.value) counts[r.severity] = (counts[r.severity] || 0) + 1;
  return counts;
});
const topViolations = computed(() => {
  const counts = {};
  for (const r of filtered.value) {
    const key = r.violation_name || r.reason || 'Other';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
});
const watchlist = computed(() => (people.value || [])
  .filter(p => props.track === 'HIGH_SCHOOL')
  .map(p => ({ ...p, annual: Number(p.term1_marks ?? 40) + Number(p.term2_marks ?? 40) + Number(p.term3_marks ?? 40) }))
  .sort((a, b) => a.annual - b.annual).slice(0, 10));

function exportCsv() {
  const rows = [['Person', 'Violation', 'Term', 'Date', 'Marks deducted', 'Remaining', 'Status', 'Confirmed']];
  for (const r of filtered.value) {
    rows.push([r.person_name, r.violation_name || r.reason || '', r.term, r.incident_date,
      r.marks_deducted, r.remaining_marks ?? '', r.status, r.confirmed ? 'Yes' : 'No']);
  }
  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `discipline-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <section class="view">
    <div class="row-between">
      <h2 class="page-title">Reports</h2>
      <LiquidButton :disabled="!incidents" @click="exportCsv">Export CSV</LiquidButton>
    </div>
    <p class="muted">{{ TRACK_LABELS[track] }} disciplinary report.</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="filter-row">
      <select class="input" v-model="termFilter" aria-label="Report term">
        <option value="">All terms</option><option value="1">Term 1</option><option value="2">Term 2</option><option value="3">Term 3</option>
      </select>
    </div>

    <template v-if="incidents">
      <div class="stats-row">
        <div class="card stat"><span class="muted">Incidents</span><strong>{{ totalIncidents }}</strong></div>
        <div class="card stat"><span class="muted">Confirmed</span><strong>{{ confirmed }}</strong></div>
        <div class="card stat"><span class="muted">Marks deducted</span><strong>{{ totalDeducted }}</strong></div>
      </div>

      <div class="card">
        <h3>By severity</h3>
        <p v-if="Object.keys(bySeverity).length === 0" class="muted">No incidents in this period.</p>
        <p v-else v-for="(count, sev) in bySeverity" :key="sev"><span class="pill">{{ sev }}</span> {{ count }}</p>
      </div>

      <div class="card">
        <h3>Top violations</h3>
        <p v-if="topViolations.length === 0" class="muted">No violations recorded.</p>
        <p v-else v-for="[name, count] in topViolations" :key="name">{{ name }} — {{ count }}</p>
      </div>

      <div v-if="watchlist.length" class="card">
        <h3>Discipline watchlist (lowest annual scores)</h3>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Student</th><th>Annual score</th></tr></thead>
            <tbody><tr v-for="p in watchlist" :key="p.id"><td>{{ p.full_name }}</td><td>{{ p.annual }} / 120</td></tr></tbody>
          </table>
        </div>
      </div>
    </template>
    <p v-else class="muted">Loading…</p>
  </section>
</template>
