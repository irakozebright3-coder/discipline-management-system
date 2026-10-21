<script setup>
import { ref, onMounted } from 'vue';
import { getCommunityStats, getCreatorProfile } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';
import WordCluster from '../components/WordCluster.vue';
import SlidingTitle from '../components/SlidingTitle.vue';
import LiquidButton from '../components/LiquidButton.vue';

const stats = ref(null);
const creator = ref(null);
const error = ref('');
defineEmits(['go-login']);

onMounted(async () => {
  try {
    const [s, c] = await Promise.all([getCommunityStats(), getCreatorProfile().catch(() => ({ data: null }))]);
    stats.value = s.data; creator.value = c.data;
  } catch (e) { error.value = e.message; }
});
</script>

<template>
  <section class="view landing">
    <div class="hero">
      <SlidingTitle title="Discipline Management System" />
      <WordCluster />
      <p class="muted lead">A complete platform for tracking conduct, violations, and discipline marks — built for high schools, universities, companies, organizations, and communities.</p>
      <div class="cta-row">
        <LiquidButton @click="$emit('go-login')">Sign in</LiquidButton>
        <span class="muted">or create an account to set up your organization.</span>
      </div>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="tracks">
      <div v-for="(label, key) in TRACK_LABELS" :key="key" class="card track-card">
        <h3>{{ label }}</h3>
        <p class="muted">Track-adapted people, structure, violations, and reports.</p>
      </div>
    </div>

    <div v-if="stats" class="stats-row">
      <div class="card stat"><span class="muted">Organizations</span><strong>{{ stats.organizations }}</strong></div>
      <div class="card stat"><span class="muted">People managed</span><strong>{{ stats.people }}</strong></div>
      <div class="card stat"><span class="muted">Incidents recorded</span><strong>{{ stats.incidents }}</strong></div>
      <div class="card stat"><span class="muted">Visits</span><strong>{{ stats.visitors }}</strong></div>
    </div>

    <div v-if="creator" class="card creator-card">
      <h3>{{ creator.full_name }}</h3>
      <p class="muted">{{ creator.title }}</p>
      <p>{{ creator.biography }}</p>
    </div>
  </section>
</template>
