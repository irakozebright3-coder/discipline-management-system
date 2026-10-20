<script setup>
import { ref, watch } from 'vue';
import { listPersons, listIncidents } from '../lib/api.js';
import SlidingTitle from '../components/SlidingTitle.vue';
import TiltCard from '../components/TiltCard.vue';

const props = defineProps({ orgId: String, org: Object, role: String });
const emit = defineEmits(['navigate']);

const persons = ref(null);
const incidents = ref(null);
const error = ref('');

watch(() => props.orgId, async (id) => {
  if (!id) return;
  persons.value = null; incidents.value = null; error.value = '';
  try {
    const [p, i] = await Promise.all([listPersons(id), listIncidents(id)]);
    persons.value = p.data; incidents.value = i.data;
  } catch (err) { error.value = err.message; }
}, { immediate: true });

const open = () => (incidents.value || []).filter(i => !['Resolved', 'Closed'].includes(i.status)).length;
const serious = () => (incidents.value || []).filter(i => i.severity === 'Serious').length;
</script>

<template>
  <section class="view">
    <div class="page-head">
      <div>
        <SlidingTitle :words="[org ? org.name : 'Overview']" class="page-title" />
        <p class="muted">Your role: <strong>{{ role }}</strong> · {{ org?.type }}</p>
      </div>
      <TiltCard class="mini-stat">
        <span class="stat-num">{{ incidents?.length ?? '—' }}</span>
        <span class="muted">incidents on record</span>
      </TiltCard>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!persons" class="muted">Loading…</p>

    <template v-else>
      <div class="stat-grid">
        <TiltCard v-for="s in [
          { n: persons.length, label: 'People' },
          { n: incidents.length, label: 'Recorded incidents' },
          { n: open(), label: 'Open incidents' },
          { n: serious(), label: 'Serious incidents' }
        ]" :key="s.label" class="stat">
          <span class="stat-num">{{ s.n }}</span>
          <span class="muted">{{ s.label }}</span>
        </TiltCard>
      </div>

      <h3 class="section-title">Recent incidents</h3>
      <p v-if="incidents.length === 0" class="muted">No incidents recorded yet. Record one from the Incidents tab.</p>
      <div v-else class="table-wrap">
        <table class="table">
          <thead><tr><th>Date</th><th>Person</th><th>Violation</th><th>Severity</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="i in incidents.slice(0, 8)" :key="i.id">
              <td>{{ i.incident_date }}</td>
              <td>{{ i.persons?.full_name || '—' }}</td>
              <td>{{ i.violation_name || '—' }}</td>
              <td>{{ i.severity }}</td>
              <td><span class="pill" :class="'st-' + i.status.toLowerCase().replace(/\s/g, '-')">{{ i.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <button class="link" @click="emit('navigate', 'incidents')">Go to incidents →</button>
    </template>
  </section>
</template>
