<script setup>
import { ref, computed, watch } from 'vue';
import { listIncidents } from '../lib/api.js';

const props = defineProps({ orgId: String });
const rows = ref(null);
const statusFilter = ref('');
const termFilter = ref('');
const search = ref('');
const error = ref('');

async function load() {
  try {
    const { data } = await listIncidents(props.orgId);
    rows.value = data;
  } catch (e) { error.value = e.message; }
}
watch(() => props.orgId, (id) => { if (id) { rows.value = null; error.value = ''; load(); } }, { immediate: true });

const STATUSES = ['Reported', 'Under Review', 'Confirmed', 'Resolved', 'Appealed', 'Closed'];
const filtered = computed(() => (rows.value || []).filter(r =>
  (!statusFilter.value || r.status === statusFilter.value) &&
  (!termFilter.value || r.term === termFilter.value) &&
  (r.person_name + ' ' + r.violation_name).toLowerCase().includes(search.value.toLowerCase())));
</script>

<template>
  <section class="view">
    <h2 class="page-title">History</h2>
    <p class="muted">Browse the full incident history of your organization.</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <template v-if="rows">
      <div class="filter-row">
        <input class="input search" v-model="search" placeholder="Search person or violation…" aria-label="Search history" />
        <select class="input" v-model="statusFilter" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option v-for="s in STATUSES" :key="s">{{ s }}</option>
        </select>
        <select class="input" v-model="termFilter" aria-label="Filter by term">
          <option value="">All terms</option><option value="1">Term 1</option><option value="2">Term 2</option><option value="3">Term 3</option>
        </select>
      </div>
      <p v-if="filtered.length === 0" class="muted">No incidents match these filters.</p>
      <div v-else class="table-wrap">
        <table class="table">
          <thead><tr><th>Person</th><th>Violation</th><th>Term</th><th>Date</th><th>Marks deducted</th><th>Remaining</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="r in filtered" :key="r.id">
              <td>{{ r.person_name }}</td>
              <td>{{ r.violation_name || r.reason || '—' }}</td>
              <td>{{ r.term }}</td>
              <td>{{ r.incident_date }}</td>
              <td>{{ r.marks_deducted }}</td>
              <td>{{ r.remaining_marks ?? '—' }}</td>
              <td><span class="pill">{{ r.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <p v-else class="muted">Loading…</p>
  </section>
</template>
