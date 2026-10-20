<script setup>
const props = defineProps({
  words: { type: Array, required: true },
  speed: { type: Number, default: 1 }
});
</script>
<template>
  <h1 class="sliding-title" :aria-label="words.join(' ')" :style="{ '--n': words.length, '--spd': speed }">
    <span v-for="(w, i) in words" :key="i" class="sliding-word" :style="{ '--i': i }">{{ w }}</span>
  </h1>
</template>
