<template>
  <div class="auth-card">
    <div class="auth-icon">
      <span class="splash-logo">📚</span>
    </div>
    <h2>Login</h2>
    <form @submit.prevent="onSubmit">
      <div>
        <label>Email</label>
        <input v-model="username" type="email" required />
      </div>
      <div>
        <label>Password</label>
        <input v-model="password" type="password" required />
      </div>
      <button type="submit">Login</button>
    </form>
    <p v-if="error" class="error-msg">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '../utils/api'
import { useRouter } from 'vue-router'
import { saveToken, parseJwt } from '../utils/auth'

const username = ref('')
const password = ref('')
const error = ref('')
const router = useRouter()

async function onSubmit() {
  error.value = ''
  try {
    const form = new URLSearchParams()
    form.append('username', username.value)
    form.append('password', password.value)
    const res = await api.post('/api/auth/login', form)
    const token = res.data.access_token
    saveToken(token)
    // Optionally decode and store user info (role, email)
    const payload = parseJwt(token)
    if (payload && payload.role) {
      localStorage.setItem('userRole', payload.role)
      localStorage.setItem('userEmail', payload.sub)
    }
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.detail || 'Login failed'
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
</style>
