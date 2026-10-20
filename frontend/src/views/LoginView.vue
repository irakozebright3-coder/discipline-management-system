<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { signInWithPassword, signUpWithPassword } from '../lib/auth.js';
import SlidingTitle from '../components/SlidingTitle.vue';
import WordCluster from '../components/WordCluster.vue';
import LiquidButton from '../components/LiquidButton.vue';

const mode = ref('signin');
const email = ref('');
const password = ref('');
const fullName = ref('');
const error = ref('');
const busy = ref(false);

// Auto-rollover copyright year.
const now = ref(Date.now());
let yearTimer = 0;
const year = computed(() => new Date(now.value).getFullYear());
onMounted(() => { yearTimer = setInterval(() => { now.value = Date.now(); }, 600000); });
onBeforeUnmount(() => clearInterval(yearTimer));

async function submit() {
  busy.value = true; error.value = '';
  try {
    if (mode.value === 'signin') await signInWithPassword(email.value, password.value);
    else await signUpWithPassword(email.value, password.value, fullName.value);
  } catch (err) {
    error.value = err.message || 'Authentication failed.';
  } finally { busy.value = false; }
}
</script>

<template>
  <div class="login-page">
    <section class="login-hero">
      <WordCluster />
      <div class="login-hero-inner">
        <SlidingTitle :words="['Discipline.', 'Clarity.', 'Accountability.']" />
        <p class="hero-sub">Track conduct, incidents and marks for your school or organization — with a full audit trail on every action.</p>
        <ul class="hero-points">
          <li>Role-based access for teachers, staff and admins</li>
          <li>Incident workflow with status tracking and evidence</li>
          <li>Violations catalog with default mark deductions</li>
        </ul>
      </div>
    </section>

    <section class="login-panel">
      <form class="card login-card" @submit.prevent="submit">
        <h2>{{ mode === 'signin' ? 'Welcome back' : 'Create your account' }}</h2>
        <p class="muted">Sign in to your organization's workspace</p>
        <input v-if="mode === 'signup'" class="input" v-model="fullName" placeholder="Full name" required autocomplete="name" />
        <input class="input" v-model="email" type="email" placeholder="Email" required autocomplete="email" />
        <input class="input" v-model="password" type="password" placeholder="Password" minlength="6" required
          :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'" />
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <LiquidButton :disabled="busy">{{ busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account' }}</LiquidButton>
        <button type="button" class="link" @click="mode = mode === 'signin' ? 'signup' : 'signin'; error = ''">
          {{ mode === 'signin' ? 'No account yet? Sign up' : 'Already registered? Sign in' }}
        </button>
      </form>
      <footer class="login-footer muted">© {{ year }} SDMS — Discipline Management System</footer>
    </section>
  </div>
</template>
