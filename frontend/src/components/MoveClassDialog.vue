<script setup>
import { ref, onMounted } from 'vue';
import { listStructureNodes, updatePerson } from '../lib/api.js';
import LiquidButton from './LiquidButton.vue';

const props = defineProps({ orgId: String, person: Object });
const emit = defineEmits(['moved', 'cancel']);
const classes = ref([]);
const target = ref(props.person?.class_id || '');
const error = ref('');
const busy = ref(false);

onMounted(async () => {
  try {
    const { data } = await listStructureNodes(props.orgId);
    classes.value = (data || []).filter(n => n.node_type === 'class');
  } catch (e) { error.value = e.message; }
});

async function move() {
  error.value = ''; busy.value = true;
  try {
    await updatePerson(props.person.id, { class_id: target.value || null }, props.orgId);
    emit('moved', target.value);
  } catch (e) { error.value = e.message; } finally { busy.value = false; }
}
</script>

<template>
  <div class="overlay" role="dialog" aria-label="Move student to another class">
    <div class="card dialog">
      <h3>Move {{ person.full_name }}</h3>
      <p class="muted">Current class: {{ person.class_id || 'None' }}</p>
      <select class="input" v-model="target" aria-label="New class">
        <option value="">No class</option>
        <option v-for="c in classes" :key="c.id" :value="c.name">{{ c.name }}</option>
      </select>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="form-actions">
        <LiquidButton :disabled="busy" @click="move">{{ busy ? 'Moving…' : 'Move student' }}</LiquidButton>
        <button class="link" @click="emit('cancel')">Cancel</button>
      </div>
    </div>
  </div>
</template>
