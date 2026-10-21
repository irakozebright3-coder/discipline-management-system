<script setup>
import { reactive, ref, computed } from 'vue';
import LiquidButton from './LiquidButton.vue';

const props = defineProps({
  orgId: { type: String, required: true },
  track: { type: String, default: 'HIGH_SCHOOL' },
  person: { type: Object, default: null },
  classes: { type: Array, default: () => [] },
  trades: { type: Array, default: () => [] }
});
const emit = defineEmits(['save', 'cancel']);

const PHONE_RE = /^\+?[1-9]\d{6,14}$/;
const isHS = computed(() => props.track === 'HIGH_SCHOOL');

const form = reactive({
  full_name: props.person?.full_name || '',
  person_id: props.person?.person_id || '',
  gender: props.person?.gender || '',
  status: props.person?.status || 'Active',
  date_of_birth: props.person?.date_of_birth || '',
  academic_year: props.person?.academic_year || '',
  class_id: props.person?.class_id || '',
  trade_id: props.person?.trade_id || '',
  guardian_contact: props.person?.guardian_contact || '',
  guardian_name: props.person?.guardian_name || '',
  guardian_phone: props.person?.guardian_phone || '',
  term1_marks: props.person?.term1_marks ?? 40,
  term2_marks: props.person?.term2_marks ?? 40,
  term3_marks: props.person?.term3_marks ?? 40
});
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  const gname = String(form.guardian_name || '').trim();
  const gphone = String(form.guardian_phone || '').trim();
  if (isHS.value && gphone && !PHONE_RE.test(gphone)) {
    error.value = 'Guardian phone must be a valid international number (e.g. +2507…).';
    return;
  }
  const payload = { full_name: form.full_name, person_id: form.person_id };
  if (form.gender) payload.gender = form.gender;
  payload.status = form.status;
  for (const k of ['date_of_birth', 'academic_year', 'guardian_contact']) if (form[k]) payload[k] = form[k];
  // Guardian fields are trimmed before saving (spec).
  payload.guardian_name = gname;
  payload.guardian_phone = gphone;
  if (isHS.value) {
    for (const k of ['class_id', 'trade_id']) if (form[k]) payload[k] = form[k];
    payload.term1_marks = Number(form.term1_marks);
    payload.term2_marks = Number(form.term2_marks);
    payload.term3_marks = Number(form.term3_marks);
  }
  busy.value = true;
  try { emit('save', payload); } finally { busy.value = false; }
}
</script>

<template>
  <form class="card form-card" @submit.prevent="submit">
    <input class="input" v-model="form.full_name" placeholder="Full name" required />
    <input class="input" v-model="form.person_id" placeholder="Person ID (e.g. student number)" required :disabled="!!person" />
    <select class="input" v-model="form.gender">
      <option value="">Gender (optional)</option><option>Male</option><option>Female</option><option>Other</option>
    </select>
    <input class="input" type="date" v-model="form.date_of_birth" aria-label="Date of birth" />
    <select class="input" v-model="form.status">
      <option>Active</option><option>Suspended</option><option>Inactive</option><option>Under Review</option>
    </select>

    <template v-if="isHS">
      <input class="input" v-model="form.academic_year" placeholder="Academic year (e.g. 2026)" />
      <select class="input" v-model="form.class_id" aria-label="Class">
        <option value="">Class (optional)</option>
        <option v-for="c in classes" :key="c.id" :value="c.name">{{ c.name }}</option>
      </select>
      <select class="input" v-model="form.trade_id" aria-label="Trade">
        <option value="">Trade (optional)</option>
        <option v-for="t in trades" :key="t.id" :value="t.name">{{ t.name }}</option>
      </select>
      <div class="form-grid">
        <label>Term 1 marks <input class="input" type="number" min="0" max="40" v-model.number="form.term1_marks" /></label>
        <label>Term 2 marks <input class="input" type="number" min="0" max="40" v-model.number="form.term2_marks" /></label>
        <label>Term 3 marks <input class="input" type="number" min="0" max="40" v-model.number="form.term3_marks" /></label>
      </div>
      <h4>Parent / Guardian information (optional)</h4>
      <input class="input" v-model="form.guardian_name" placeholder="Guardian name" />
      <input class="input" v-model="form.guardian_phone" placeholder="International phone (e.g. +2507…)" />
      <input class="input" v-model="form.guardian_contact" placeholder="Other contact (legacy field, optional)" />
    </template>
    <input v-else class="input" v-model="form.guardian_contact" placeholder="Emergency contact (optional)" />

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="form-actions">
      <LiquidButton type="submit" :disabled="busy">{{ busy ? 'Saving…' : (person ? 'Save changes' : 'Add person') }}</LiquidButton>
      <button type="button" class="link" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
