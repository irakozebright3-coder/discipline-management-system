<script setup>
import { ref, computed, watch } from 'vue';
import { listStructureNodes, createStructureNode, deleteStructureNode } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';
import LiquidButton from '../components/LiquidButton.vue';

const props = defineProps({ orgId: String, track: String, canWrite: Boolean, isAdmin: Boolean });

const NODE_TYPES = {
  HIGH_SCHOOL: [['class', 'Classes'], ['trade', 'Trades'], ['role', 'Roles']],
  UNIVERSITY: [['faculty', 'Faculties'], ['academic_department', 'Academic departments'], ['program', 'Programs'], ['year_of_study', 'Years of study'], ['cohort', 'Cohorts']],
  COMPANY: [['department', 'Departments'], ['office', 'Offices'], ['role', 'Roles']],
  ORGANIZATION: [['department', 'Departments'], ['office', 'Offices'], ['role', 'Roles']],
  COMMUNITY: [['role', 'Roles'], ['cohort', 'Cohorts']]
};

const nodes = ref(null);
const activeType = ref('');
const adding = ref(false);
const newName = ref('');
const error = ref('');
const busy = ref(false);

const types = computed(() => NODE_TYPES[props.track] || NODE_TYPES.ORGANIZATION);
const visible = computed(() => (nodes.value || []).filter(n => n.node_type === activeType.value));

async function load() {
  try {
    const { data } = await listStructureNodes(props.orgId);
    nodes.value = data;
  } catch (e) { error.value = e.message; }
}

watch(() => [props.orgId, props.track], ([id]) => {
  if (!id) return;
  nodes.value = null; error.value = '';
  activeType.value = types.value.length ? types.value[0][0] : '';
  load();
}, { immediate: true });

watch(types, (t) => { if (t.length && !t.some(([k]) => k === activeType.value)) activeType.value = t[0][0]; });

async function add() {
  if (!newName.value.trim()) return;
  busy.value = true; error.value = '';
  try {
    await createStructureNode({ organization_id: props.orgId, node_type: activeType.value, name: newName.value.trim() });
    newName.value = ''; adding.value = false;
    await load();
  } catch (e) { error.value = e.message; } finally { busy.value = false; }
}

async function remove(node) {
  if (!window.confirm(`Delete "${node.name}"?`)) return;
  error.value = '';
  try { await deleteStructureNode(node.id, props.orgId); await load(); }
  catch (e) { error.value = e.message; }
}
</script>

<template>
  <section class="view">
    <div class="row-between">
      <h2 class="page-title">Structure</h2>
      <LiquidButton v-if="canWrite" @click="adding = !adding">{{ adding ? 'Cancel' : `+ Add ${types.find(t => t[0] === activeType)?.[1]?.toLowerCase() || 'node'}` }}</LiquidButton>
    </div>
    <p class="muted">{{ TRACK_LABELS[track] }} structure — used by people, incidents, and reports.</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="filter-row">
      <button v-for="[key, label] in types" :key="key" class="tab" :class="{ active: activeType === key }" @click="activeType = key">{{ label }}</button>
    </div>

    <form v-if="adding" class="card form-card" @submit.prevent="add">
      <input class="input" v-model="newName" :placeholder="`New ${types.find(t => t[0] === activeType)?.[1]?.slice(0, -1) || 'node'} name`" required />
      <div class="form-actions"><LiquidButton :disabled="busy">{{ busy ? 'Adding…' : 'Add' }}</LiquidButton></div>
    </form>

    <template v-if="nodes">
      <p v-if="visible.length === 0" class="muted">Nothing here yet. Add your first {{ types.find(t => t[0] === activeType)?.[1]?.toLowerCase() }}.</p>
      <div v-else class="table-wrap">
        <table class="table">
          <thead><tr><th>Name</th><th>Type</th><th v-if="isAdmin"></th></tr></thead>
          <tbody>
            <tr v-for="n in visible" :key="n.id">
              <td>{{ n.name }}</td>
              <td><span class="pill">{{ n.node_type }}</span></td>
              <td v-if="isAdmin"><button class="link danger" @click="remove(n)">Delete</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <p v-else class="muted">Loading…</p>
  </section>
</template>
