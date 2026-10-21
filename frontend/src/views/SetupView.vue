<script setup>
import { ref } from 'vue';
import { setupOrganization } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';
import LiquidButton from '../components/LiquidButton.vue';

const emit = defineEmits(['created']);
const name = ref('');
const track = ref('HIGH_SCHOOL');
const error = ref('');
const busy = ref(false);

async function create() {
  error.value = '';
  if (!name.value.trim()) { error.value = 'Please enter your organization name.'; return; }
  busy.value = true;
  try {
    await setupOrganization(name.value.trim(), track.value);
    emit('created');
  } catch (e) { error.value = e.message; } finally { busy.value = false; }
}
</script>

<template>
  <section class="center">
    <div class="card setup-card">
      <h2>Set up your organization</h2>
      <p class="muted">You are not in any organization yet. Create one to start tracking discipline —
      default violations for your track are added automatically.</p>
      <form @submit.prevent="create" class="setup-form">
        <input class="input" v-model="name" placeholder="Organization name (e.g. Karenge Adventist Secondary School)" required />
        <select class="input" v-model="track" aria-label="Discipline track">
          <option v-for="(label, key) in TRACK_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <LiquidButton type="submit" :disabled="busy">{{ busy ? 'Creating…' : 'Create organization' }}</LiquidButton>
      </form>
    </div>
  </section>
</template>
