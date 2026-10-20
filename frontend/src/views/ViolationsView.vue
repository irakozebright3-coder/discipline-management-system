<script setup>
import { ref, watch } from 'vue';
import { listViolations, createViolation, updateViolation, deleteViolation } from '../lib/api.js';
import LiquidButton from '../components/LiquidButton.vue';

const props = defineProps({ orgId: String, canWrite: Boolean });

const SEVERITIES = ['Minor', 'Moderate', 'Serious', 'N/A'];
const EMPTY = () => ({ name: '', description: '', severity: 'Minor', default_marks_deducted: '' });

const rows = ref(null);
const adding = ref(false);
const form = ref(EMPTY());
const error = ref('');
const notice = ref('');
const busy = ref(false);

async function load() {
  try {
    const { data } = await listViolations(props.orgId);
    rows.value = data;
  } catch (err) { error.value = err.message; }
}
watch(() => props.orgId, (id) => { if (id) { rows.value = null; error.value = ''; notice.value = ''; load(); } }, { immediate: true });

async function addViolation() {
  busy.value = true; error.value = ''; notice.value = '';
  try {
    const payload = { organization_id: props.orgId, name: form.value.name, severity: form.value.severity };
    if (form.value.description) payload.description = form.value.description;
    if (form.value.default_marks_deducted !== '') payload.default_marks_deducted = Number(form.value.default_marks_deducted);
    await createViolation(payload);
    form.value = EMPTY(); adding.value = false; notice.value = 'Violation added.';
    await load();
  } catch (err) { error.value = err.message; } finally { busy.value = false; }
}

async function toggleActive(v) {
  error.value = ''; notice.value = '';
  try {
    await updateViolation(v.id, { active: !v.active }, props.orgId);
    notice.value = `${v.name} is now ${!v.active ? 'active' : 'inactive'}.`;
    await load();
  } catch (err) { error.value = err.message; }
}

async function remove(v) {
  if (!window.confirm(`Delete violation "${v.name}"?`)) return;
  error.value = ''; notice.value = '';
  try {
    await deleteViolation(v.id, props.orgId);
    notice.value = 'Violation deleted.';
    await load();
  } catch (err) { error.value = err.message; }
}
</script>

<template>
  <section class="view">
    <div class="row-between">
      <h2 class="page-title">Violations catalog</h2>
      <LiquidButton v-if="canWrite" @click="adding = !adding">{{ adding ? 'Cancel' : '+ Add violation' }}</LiquidButton>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="notice" class="notice">{{ notice }}</p>

    <form v-if="adding" class="card form-card" @submit.prevent="addViolation">
      <input class="input" v-model="form.name" placeholder="Violation name (e.g. Late arrival)" required />
      <select class="input" v-model="form.severity">
        <option v-for="s in SEVERITIES" :key="s">{{ s }}</option>
      </select>
      <input class="input" type="number" min="0" step="0.5" v-model="form.default_marks_deducted" placeholder="Default marks deducted (optional)" />
      <input class="input" v-model="form.description" placeholder="Description (optional)" />
      <div class="form-actions"><LiquidButton :disabled="busy">{{ busy ? 'Saving…' : 'Save violation' }}</LiquidButton></div>
    </form>

    <template v-if="rows">
      <p v-if="rows.length === 0" class="muted">No violations defined yet.{{ canWrite ? ' Add the violations your organization tracks.' : '' }}</p>
      <div v-else class="table-wrap">
        <table class="table">
          <thead><tr><th>Name</th><th>Severity</th><th>Default marks</th><th>Status</th><th v-if="canWrite"></th></tr></thead>
          <tbody>
            <tr v-for="v in rows" :key="v.id">
              <td>{{ v.name }}</td>
              <td>{{ v.severity }}</td>
              <td>{{ Number(v.default_marks_deducted) || 0 }}</td>
              <td><span class="pill" :class="v.active ? 'st-active' : 'st-inactive'">{{ v.active ? 'Active' : 'Inactive' }}</span></td>
              <td v-if="canWrite">
                <button class="link" @click="toggleActive(v)">{{ v.active ? 'Deactivate' : 'Activate' }}</button>
                <button class="link danger" @click="remove(v)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <p v-else class="muted">Loading…</p>
  </section>
</template>
