<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'

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
const mostrarPassword = ref(false)

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
  <div class="page-shell">
    <div class="background-layer">
      <img
        alt="Background"
        class="background-image"
        src="/logo2.jpeg"
      />
      <div class="backdrop"></div>
    </div>

    <main class="login-frame">
      <div class="brand-wrap">
        <div class="brand-badge">
          <img
            alt="Logo Facultad de Ciencias Económicas"
            src="/fce-logo.png"
          />
        </div>
        <h1>SISET-FCE</h1>
        <p>UNSM</p>
      </div>

      <section class="login-card" aria-labelledby="login-title">
        <div class="card-header">
          <h2 id="login-title">Bienvenido al Sistema de Seguimiento de Tesis</h2>
        </div>

        <form class="login-form" @submit.prevent="iniciarSesion" role="form" aria-describedby="login-error" novalidate>
          <div class="field-group">
            <label for="username">DNI</label>
            <div class="input-wrap">
              <span class="material-symbols-outlined input-icon"></span>
              <input
                id="username"
                v-model="credenciales.correo_electronico"
                type="text"
                placeholder=""
                aria-label="Usuario"
                autocomplete="username"
                required
              />
            </div>
          </div>

          <div class="field-group">
            <label for="password">Contraseña</label>
            <div class="input-wrap">
              <span class="material-symbols-outlined input-icon"></span>
              <input
                id="password"
                v-model="credenciales.password"
                :type="mostrarPassword ? 'text' : 'password'"
                placeholder=""
                aria-label="Contraseña"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="mostrarPassword = !mostrarPassword"
              >
                <span class="material-symbols-outlined">
                  {{ mostrarPassword ? 'visibility_off' : '' }}
                </span>
              </button>
            </div>
          </div>

          <div class="options-row">
            <label class="remember-box">
              <span class="checkbox-wrap">
                <input type="checkbox" />
                <span class="material-symbols-outlined checkmark">check</span>
              </span>
              <span>Recordarme</span>
            </label>
            <p class="helper-text">Cualquier problema de inicio de sesión, acudir a la UDI</p>
          </div>

          <p v-if="mensajeError" id="login-error" class="error-text" role="alert" aria-live="polite">{{ mensajeError }}</p>

          <button class="submit-button" type="submit" :disabled="cargando">
            <span>{{ cargando ? 'Ingresando…' : 'Iniciar Sesión' }}</span>
            <span class="material-symbols-outlined">login</span>
          </button>
        </form>

        <div class="footer-brand">
          <p>ACCESO INSTITUCIONAL</p>
          <div class="institutional-row">
            <img
              alt="FCE Logo"
              src="/fce-logo.png"
            />
            <span>Facultad de Ciencias Económicas</span>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <p>© 2026 Faculta de Ciencias Economicas .Todos los derechos reservados.</p>
      <div class="footer-links">
        <a href="#">Politica de Privacidad</a>
        <span>•</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

:global(body) {
  margin: 0;
  background: #f3f3f9;
  color: #191c20;
  font-family: 'Inter', sans-serif;
}

:global(*) {
  box-sizing: border-box;
}

:global(.material-symbols-outlined) {
  font-family: 'Material Symbols Outlined', sans-serif;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.page-shell {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #f3f3f9;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: 'rlig' 1, 'calt' 1;
}

.background-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.background-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  filter: saturate(0.75) brightness(1.06);
  transform: scale(1.02);
}

.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.72);
}

.login-frame {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 480px;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.brand-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2.1rem;
}

.brand-badge {
  width: 7rem;
  height: 7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1.15rem;
  background: rgba(255, 255, 255, 0.96);
  border: 3px solid rgba(24, 71, 156, 0.18);
  box-shadow: 0 10px 25px rgba(8, 29, 64, 0.12);
  padding: 0.7rem;
  overflow: hidden;
}

.brand-badge img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.08));
}

.brand-wrap h1 {
  margin: 0.8rem 0 0;
  color: #283a70;
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 2.3rem;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.04em;
  text-shadow: 0 0 0 rgba(0, 0, 0, 0);
  -webkit-text-stroke: 0.15px rgba(40, 58, 112, 0.1);
}

.brand-wrap p {
  margin: 0.15rem 0 0;
  color: #45464f;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.32rem;
  text-transform: uppercase;
}

.login-card {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(117, 118, 129, 0.16);
  border-radius: 1rem;
  box-shadow: 0 18px 34px rgba(33, 47, 76, 0.10);
  padding: 2.2rem 2rem 1.4rem;
}

.card-header {
  margin-bottom: 1.75rem;
  text-align: center;
}

.card-header h2 {
  margin: 0;
  color: #191c20;
  font-size: 1.45rem;
  line-height: 1.35;
  font-family: 'Hanken Grotesk', sans-serif;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.field-group label {
  margin-left: 0.25rem;
  color: #45464f;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  -webkit-font-smoothing: antialiased;
}

.input-wrap {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  color: #45464f;
  font-size: 1.25rem;
}

.input-wrap input {
  width: 100%;
  border: 1px solid rgba(117, 118, 129, 0.35);
  border-radius: 0.75rem;
  background: #f3f3f9;
  color: #191c20;
  font-size: 0.95rem;
  padding: 0.8rem 2.8rem 0.8rem 2.75rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-wrap input::placeholder {
  color: #757681;
}

.input-wrap input:focus {
  border-color: rgba(40, 58, 112, 0.8);
  box-shadow: 0 0 0 3px rgba(40, 58, 112, 0.12);

/* better focus visibility for keyboard users */
.input-wrap input:focus-visible,
.submit-button:focus-visible,
.password-toggle:focus-visible,
.remember-box:focus-visible {
  outline: 3px solid rgba(40, 58, 112, 0.12);
  outline-offset: 2px;
}
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 0.85rem;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border: 0;
  background: transparent;
  color: #45464f;
  cursor: pointer;
  padding: 0;
}

.options-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.1rem;
}

.remember-box {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: #45464f;
  font-size: 0.92rem;
  cursor: pointer;
}

.checkbox-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  height: 1.2rem;
}

.checkbox-wrap input {
  appearance: none;
  width: 1.2rem;
  height: 1.2rem;
  margin: 0;
  border: 2px solid #757681;
  border-radius: 0.3rem;
  background: #f3f3f9;
  cursor: pointer;
}

.checkbox-wrap input:checked {
  background: #283a70;
  border-color: #283a70;
}

.checkmark {
  position: absolute;
  font-size: 0.78rem;
  color: white;
  opacity: 0;
}

.checkbox-wrap input:checked + .checkmark {
  opacity: 1;
}

.helper-text {
  margin: 0;
  max-width: 11.5rem;
  color: rgba(69, 70, 79, 0.75);
  font-size: 0.67rem;
  line-height: 1.4;
  text-align: right;
}

.error-text {
  margin: 0;
  color: #ba1a1a;
  font-size: 0.82rem;
  line-height: 1.4;
}

.submit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  width: 100%;
  border: 0;
  border-radius: 0.8rem;
  padding: 0.88rem 1rem;
  background: #405189;
  color: white;
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease;
  box-shadow: 0 10px 18px rgba(64, 81, 137, 0.22);
}

.submit-button:hover {
  filter: brightness(1.06);
}

.submit-button:active {
  transform: scale(0.99);
}

.submit-button:disabled {
  opacity: 0.76;
  cursor: wait;
}

.footer-brand {
  margin-top: 2.1rem;
  padding-top: 1.2rem;
  border-top: 1px solid rgba(117, 118, 129, 0.22);
  text-align: center;
}

.footer-brand p {
  margin: 0 0 0.7rem;
  color: #45464f;
  font-size: 0.72rem;
  letter-spacing: 0.12rem;
  font-weight: 600;
}

.institutional-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #45464f;
  font-size: 0.9rem;
  font-weight: 500;
}

.institutional-row img {
  height: 2.5rem;
  width: auto;
  object-fit: contain;
}

.site-footer {
  position: relative;
  z-index: 1;
  width: 100%;
  text-align: center;
  padding: 1.8rem 1rem 2rem;
  color: rgba(69, 70, 79, 0.7);
}

.site-footer p {
  margin: 0;
  font-size: 0.72rem;
}

.footer-links {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.45rem;
  font-size: 0.72rem;
}

.footer-links a {
  color: rgba(69, 70, 79, 0.8);
  text-decoration: none;
}

.footer-links a:hover {
  text-decoration: underline;
}

@media (max-width: 520px) {
  .login-card {
    padding: 1.3rem 1rem 1rem;
  }

  .card-header h2 {
    font-size: 1.2rem;
  }

  .options-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .helper-text {
    max-width: none;
    text-align: left;
  }

  .brand-wrap h1 {
    font-size: 1.9rem;
  .brand-badge {
    width: 5.2rem;
    height: 5.2rem;
    padding: 0.45rem;
  }
  .login-frame {
    padding: 0 1rem;
  }
  .login-card {
    max-width: 92vw;
  }
  }

@media (min-width: 1024px) {
  .login-frame {
    max-width: 560px;
  }
  .brand-badge {
    width: clamp(88px, 9.5vw, 112px);
    height: clamp(88px, 9.5vw, 112px);
  }
}
}
</style>
