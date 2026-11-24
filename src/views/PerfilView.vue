<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import axios from 'axios'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Expediente } from '@/types/api'

type Perfil = {
  correo_electronico: string
  celular: string | null
  nombres: string | null
  apellido_paterno: string | null
  apellido_materno: string | null
  dni: string | null
  programa_academico: string | null
  puede_editar_celular: boolean
  tiene_foto: boolean
}
const auth = useAuthStore()
const perfil = ref<Perfil | null>(null)
const expedientes = ref<Expediente[]>([])
const cargando = ref(true)
const error = ref('')
const errorExpediente = ref('')
const errorFormulario = ref('')
const mensaje = ref('')
const guardando = ref(false)
const celular = ref('')
const foto = ref<File | null>(null)
const fotoUrl = ref('')
const fotoGuardada = ref('')
const selectorFoto = ref<HTMLInputElement | null>(null)
let desmontado = false
const expediente = computed(() => {
  const id = auth.usuario?.alumno?.id_alumno
  return id == null
    ? undefined
    : expedientes.value.find((item) => item.id_tesista === id || item.id_co_tesista === id)
})
const nombre = computed(() =>
  [perfil.value?.nombres, perfil.value?.apellido_paterno, perfil.value?.apellido_materno]
    .filter(Boolean)
    .join(' '),
)
const etiquetaPerfil = computed(
  () =>
    `${auth.tieneRol('tesista') ? 'Tesista' : 'Usuario'} ${auth.usuario?.estado === 1 ? 'Activo' : 'Inactivo'}`,
)
const hayCambios = computed(
  () => foto.value !== null || celular.value.trim() !== (perfil.value?.celular ?? ''),
)
function detalleError(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const datos = err.response?.data
    return datos?.errors?.celular?.[0] ?? datos?.errors?.foto?.[0] ?? datos?.message ?? fallback
  }
  return fallback
}
function limpiarVistaPrevia() {
  if (fotoUrl.value && fotoUrl.value !== fotoGuardada.value) URL.revokeObjectURL(fotoUrl.value)
}
function descartar() {
  limpiarVistaPrevia()
  fotoUrl.value = fotoGuardada.value
  foto.value = null
  celular.value = perfil.value?.celular ?? ''
  errorFormulario.value = ''
  mensaje.value = ''
}
function seleccionarFoto(event: Event) {
  const input = event.target as HTMLInputElement
  const archivo = input.files?.[0]
  input.value = ''
  if (!archivo) return
  errorFormulario.value = ''
  mensaje.value = ''
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) ||
    archivo.size > 2 * 1024 * 1024
  ) {
    errorFormulario.value = 'Selecciona una imagen JPG, PNG o WebP de hasta 2 MB.'
    return
  }
  limpiarVistaPrevia()
  foto.value = archivo
  fotoUrl.value = URL.createObjectURL(archivo)
}
async function cargar() {
  cargando.value = true
  error.value = ''
  errorExpediente.value = ''
  const [personal, lista] = await Promise.allSettled([
    api.get<Perfil>('/configuracion/perfil'),
    api.get<Expediente[]>('/expedientes'),
  ])
  if (desmontado) return
  if (personal.status === 'fulfilled') {
    perfil.value = personal.value.data
    descartar()
    if (perfil.value.tiene_foto && !fotoGuardada.value) {
      try {
        const { data } = await api.get<Blob>('/configuracion/perfil/foto', { responseType: 'blob' })
        if (!desmontado) fotoUrl.value = fotoGuardada.value = URL.createObjectURL(data)
      } catch {
        error.value = 'No se pudo cargar tu foto de perfil. Puedes reintentar.'
      }
    }
  } else error.value = 'No se pudieron cargar tus datos personales. Reintenta la consulta.'
  if (lista.status === 'fulfilled') expedientes.value = lista.value.data
  else errorExpediente.value = 'No se pudo consultar el expediente vinculado a tu perfil.'
  cargando.value = false
}
async function guardarCambios() {
  if (guardando.value || cargando.value || !perfil.value || !hayCambios.value) return
  errorFormulario.value = ''
  mensaje.value = ''
  const telefono = celular.value.trim()
  const cambioCelular = telefono !== (perfil.value.celular ?? '')
  if (
    cambioCelular &&
    (!/^\+?[0-9()\s-]{7,15}$/.test(telefono) || (telefono.match(/\d/g)?.length ?? 0) < 7)
  ) {
    errorFormulario.value = 'Ingresa un celular válido de 7 a 15 dígitos (máximo 15 caracteres).'
    return
  }
  guardando.value = true
  let celularGuardado = false
  try {
    if (cambioCelular && perfil.value.puede_editar_celular) {
      const { data } = await api.put<{ celular: string }>('/configuracion/perfil', {
        celular: telefono,
      })
      perfil.value.celular = celular.value = data.celular
      celularGuardado = true
    }
    if (foto.value) {
      const body = new FormData()
      body.append('foto', foto.value)
      await api.post('/configuracion/perfil/foto', body)
      if (fotoGuardada.value) URL.revokeObjectURL(fotoGuardada.value)
      fotoGuardada.value = fotoUrl.value
      foto.value = null
      perfil.value.tiene_foto = true
    }
    mensaje.value = 'Los cambios se guardaron correctamente.'
  } catch (err) {
    errorFormulario.value =
      (celularGuardado ? 'El celular se guardó. ' : '') +
      detalleError(err, 'No se pudieron guardar los cambios. Intenta nuevamente.')
  } finally {
    guardando.value = false
  }
}
onMounted(cargar)
onBeforeUnmount(() => {
  desmontado = true
  limpiarVistaPrevia()
  if (fotoGuardada.value) URL.revokeObjectURL(fotoGuardada.value)
})
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
            <img v-if="fotoUrl" :src="fotoUrl" class="avatar profile-photo" alt="Foto de perfil" />
            <span v-else class="avatar material-symbols-outlined" aria-label="Sin foto de perfil"
              >person</span
            ><button
              class="edit-avatar"
              type="button"
              :disabled="cargando || guardando || !perfil"
              title="Cambiar foto de perfil"
              aria-label="Cambiar foto de perfil"
              @click="selectorFoto?.click()"
            >
              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            </button>
          </div>
          <input
            ref="selectorFoto"
            class="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Seleccionar foto de perfil"
            @change="seleccionarFoto"
          />
          <h2>{{ nombre || 'Mi perfil' }}</h2>
          <span class="role-badge">{{ etiquetaPerfil }}</span>
          <dl class="file-summary">
            <div>
              <dt>Expediente</dt>
              <dd>
                {{
                  cargando
                    ? 'Cargando…'
                    : (expediente?.cod_expediente ??
                      (errorExpediente ? 'No disponible' : 'Sin expediente'))
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
          <div v-if="error || errorExpediente" class="load-error" role="alert">
            <p>{{ error || errorExpediente }}</p>
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
              Puedes actualizar tu celular y foto de perfil. Los datos personales y el correo
              institucional son de solo lectura. Foto: JPG, PNG o WebP de hasta 2 MB.
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
            ><label
              >Documento de Identidad (DNI)<input
                :value="perfil?.dni || 'No disponible'"
                readonly /></label
            ><label>Facultad<input value="Ciencias Económicas" readonly /></label
            ><label
              >Programa Académico<input
                :value="perfil?.programa_academico || 'No disponible'"
                readonly
            /></label>
          </div>
        </section>
        <form class="card contact-data" :aria-busy="guardando" @submit.prevent="guardarCambios">
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
                  :value="perfil?.correo_electronico ?? auth.usuario?.correo_electronico ?? ''"
                  readonly
                  autocomplete="email" /></span
              ><small>Este correo se usará para notificaciones oficiales.</small></label
            ><label for="profile-phone"
              >Celular Personal<span class="input-icon"
                ><span class="material-symbols-outlined" aria-hidden="true">smartphone</span
                ><input
                  id="profile-phone"
                  type="tel"
                  v-model="celular"
                  placeholder="Ingrese su celular"
                  maxlength="15"
                  :disabled="cargando || guardando || !perfil?.puede_editar_celular"
                  :aria-invalid="Boolean(errorFormulario)"
                  aria-describedby="contact-feedback"
                  autocomplete="tel" /></span
              ><small>Solo para contacto urgente por parte de coordinación.</small></label
            >
          </div>
          <p v-if="perfil && !perfil.puede_editar_celular" class="contact-feedback">
            Tu cuenta no tiene datos personales asociados. Contacta a coordinación para
            registrarlos.
          </p>
          <p
            id="contact-feedback"
            class="contact-feedback"
            :class="{ 'load-error': errorFormulario }"
            :role="errorFormulario ? 'alert' : 'status'"
          >
            {{ errorFormulario || mensaje }}
          </p>
          <div class="contact-actions">
            <button
              type="button"
              :disabled="!hayCambios || guardando || cargando"
              @click="descartar"
            >
              Descartar Cambios</button
            ><button
              class="save-button"
              type="submit"
              :disabled="!hayCambios || guardando || cargando || !perfil"
            >
              <span class="material-symbols-outlined" aria-hidden="true">save</span
              >{{ guardando ? 'Guardando…' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-photo {
  object-fit: cover;
}
.contact-feedback {
  margin-top: 12px;
  font-size: 12px;
}
button:not(:disabled) {
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

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
