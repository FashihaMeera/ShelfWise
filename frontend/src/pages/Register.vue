<template>
  <div class="auth-card">
    <div class="auth-icon">
      <span class="splash-logo">📚</span>
    </div>
    <h2>Register (Student)</h2>
    <form @submit.prevent="onSubmit">
      <div>
        <label>Name</label>
        <input v-model="name" type="text" required />
      </div>
      <div>
        <label>Email</label>
        <input v-model="email" type="email" required />
      </div>
      <div>
        <label>Password</label>
        <input v-model="password" type="password" required />
      </div>
      <button type="submit">Register</button>
    </form>
    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="success" class="success-msg">Registration successful! <router-link to="/login">Login</router-link></p>
  </div>
</template>

<script setup>

import { ref } from 'vue'
import api from '../utils/api'
import { useRouter } from 'vue-router'

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const success = ref(false)
const router = useRouter()

async function onSubmit() {
  error.value = ''
  success.value = false
  try {
    await api.post('/api/auth/register', {
      name: name.value,
      email: email.value,
      password: password.value,
      role: 'student'
    })
    success.value = true
    name.value = email.value = password.value = ''
  } catch (e) {
    error.value = e.response?.data?.detail || 'Registration failed'
  }
}
</script>

<style scoped>
.auth-card {
  max-width: 420px;
  margin: 48px auto;
  padding: 24px 28px 20px 28px;
  background: #23262f;
  border-radius: 12px;
  box-shadow: 0 2px 16px #0002;
  color: #f1f1f1;
}
h2 {
  margin-bottom: 18px;
  color: #7dd3fc;
  font-weight: 700;
}
.auth-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}
.splash-logo {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0;
}
h2 {
  margin-bottom: 18px;
  color: #7dd3fc;
  font-weight: 700;
}
label {
  font-size: 1em;
  color: #bdbdbd;
}
input {
  display: block;
  width: 100%;
  padding: 10px;
  margin: 8px 0 18px 0;
  background: #181a20;
  border: 1px solid #333;
  border-radius: 6px;
  color: #f1f1f1;
  font-size: 1em;
}
button {
  padding: 10px 18px;
  background: #7dd3fc;
  color: #181a20;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.2s;
}
button:hover {
  background: #38bdf8;
}
.error-msg {
  color: #ff6b6b;
  margin-top: 10px;
}
.success-msg {
  color: #4ade80;
  margin-top: 10px;
}
</style>