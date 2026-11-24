<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import axios from 'axios'
import api, { descargarDocumentoPrivado } from '@/services/api'
import type { ArchivoConsulta } from '@/types/api'

const props = defineProps<{ archivo: ArchivoConsulta; nombre: string }>()
const ocupado = ref(false)
const error = ref('')
const visor = ref<HTMLDialogElement | null>(null)
const urlVista = ref('')
function cerrar() {
  visor.value?.close()
  if (urlVista.value) URL.revokeObjectURL(urlVista.value)
  urlVista.value = ''
}
async function abrir(descargar = false) {
  if (ocupado.value) return
  ocupado.value = true
  error.value = ''
  try {
    const origen = new URL(import.meta.env.VITE_API_URL, window.location.origin).origin
    const url = new URL(props.archivo.ruta, origen)
    if (url.origin !== origen) throw new Error('Origen no permitido')
    if (descargar) {
      await descargarDocumentoPrivado(url.toString(), props.nombre)
    } else if (props.archivo.formato === 'pdf') {
      const { data } = await api.get<Blob>(url.toString(), { responseType: 'blob' })
      if (data.type.split(';')[0] !== 'application/pdf') throw new Error('Formato no compatible')
      cerrar()
      urlVista.value = URL.createObjectURL(data)
      visor.value?.showModal()
    }
  } catch (causa) {
    error.value = 'No se pudo abrir el documento. Inténtalo nuevamente.'
    if (
      axios.isAxiosError(causa) &&
      causa.response?.data instanceof Blob &&
      causa.response.data.type.includes('json')
    ) {
      try {
        const respuesta = JSON.parse(await causa.response.data.text())
        if (typeof respuesta.message === 'string') error.value = respuesta.message
      } catch {
        /* Conserva el mensaje de respaldo. */
      }
    }
  } finally {
    ocupado.value = false
  }
}
onBeforeUnmount(cerrar)
</script>

<template>
  <div class="archivo-acciones">
    <span
      >{{ nombre }} <small>{{ archivo.formato?.toUpperCase() }}</small></span
    >
    <div class="botones">
      <button
        v-if="archivo.formato === 'pdf'"
        type="button"
        :disabled="ocupado"
        :aria-label="`Ver ${nombre}`"
        title="Previsualizar PDF"
        @click="abrir()"
      >
        <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
      </button>
      <button
        type="button"
        :disabled="ocupado"
        :aria-label="`Descargar ${nombre}`"
        title="Descargar"
        @click="abrir(true)"
      >
        <span class="material-symbols-outlined" aria-hidden="true">download</span>
      </button>
    </div>
    <p v-if="error" class="archivo-error" role="alert">{{ error }}</p>
    <dialog ref="visor" @close="cerrar">
      <header>
        <strong>{{ nombre }}</strong
        ><button type="button" @click="cerrar">Cerrar</button>
      </header>
      <iframe v-if="urlVista" :src="urlVista" :title="nombre"></iframe>
    </dialog>
  </div>
</template>

<style scoped>
.archivo-acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
}
.archivo-acciones > span {
  flex: 1;
  min-width: 100px;
}
small {
  color: #757681;
}
.botones {
  display: flex;
  gap: 6px;
}
button {
  padding: 6px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  background: #f9f9ff;
  color: #283a70;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.material-symbols-outlined {
  font-size: 18px;
  vertical-align: middle;
}
.archivo-error {
  width: 100%;
  color: #93000a;
}
dialog {
  width: min(1000px, 95vw);
  height: 85dvh;
  padding: 16px;
  border: 1px solid #c5c6d1;
  border-radius: 8px;
}
dialog::backdrop {
  background: #191c2080;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
iframe {
  width: 100%;
  height: calc(100% - 64px);
  border: 0;
}
</style>
