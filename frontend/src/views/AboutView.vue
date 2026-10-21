<script setup>
import { ref, onMounted } from 'vue';
import { getCreatorProfile } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';

const creator = ref(null);
onMounted(async () => {
  try { const { data } = await getCreatorProfile(); creator.value = data; } catch { creator.value = null; }
});
</script>

<template>
  <section class="view">
    <h2 class="page-title">About</h2>
    <div class="card">
      <h3>Our mission</h3>
      <p>Every institution deserves transparent, fair discipline management. SDMS records conduct
      incidents, deducts marks consistently, and keeps a full audit trail — so decisions about
      students, employees, and members are based on facts, not memory.</p>
    </div>
    <div class="card" v-if="creator">
      <h3>{{ creator.full_name }}</h3>
      <p class="muted">{{ creator.title }}</p>
      <p>{{ creator.biography }}</p>
    </div>
    <div class="card">
      <h3>Supported tracks</h3>
      <ul class="track-list">
        <li v-for="(label, key) in TRACK_LABELS" :key="key">{{ label }}</li>
      </ul>
    </div>
  </section>
</template>
