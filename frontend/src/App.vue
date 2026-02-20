
<template>
  <div class="app-dark-bg">
    <transition name="fade">
      <div v-if="showSplash" class="splash-overlay">
        <div class="splash-content">
          <span class="splash-logo">📚</span>
          <h1>Shelfwise</h1>
        </div>
      </div>
    </transition>
    <div v-show="!showSplash">
      <nav class="nav-bar">
        <b class="logo">Shelfwise</b>
        <router-link to="/">Dashboard</router-link>
        <router-link to="/login" v-if="!userRole">Login</router-link>
        <router-link to="/register" v-if="!userRole">Register</router-link>
        <span v-if="userRole" class="user-info">{{ userRole }} <span v-if="userEmail">({{ userEmail }})</span></span>
        <button v-if="userRole" class="logout-btn" @click="logout">Logout</button>
      </nav>
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { clearToken } from './utils/auth'

const userRole = ref(localStorage.getItem('userRole'))
const userEmail = ref(localStorage.getItem('userEmail'))
const showSplash = ref(true)

window.addEventListener('storage', () => {
  userRole.value = localStorage.getItem('userRole')
  userEmail.value = localStorage.getItem('userEmail')
})

function logout() {
  clearToken()
  localStorage.removeItem('userRole')
  localStorage.removeItem('userEmail')
  userRole.value = null
  userEmail.value = null
  window.location.href = '/'
}

onMounted(() => {
  setTimeout(() => {
    showSplash.value = false
  }, 1500)
})
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.6s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.splash-overlay {
  position: fixed;
  z-index: 9999;
  inset: 0;
  background: #181a20;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
.splash-content {
  text-align: center;
}
.splash-logo {
  font-size: 3.5rem;
  display: block;
  margin-bottom: 12px;
}
.splash-content h1 {
  color: #7dd3fc;
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: 2px;
}
html, body, #app {
  height: 100%;
  margin: 0;
  background: #181a20;
  color: #f1f1f1;
  font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
}
.app-dark-bg {
  min-height: 100vh;
  background: #181a20;
  color: #f1f1f1;
}
.nav-bar {
  padding: 16px;
  background: #23262f;
  display: flex;
  gap: 24px;
  align-items: center;
  border-bottom: 1px solid #23262f;
}
.nav-bar .logo {
  font-size: 1.3em;
  color: #7dd3fc;
  margin-right: 32px;
}
.nav-bar a {
  color: #f1f1f1;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}
.nav-bar a.router-link-exact-active {
  color: #7dd3fc;
}
.user-info {
  margin-left: auto;
  margin-right: 16px;
  color: #a5f3fc;
  font-size: 1em;
  font-weight: 500;
}
.logout-btn {
  background: #ff6b6b;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 1em;
  cursor: pointer;
  margin-left: 8px;
  transition: background 0.2s;
}
.logout-btn:hover {
  background: #e11d48;
}
.main-content {
  padding: 32px 0 0 0;
  min-height: 80vh;
}
</style>
