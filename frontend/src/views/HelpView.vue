<script setup>
import { ref, computed, onMounted } from 'vue';
import { getHelpArticles } from '../lib/api.js';

const articles = ref(null);
const category = ref('');
const error = ref('');
onMounted(async () => {
  try { const { data } = await getHelpArticles(); articles.value = data || []; }
  catch (e) { error.value = e.message; }
});
const categories = computed(() => [...new Set((articles.value || []).map(a => a.category))]);
const filtered = computed(() =>
  (articles.value || []).filter(a => !category.value || a.category === category.value));
</script>

<template>
  <section class="view">
    <h2 class="page-title">Help Center</h2>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <template v-if="articles">
      <div class="filter-row">
        <button class="tab" :class="{ active: category === '' }" @click="category = ''">All</button>
        <button v-for="c in categories" :key="c" class="tab" :class="{ active: category === c }" @click="category = c">{{ c }}</button>
      </div>
      <p v-if="filtered.length === 0" class="muted">No help articles yet. Check back soon.</p>
      <div v-for="a in filtered" :key="a.id" class="card">
        <h3>{{ a.title }}</h3>
        <p class="muted">{{ a.category }}</p>
        <p style="white-space: pre-line;">{{ a.content }}</p>
      </div>
    </template>
    <p v-else class="muted">Loading…</p>
  </section>
</template>
