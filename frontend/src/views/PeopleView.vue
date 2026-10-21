<script setup>
import { ref, computed, watch } from 'vue';
import { listPersons, createPerson, updatePerson, deletePerson, listStructureNodes } from '../lib/api.js';
import PersonForm from '../components/PersonForm.vue';
import LiquidButton from '../components/LiquidButton.vue';

const props = defineProps({ orgId: String, track: String, canWrite: Boolean, isAdmin: Boolean });
const emit = defineEmits(['open-student']);

const STATUSES = ['Active', 'Suspended', 'Inactive', 'Under Review'];
const rows = ref(null);
const classes = ref([]);
const trades = ref([]);
const search = ref('');
const statusFilter = ref('');
const adding = ref(false);
const error = ref('');
const notice = ref('');

async function load() {
  try {
    const [p, s] = await Promise.all([
      listPersons(props.orgId),
      listStructureNodes(props.orgId).catch(() => ({ data: [] }))
    ]);
    rows.value = p.data;
    classes.value = (s.data || []).filter(n => n.node_type === 'class');
    trades.value = (s.data || []).filter(n => n.node_type === 'trade');
  } catch (err) { error.value = err.message; }
}

watch(() => props.orgId, (id) => {
  if (id) { rows.value = null; error.value = ''; notice.value = ''; load(); }
}, { immediate: true });

const filtered = computed(() => (rows.value || []).filter(r =>
  (!statusFilter.value || r.status === statusFilter.value) &&
  (r.full_name + ' ' + r.person_id + ' ' + (r.class_id || '')).toLowerCase().includes(search.value.toLowerCase())));

const isHS = computed(() => props.track === 'HIGH_SCHOOL');

async function addPerson(payload) {
  error.value = ''; notice.value = '';
  try {
    await createPerson({ ...payload, organization_id: props.orgId, track: props.track });
    adding.value = false; notice.value = 'Person added.';
    await load();
  } catch (err) { error.value = err.message; }
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
      <h2 class="page-title">{{ isHS ? 'Students' : 'People' }}</h2>
      <LiquidButton v-if="canWrite" @click="adding = !adding">{{ adding ? 'Cancel' : '+ Add person' }}</LiquidButton>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="notice" class="notice">{{ notice }}</p>

    <PersonForm v-if="adding" :org-id="orgId" :track="track" :classes="classes" :trades="trades"
      @save="addPerson" @cancel="adding = false" />

    <template v-if="rows">
      <div class="filter-row">
        <input class="input search" v-model="search" placeholder="Search by name, ID, or class…" aria-label="Search people" />
        <select class="input" v-model="statusFilter" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option v-for="s in STATUSES" :key="s">{{ s }}</option>
        </select>
      </div>
      <p v-if="filtered.length === 0" class="muted">No people found.</p>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th><th>Person ID</th>
              <th v-if="isHS">Class</th>
              <th v-if="isHS">Annual marks</th>
              <th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered()" :key="p.id">
              <td><button class="link strong" @click="emit('open-student', p.id)">{{ p.full_name }}</button></td>
              <td>{{ p.person_id }}</td>
              <td v-if="isHS">{{ p.class_id || '—' }}</td>
              <td v-if="isHS">{{ Number(p.term1_marks ?? 40) + Number(p.term2_marks ?? 40) + Number(p.term3_marks ?? 40) }} / 120</td>
              <td>
                <select v-if="canWrite" class="input status-select" :value="p.status" @change="changeStatus(p, $event)" :aria-label="`Status for ${p.full_name}`">
                  <option v-for="s in STATUSES" :key="s">{{ s }}</option>
                </select>
                <span v-else class="pill">{{ p.status }}</span>
              </td>
              <td><button v-if="isAdmin" class="link danger" @click="remove(p)">Delete</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <p v-else class="muted">Loading…</p>
  </section>
</template>
