<script setup>
import { ref, watch } from 'vue';
import { listAuditLogs } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';

const props = defineProps({ orgId: String, org: Object, role: String, isAdmin: Boolean });
const logs = ref(null);
const error = ref('');

async function load() {
  try {
    const { data } = await listAuditLogs(props.orgId);
    logs.value = data;
  } catch (e) { error.value = e.message; }
}
watch(() => props.orgId, (id) => { if (id) { logs.value = null; load(); } }, { immediate: true });
</script>

<template>
  <section class="view">
    <h2 class="page-title">Settings</h2>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="card">
      <h3>Organization</h3>
      <p><span class="muted">Name:</span> {{ org?.name }}</p>
      <p><span class="muted">Type:</span> {{ org?.type }} ({{ TRACK_LABELS[org?.track] || org?.track }})</p>
      <p><span class="muted">Your role:</span> {{ role }}</p>
      <p><span class="muted">Status:</span> <span class="pill">{{ org?.suspended ? 'Suspended' : 'Active' }}</span></p>
    </div>

    <div class="card">
      <h3>Audit activity</h3>
      <template v-if="logs">
        <p v-if="logs.length === 0" class="muted">No activity recorded yet.</p>
        <div v-else class="table-wrap">
          <table class="table">
            <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
            <tbody>
              <tr v-for="l in logs" :key="l.id">
                <td>{{ new Date(l.created_at).toLocaleString() }}</td>
                <td><span class="pill">{{ l.action }}</span></td>
                <td>{{ l.entity_type }}</td>
                <td class="muted">{{ JSON.stringify(l.details || {}).slice(0, 80) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <p v-else class="muted">Loading…</p>
    </div>
  </section>
</template>
