<script setup>
import { ref, watch } from 'vue';
import { listPersons, listIncidents, listViolations } from '../lib/api.js';
import SlidingTitle from '../components/SlidingTitle.vue';
import TiltCard from '../components/TiltCard.vue';

const props = defineProps({ orgId: String, org: Object, role: String });

const stats = ref(null);
const error = ref('');

watch(() => props.orgId, async (id) => {
  if (!id) return;
  stats.value = null; error.value = '';
  try {
    const [p, i, v] = await Promise.all([listPersons(id), listIncidents(id), listViolations(id)]);
    stats.value = { people: p.data.length, incidents: i.data.length, violations: v.data.length };
  } catch (err) { error.value = err.message; }
}, { immediate: true });
</script>

<template>
  <section class="view">
    <SlidingTitle :words="['Admin', 'control', 'center']" class="page-title" />

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="!stats" class="muted">Loading…</p>

    <template v-else>
      <div class="admin-grid">
        <TiltCard class="card admin-card">
          <h3>Organization</h3>
          <dl class="kv">
            <dt>Name</dt><dd>{{ org?.name }}</dd>
            <dt>Type</dt><dd>{{ org?.type }}</dd>
            <dt>Track</dt><dd>{{ org?.track }}</dd>
            <dt>Your role</dt><dd><span class="pill">{{ role }}</span></dd>
          </dl>
        </TiltCard>

        <TiltCard class="card admin-card">
          <h3>Records</h3>
          <dl class="kv">
            <dt>People</dt><dd>{{ stats.people }}</dd>
            <dt>Incidents</dt><dd>{{ stats.incidents }}</dd>
            <dt>Violation types</dt><dd>{{ stats.violations }}</dd>
          </dl>
        </TiltCard>

        <TiltCard class="card admin-card">
          <h3>Admin capabilities</h3>
          <ul class="hero-points">
            <li>Manage the violations catalog (Violations tab)</li>
            <li>Delete people and incident records</li>
            <li>Update incident status workflow</li>
          </ul>
        </TiltCard>

        <TiltCard class="card admin-card">
          <h3>Security posture</h3>
          <ul class="hero-points">
            <li>All writes require teacher, staff or admin role</li>
            <li>Deletes and catalog edits are admin-only</li>
            <li>Every change is written to the audit log</li>
          </ul>
        </TiltCard>
      </div>
    </template>
  </section>
</template>
