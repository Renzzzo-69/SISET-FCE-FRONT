<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'

import BotonPrincipal from '@/components/BotonPrincipal.vue'
import InputTexto from '@/components/InputTexto.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const credenciales = ref({
  correo_electronico: '',
  password: '',
})
const cargando = ref(false)
const mensajeError = ref('')

async function iniciarSesion() {
  mensajeError.value = ''
  cargando.value = true

  try {
    await auth.iniciarSesion(credenciales.value)

    const redirect = route.query.redirect
    await router.replace(
      typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
        ? redirect
        : { name: 'dashboard' },
    )
  } catch (error) {
    mensajeError.value =
      axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : error instanceof Error
          ? error.message
          : 'No se pudo iniciar sesión.'
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <main class="login-container">
    <section class="login-card" aria-labelledby="login-title">
      <h1 id="login-title">Iniciar sesión</h1>
      <p class="subtitle">Sistema de Seguimiento de Tesis - FCE</p>

      <form @submit.prevent="iniciarSesion">
        <InputTexto
          v-model="credenciales.correo_electronico"
          label="Correo electrónico"
          tipo="email"
          placeholder="usuario@ejemplo.com"
        />

        <InputTexto
          v-model="credenciales.password"
          label="Contraseña"
          tipo="password"
          placeholder="********"
        />

        <p v-if="mensajeError" class="error-text" role="alert">{{ mensajeError }}</p>

        <BotonPrincipal texto="Ingresar" texto-cargando="Ingresando…" :cargando="cargando" />
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-container {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 1rem;
}

.login-card {
  width: min(100%, 400px);
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgb(0 0 0 / 10%);
}

h1 {
  margin: 0 0 0.35rem;
  color: #333;
}

.subtitle {
  margin: 0 0 1.25rem;
  color: #666;
  font-size: 0.9rem;
}

.error-text {
  margin: 0 0 0.75rem;
  color: #b91c1c;
  font-size: 0.85rem;
}
</style>
