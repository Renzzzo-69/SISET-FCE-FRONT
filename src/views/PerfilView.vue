<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Expediente } from '@/types/api'

const auth = useAuthStore()
const expedientes = ref<Expediente[]>([])
const cargando = ref(true)
const error = ref('')
const expediente = computed(() =>
  expedientes.value.find(
    (item) =>
      item.id_tesista === auth.usuario?.alumno?.id_alumno ||
      item.id_co_tesista === auth.usuario?.alumno?.id_alumno,
  ),
)
const participante = computed(() =>
  expediente.value?.id_tesista === auth.usuario?.alumno?.id_alumno
    ? expediente.value?.tesista
    : expediente.value?.co_tesista,
)
const nombre = computed(() =>
  participante.value
    ? [
        participante.value.nombres,
        participante.value.apellido_paterno,
        participante.value.apellido_materno,
      ]
        .filter(Boolean)
        .join(' ')
    : '',
)
const etiquetaPerfil = computed(
  () =>
    `${auth.tieneRol('tesista') ? 'Tesista' : 'Usuario'} ${auth.usuario?.estado === 1 ? 'Activo' : 'Inactivo'}`,
)
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<Expediente[]>('/expedientes')
    expedientes.value = data
  } catch {
    error.value = 'No se pudo consultar el nombre y el expediente vinculado a tu perfil.'
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)
</script>

<template>
  <section class="profile-view" aria-labelledby="profile-title">
    <header class="page-heading">
      <h1 id="profile-title">Configuración de Usuario</h1>
      <p>Gestiona tus datos personales, información de contacto y preferencias visuales.</p>
    </header>
    <div class="profile-grid">
      <aside class="profile-sidebar">
        <section class="card profile-summary" :aria-busy="cargando">
          <div class="avatar-wrapper">
            <span class="avatar material-symbols-outlined" aria-label="Sin foto de perfil"
              >person</span
            ><button
              class="edit-avatar"
              disabled
              title="Edición de foto pendiente de implementación"
              aria-label="Cambiar foto de perfil: no disponible"
            >
              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            </button>
          </div>
          <h2>{{ nombre || 'Mi perfil' }}</h2>
          <span class="role-badge">{{ etiquetaPerfil }}</span>
          <dl class="file-summary">
            <div>
              <dt>Expediente</dt>
              <dd>
                {{
                  cargando
                    ? 'Cargando…'
                    : (expediente?.cod_expediente ?? (error ? 'No disponible' : 'Sin expediente'))
                }}
              </dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd class="file-state">
                <span v-if="expediente" class="material-symbols-outlined" aria-hidden="true"
                  >info</span
                >{{ expediente?.estado_actual?.nombre ?? 'No disponible' }}
              </dd>
            </div>
          </dl>
          <div v-if="error" class="load-error" role="alert">
            <p>{{ error }}</p>
            <button @click="cargar">Reintentar</button>
          </div>
        </section>
        <section class="card visual-settings">
          <h2>
            <span class="material-symbols-outlined" aria-hidden="true">palette</span>Configuración
            Visual
          </h2>
          <p>Ajusta la apariencia de la plataforma según tu preferencia.</p>
          <fieldset>
            <legend class="sr-only">Tema de la plataforma</legend>
            <label class="theme-option selected"
              ><span
                ><span class="material-symbols-outlined" aria-hidden="true">light_mode</span>Modo
                Claro</span
              ><input
                type="radio"
                name="perfil-tema"
                value="claro"
                checked
                aria-label="Modo Claro" /></label
            ><label class="theme-option" title="Modo oscuro pendiente de implementación"
              ><span
                ><span class="material-symbols-outlined" aria-hidden="true">dark_mode</span>Modo
                Oscuro</span
              ><input
                type="radio"
                name="perfil-tema"
                value="oscuro"
                disabled
                aria-describedby="theme-notice"
            /></label>
          </fieldset>
          <small id="theme-notice">El modo oscuro aún no está disponible.</small>
        </section>
      </aside>
      <div class="profile-details">
        <div class="profile-notice">
          <span class="material-symbols-outlined" aria-hidden="true">info</span>
          <div>
            <h2>Perfil de usuario</h2>
            <p>
              La edición de contacto y foto aún no está disponible. Los datos no proporcionados se
              muestran como “No disponible”.
            </p>
          </div>
        </div>
        <section class="card personal-data">
          <header class="section-heading">
            <h2>
              <span class="material-symbols-outlined" aria-hidden="true">badge</span>Datos
              Personales
            </h2>
            <span class="readonly-badge">Solo lectura</span>
          </header>
          <div class="fields-grid">
            <label
              >Nombres Completos<input
                :value="nombre || (cargando ? 'Cargando…' : 'No disponible')"
                readonly
                autocomplete="name" /></label
            ><label>Documento de Identidad (DNI)<input value="No disponible" readonly /></label
            ><label>Facultad<input value="Ciencias Económicas" readonly /></label
            ><label>Programa Académico<input value="No disponible" readonly /></label>
          </div>
        </section>
        <section class="card contact-data">
          <h2>
            <span class="material-symbols-outlined" aria-hidden="true">contact_mail</span>Datos de
            Contacto
          </h2>
          <div class="fields-grid">
            <label for="profile-email"
              >Correo Electrónico Institucional<span class="input-icon"
                ><span class="material-symbols-outlined" aria-hidden="true">mail</span
                ><input
                  id="profile-email"
                  type="email"
                  :value="auth.usuario?.correo_electronico ?? ''"
                  readonly
                  autocomplete="email" /></span
              ><small>Este correo se usará para notificaciones oficiales.</small></label
            ><label for="profile-phone"
              >Celular Personal<span class="input-icon"
                ><span class="material-symbols-outlined" aria-hidden="true">smartphone</span
                ><input
                  id="profile-phone"
                  type="tel"
                  placeholder="No disponible"
                  readonly
                  autocomplete="tel" /></span
              ><small>Solo para contacto urgente por parte de coordinación.</small></label
            >
          </div>
          <div class="contact-actions">
            <button disabled title="La edición de contacto aún no está disponible">
              Descartar Cambios</button
            ><button
              class="save-button"
              disabled
              title="La edición de contacto aún no está disponible"
            >
              <span class="material-symbols-outlined" aria-hidden="true">save</span>Guardar Cambios
            </button>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-view {
  max-width: 1280px;
  margin: 0 auto;
  font-size: 14px;
  line-height: 20px;
}
h1,
h2,
p,
dl,
dd {
  margin: 0;
}
.page-heading {
  margin-bottom: 24px;
}
h1 {
  font-size: 28px;
  line-height: 36px;
}
.page-heading p {
  margin-top: 4px;
  color: #45464f;
}
.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2.08fr);
  gap: 20px;
  align-items: start;
}
.profile-sidebar,
.profile-details {
  display: grid;
  gap: 20px;
}
.card {
  padding: 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px #0000000d;
}
.profile-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.avatar-wrapper {
  position: relative;
  margin-bottom: 16px;
}
.avatar {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  border: 4px solid #f9f9ff;
  border-radius: 12px;
  background: #e7e8ee;
  color: #283a70;
  font-size: 48px;
  box-shadow: 0 1px 2px #0000000d;
}
.edit-avatar {
  position: absolute;
  bottom: 0;
  right: 0;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 12px;
  background: #283a70;
  color: white;
}
.edit-avatar .material-symbols-outlined {
  font-size: 16px;
}
.profile-summary h2 {
  font-size: 22px;
  line-height: 30px;
  margin-bottom: 4px;
}
.role-badge {
  padding: 4px 12px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: #dce1ff;
  color: #33447b;
  font-size: 11px;
  line-height: 14px;
}
.file-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding-top: 16px;
  border-top: 1px solid #c5c6d1;
  text-align: left;
}
.file-summary > div {
  min-width: 0;
}
.file-summary > div:last-child {
  text-align: right;
}
.file-summary dt {
  text-transform: uppercase;
  letter-spacing: 0.7px;
  font-size: 11px;
  line-height: 14px;
  color: #45464f;
}
.file-summary dd {
  overflow-wrap: anywhere;
}
.file-state {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 4px;
  color: #006b5c;
}
.file-state .material-symbols-outlined {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}
.visual-settings h2,
.section-heading h2,
.contact-data h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}
h2 .material-symbols-outlined {
  color: #283a70;
}
.visual-settings > p {
  margin: 16px 0;
  color: #45464f;
}
fieldset {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 0;
  border: 0;
}
.theme-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
}
.theme-option > span {
  display: flex;
  align-items: center;
  gap: 12px;
}
.theme-option.selected {
  border-color: #283a70;
  background: #b5c4ff33;
}
.selected .material-symbols-outlined {
  color: #283a70;
}
.theme-option input {
  accent-color: #283a70;
  width: 16px;
  height: 16px;
}
.visual-settings > small {
  display: block;
  margin-top: 12px;
  font-size: 11px;
  line-height: 14px;
  color: #757681;
}
.profile-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  background: #dce1ff40;
  color: #283a70;
}
.profile-notice h2 {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  margin-bottom: 4px;
}
.profile-notice p {
  color: #45464f;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.readonly-badge {
  padding: 4px 8px;
  border-radius: 2px;
  background: #ededf3;
  color: #45464f;
  font-size: 11px;
  line-height: 14px;
  white-space: nowrap;
}
.fields-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.fields-grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  line-height: 16px;
}
.personal-data label {
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #45464f;
  font-size: 11px;
}
.fields-grid input {
  width: 100%;
  min-width: 0;
  padding: 12px;
  background: #f9f9ff;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  font-size: 14px;
  line-height: 20px;
  color: #191c20;
  letter-spacing: normal;
}
.contact-data h2 {
  margin-bottom: 24px;
}
.input-icon {
  position: relative;
}
.input-icon > .material-symbols-outlined {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #757681;
  font-size: 18px;
}
.input-icon input {
  padding: 8px 12px 8px 40px;
  background: white;
}
.fields-grid small {
  color: #45464f;
  font-size: 11px;
  line-height: 14px;
}
.contact-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #c5c6d1;
}
.contact-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  background: #f9f9ff;
  font-size: 12px;
  line-height: 16px;
}
.contact-actions .save-button {
  background: #405189;
  border-color: #405189;
  color: white;
}
.save-button .material-symbols-outlined {
  font-size: 18px;
}
.load-error {
  margin-top: 16px;
  color: #ba1a1a;
  font-size: 12px;
}
.load-error button {
  margin-top: 8px;
  padding: 6px 12px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  background: #f9f9ff;
  color: #283a70;
}
@media (max-width: 1100px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
  .profile-sidebar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
@media (max-width: 600px) {
  .profile-sidebar,
  .fields-grid {
    grid-template-columns: 1fr;
  }
  h1 {
    font-size: 24px;
    line-height: 32px;
  }
  .card {
    padding: 20px;
  }
}
</style>
