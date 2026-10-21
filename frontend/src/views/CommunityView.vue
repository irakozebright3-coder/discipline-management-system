<script setup>
import { ref, onMounted } from 'vue';
import { getContributors, getCreatorProfile, getCommunityStats } from '../lib/api.js';

const contributors = ref(null);
const creator = ref(null);
const stats = ref(null);
const error = ref('');

onMounted(async () => {
  try {
    const [c, k, s] = await Promise.all([getContributors(), getCreatorProfile(), getCommunityStats()]);
    contributors.value = c.data; creator.value = k.data; stats.value = s.data;
  } catch (e) { error.value = e.message; }
});
</script>

<template>
  <section class="view">
    <h2 class="page-title">Community</h2>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div v-if="creator" class="card">
      <h3>{{ creator.full_name }}</h3>
      <p class="muted">{{ creator.title }}</p>
      <p>{{ creator.biography }}</p>
    </div>

    <template v-if="contributors">
      <h3>Contributors</h3>
      <p v-if="contributors.length === 0" class="muted">No contributors listed yet.</p>
      <div v-else class="tracks">
        <div v-for="c in contributors" :key="c.id" class="card">
          <h4>{{ c.name }}</h4>
          <p class="muted">{{ c.role }}</p>
          <p>{{ c.contribution || c.biography }}</p>
        </div>
      </div>
    </template>

    <div v-if="stats" class="stats-row">
      <div class="card stat"><span class="muted">Community organizations</span><strong>{{ stats.organizations }}</strong></div>
      <div class="card stat"><span class="muted">Contributors</span><strong>{{ stats.contributors }}</strong></div>
      <div class="card stat"><span class="muted">Visits</span><strong>{{ stats.visitors }}</strong></div>
    </div>
  </section>
</template>
