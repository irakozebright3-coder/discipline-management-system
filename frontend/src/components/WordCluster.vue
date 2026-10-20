<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  words: {
    type: Array,
    default: () => ['Respect', 'Punctuality', 'Integrity', 'Discipline', 'Responsibility', 'Kindness', 'Honesty', 'Focus']
  },
  density: { type: Number, default: 26 },
  clusterStrength: { type: Number, default: 0.012 }
});

const canvas = ref(null);
let ctx = null, raf = 0, nodes = [], W = 0, H = 0, dpr = 1, running = false, resizeObs = null;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function makeNodes() {
  nodes = [];
  const count = Math.max(10, Math.min(props.density, props.words.length * 5));
  for (let i = 0; i < count; i++) {
    const word = props.words[i % props.words.length];
    nodes.push({
      word,
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      size: 11 + Math.random() * 14,
      alpha: 0.16 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function step(t) {
  const cx = W / 2, cy = H / 2;
  ctx.clearRect(0, 0, W, H);
  for (const n of nodes) {
    // gentle attraction toward the cluster center + drift + soft wander
    n.vx += (cx - n.x) * props.clusterStrength * 0.02 + Math.sin(t / 2600 + n.phase) * 0.012;
    n.vy += (cy - n.y) * props.clusterStrength * 0.02 + Math.cos(t / 2300 + n.phase) * 0.012;
    n.vx *= 0.985; n.vy *= 0.985;
    n.x += n.vx; n.y += n.vy;
    // keep inside bounds
    if (n.x < 30 || n.x > W - 30) n.vx *= -0.9;
    if (n.y < 24 || n.y > H - 24) n.vy *= -0.9;
    ctx.font = `600 ${n.size}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = `rgba(13, 148, 136, ${n.alpha})`; /* --color-primary #0D9488 */
    ctx.fillText(n.word, n.x, n.y);
  }
  raf = requestAnimationFrame(step);
}

function paintStatic() {
  ctx.clearRect(0, 0, W, H);
  for (const n of nodes) {
    ctx.font = `600 ${n.size}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = `rgba(13, 148, 136, ${n.alpha * 0.8})`;
    ctx.fillText(n.word, n.x, n.y);
  }
}

function sizeCanvas() {
  const parent = canvas.value?.parentElement;
  if (!parent || !canvas.value) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = parent.clientWidth; H = parent.clientHeight;
  canvas.value.width = W * dpr; canvas.value.height = H * dpr;
  canvas.value.style.width = `${W}px`; canvas.value.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function start() {
  if (running) return;
  running = true;
  if (!reducedMotion()) raf = requestAnimationFrame(step);
  else paintStatic();
}
function stop() {
  running = false;
  cancelAnimationFrame(raf);
}

function onVisibility() {
  if (document.hidden) stop(); else start();
}

onMounted(() => {
  ctx = canvas.value.getContext('2d');
  sizeCanvas();
  makeNodes();
  resizeObs = new ResizeObserver(() => { sizeCanvas(); makeNodes(); if (reducedMotion()) paintStatic(); });
  resizeObs.observe(canvas.value.parentElement);
  document.addEventListener('visibilitychange', onVisibility);
  start();
});
onBeforeUnmount(() => {
  stop();
  resizeObs?.disconnect();
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>
<template>
  <canvas ref="canvas" class="word-cluster" aria-hidden="true"></canvas>
</template>
