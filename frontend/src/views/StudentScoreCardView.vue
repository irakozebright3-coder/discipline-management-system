<script setup>
import { ref, computed, watch } from 'vue';
import { getPerson, listIncidents, updatePerson, listStructureNodes } from '../lib/api.js';
import DisciplineCard from '../components/DisciplineCard.vue';
import PersonForm from '../components/PersonForm.vue';
import MoveClassDialog from '../components/MoveClassDialog.vue';
import LiquidButton from '../components/LiquidButton.vue';

const props = defineProps({ orgId: String, personId: String, track: String, canWrite: Boolean });
const emit = defineEmits(['back']);

const person = ref(null);
const incidents = ref(null);
const classes = ref([]);
const trades = ref([]);
const error = ref('');
const editing = ref(false);
const moving = ref(false);

async function load() {
  error.value = '';
  try {
    const [p, i, s] = await Promise.all([
      getPerson(props.personId, props.orgId),
      listIncidents(props.orgId),
      listStructureNodes(props.orgId).catch(() => ({ data: [] }))
    ]);
    person.value = p.data;
    incidents.value = (i.data || []).filter(r => r.person_id === props.personId);
    classes.value = (s.data || []).filter(n => n.node_type === 'class');
    trades.value = (s.data || []).filter(n => n.node_type === 'trade');
  } catch (e) { error.value = e.message; }
}
watch(() => [props.orgId, props.personId], ([id]) => { if (id) { person.value = null; load(); } }, { immediate: true });

const hasGuardian = computed(() => !!(person.value && (person.value.guardian_name || person.value.guardian_phone || person.value.guardian_contact)));

async function saveChanges(payload) {
  try {
    const { data } = await updatePerson(props.personId, payload, props.orgId);
    person.value = data; editing.value = false;
  } catch (e) { error.value = e.message; }
}

function onMoved() { moving.value = false; load(); }
</script>

<template>
  <section class="view">
    <button class="link" @click="emit('back')">← Back to people</button>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <template v-if="person">
      <div class="row-between">
        <div>
          <h2 class="page-title">{{ person.full_name }}</h2>
          <p class="muted">ID {{ person.person_id }} · <span class="pill">{{ person.status }}</span></p>
        </div>
        <div v-if="canWrite" class="cta-row">
          <LiquidButton @click="editing = !editing">{{ editing ? 'Cancel' : 'Edit' }}</LiquidButton>
          <LiquidButton v-if="track === 'HIGH_SCHOOL'" @click="moving = true">Move class</LiquidButton>
        </div>
      </div>

      <PersonForm v-if="editing" :org-id="orgId" :track="track" :person="person"
        :classes="classes" :trades="trades" @save="saveChanges" @cancel="editing = false" />

      <template v-else>
        <div class="card">
          <h3>Profile</h3>
          <p><span class="muted">Gender:</span> {{ person.gender || '—' }}</p>
          <p><span class="muted">Date of birth:</span> {{ person.date_of_birth || '—' }}</p>
          <p v-if="track === 'HIGH_SCHOOL'"><span class="muted">Class:</span> {{ person.class_id || '—' }} · <span class="muted">Trade:</span> {{ person.trade_id || '—' }}</p>
          <p><span class="muted">Joined:</span> {{ person.date_joined || '—' }}</p>
        </div>

        <DisciplineCard v-if="track === 'HIGH_SCHOOL'" :person="person" />

        <div class="card">
          <h3>Parent / Guardian</h3>
          <template v-if="hasGuardian">
            <p><span class="muted">Name:</span> {{ person.guardian_name || '—' }}</p>
            <p><span class="muted">Phone:</span> {{ person.guardian_phone || '—' }}</p>
            <p v-if="person.guardian_contact"><span class="muted">Other contact:</span> {{ person.guardian_contact }}</p>
          </template>
          <p v-else class="muted">Guardian information not added.</p>
        </div>

        <div class="card">
          <h3>Incident history</h3>
          <p v-if="incidents.length === 0" class="muted">No incidents recorded. A clean record.</p>
          <div v-else class="table-wrap">
            <table class="table">
              <thead><tr><th>Violation</th><th>Term</th><th>Date</th><th>Marks</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="r in incidents" :key="r.id">
                  <td>{{ r.violation_name || r.reason || '—' }}</td>
                  <td>{{ r.term }}</td>
                  <td>{{ r.incident_date }}</td>
                  <td>{{ r.marks_deducted }}</td>
                  <td><span class="pill">{{ r.status }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>
    <p v-else class="muted">Loading…</p>

    <MoveClassDialog v-if="moving" :org-id="orgId" :person="person" @moved="onMoved" @cancel="moving = false" />
  </section>
</template>
