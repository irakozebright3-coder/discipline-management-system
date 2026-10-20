<script setup>
import { ref } from 'vue';

const el = ref(null);
const canTilt = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function onMove(e) {
  if (!canTilt() || !el.value) return;
  const r = el.value.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5..0.5
  const py = (e.clientY - r.top) / r.height - 0.5;
  // Clamp the pull (skill guidance: never let the element leave its hit box).
  el.value.style.setProperty('--rx', `${(-py * 8).toFixed(2)}deg`);
  el.value.style.setProperty('--ry', `${(px * 10).toFixed(2)}deg`);
  el.value.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
  el.value.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
}
function onLeave() {
  if (!el.value) return;
  el.value.style.setProperty('--rx', '0deg');
  el.value.style.setProperty('--ry', '0deg');
}
</script>
<template>
  <div ref="el" class="tilt-card" @pointermove="onMove" @pointerleave="onLeave">
    <slot />
  </div>
</template>
