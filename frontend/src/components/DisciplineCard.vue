<script setup>
import { computed } from 'vue';
import { HS_MAX, HS_ANNUAL_MAX, termMark, annualScore, annualPercentage, ratingFor } from '../lib/discipline.js';

const props = defineProps({ person: { type: Object, required: true } });
const terms = computed(() => [1, 2, 3].map(t => ({ t, mark: termMark(props.person, t) })));
const annual = computed(() => annualScore(props.person));
const pct = computed(() => annualPercentage(props.person));
const rating = computed(() => ratingFor(pct.value));
</script>

<template>
  <div class="card discipline-card">
    <div class="row-between">
      <h3>Discipline card</h3>
      <span class="pill" :class="rating.tone">{{ rating.label }}</span>
    </div>
    <div class="term-row">
      <div v-for="tm in terms" :key="tm.t" class="term">
        <span class="muted">Term {{ tm.t }}</span>
        <strong>{{ tm.mark }} <span class="muted">/ {{ HS_MAX }}</span></strong>
        <div class="bar"><div class="bar-fill" :style="{ width: Math.min(100, (tm.mark / HS_MAX) * 100) + '%' }"></div></div>
      </div>
    </div>
    <div class="annual">
      <div><span class="muted">Annual score</span><strong>{{ annual }} <span class="muted">/ {{ HS_ANNUAL_MAX }}</span></strong></div>
      <div><span class="muted">Annual percentage</span><strong>{{ pct.toFixed(1) }}%</strong></div>
    </div>
  </div>
</template>
