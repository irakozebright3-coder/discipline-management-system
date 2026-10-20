<script setup>
defineOptions({ inheritAttrs: true });
</script>
<template>
  <button class="liquid-btn" v-bind="$attrs">
    <span class="liquid-btn__label"><slot /></span>
  </button>
</template>
