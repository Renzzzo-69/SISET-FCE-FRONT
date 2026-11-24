<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '@/services/api'

type Formato = {
  id: number
  nombre: string
  descripcion: string | null
  version: string
  nombre_original: string
  tipo_archivo: 'doc' | 'docx'
  categoria: string
  actualizado_en: string | null
  descarga: string
}
const formatos = ref<Formato[]>([])
const busqueda = ref('')
const categoria = ref('Todos')
const cargando = ref(true)
const error = ref('')
const errorDescarga = ref('')
const descargando = ref<number | null>(null)
const categorias = computed(() => [
  'Todos',
  ...new Set(formatos.value.map((item) => item.categoria)),
])
function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
const visibles = computed(() =>
  formatos.value.filter(
    (formato) =>
      (categoria.value === 'Todos' || formato.categoria === categoria.value) &&
      normalizar(
        `${formato.nombre} ${formato.nombre_original} ${formato.descripcion ?? ''} ${formato.version}`,
      ).includes(normalizar(busqueda.value)),
  ),
)
function limpiar() {
  busqueda.value = ''
  categoria.value = 'Todos'
}
function fecha(valor: string | null) {
  if (!valor) return 'No disponible'
  const dia = new Date(valor)
  return Number.isNaN(dia.getTime()) ? 'No disponible' : dia.toLocaleDateString('es-PE')
}
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<{ formatos: Formato[] }>('/formatos-oficiales')
    formatos.value = data.formatos
    if (!categorias.value.includes(categoria.value)) categoria.value = 'Todos'
  } catch {
    error.value = 'No se pudieron cargar los formatos publicados. Intenta nuevamente.'
  } finally {
    cargando.value = false
  }
}
async function descargar(formato: Formato) {
  if (descargando.value !== null) return
  descargando.value = formato.id
  errorDescarga.value = ''
  try {
    const { data } = await api.get<Blob>(`/formatos-oficiales/${formato.id}/descargar`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = formato.nombre_original
    document.body.append(enlace)
    enlace.click()
    enlace.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  } catch {
    errorDescarga.value = `No se pudo descargar «${formato.nombre}». Intenta nuevamente.`
  } finally {
    descargando.value = null
  }
}
onMounted(cargar)
</script>

<template>
  <section class="formatos-view" aria-labelledby="formatos-title" :aria-busy="cargando">
    <header class="page-heading">
      <h1 id="formatos-title">Formatos Oficiales</h1>
      <p>
        Descargue en Word las plantillas oficiales publicadas por Decanatura para la gestión de su
        expediente.
      </p>
    </header>
    <div class="toolbar">
      <label class="search">
        <span class="material-symbols-outlined" aria-hidden="true">search</span>
        <span class="sr-only">Buscar formato por nombre o versión</span>
        <input
          v-model="busqueda"
          type="search"
          placeholder="Buscar formato por nombre o versión..."
        />
      </label>
      <div class="categories" role="group" aria-label="Categoría de formato">
        <button
          v-for="item in categorias"
          :key="item"
          :aria-pressed="categoria === item"
          :class="{ active: categoria === item }"
          @click="categoria = item"
        >
          {{ item }}
        </button>
      </div>
    </div>
    <div v-if="cargando" class="empty" role="status">Cargando formatos oficiales…</div>
    <div v-else-if="error" class="empty" role="alert">
      <p>{{ error }}</p>
      <button @click="cargar">Reintentar</button>
    </div>
    <template v-else>
      <span class="sr-only" role="status">{{ visibles.length }} formatos encontrados.</span>
      <p v-if="errorDescarga" class="download-error" role="alert">{{ errorDescarga }}</p>
      <div class="formats-grid">
        <article v-for="formato in visibles" :key="formato.id" class="format-card">
          <header class="card-heading">
            <span class="format-icon material-symbols-outlined blue" aria-hidden="true"
              >description</span
            >
            <div>
              <span class="category">{{ formato.categoria }}</span>
              <h2>{{ formato.nombre }}</h2>
            </div>
          </header>
          <p v-if="formato.descripcion" class="description">{{ formato.descripcion }}</p>
          <dl class="metadata">
            <div>
              <dt>Versión publicada</dt>
              <dd class="version">{{ formato.version }}</dd>
            </div>
            <div>
              <dt>Actualizado</dt>
              <dd>{{ fecha(formato.actualizado_en) }}</dd>
            </div>
          </dl>
          <p class="file-name">{{ formato.nombre_original }}</p>
          <div class="downloads">
            <button
              :disabled="descargando !== null"
              :aria-label="`Descargar ${formato.nombre_original}`"
              @click="descargar(formato)"
            >
              <span class="material-symbols-outlined" aria-hidden="true">download</span>
              {{ descargando === formato.id ? 'Descargando…' : 'Descargar Word' }}
            </button>
          </div>
        </article>
      </div>
      <div v-if="!visibles.length" class="empty">
        <span class="material-symbols-outlined" aria-hidden="true">search_off</span>
        <p>
          {{
            formatos.length
              ? 'No se encontraron formatos con estos filtros.'
              : 'Decanatura aún no ha publicado formatos Word disponibles.'
          }}
        </p>
        <button v-if="formatos.length" @click="limpiar">Limpiar filtros</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.file-name,
.description {
  overflow-wrap: anywhere;
  color: #45464f;
  font-size: 12px;
}
.download-error {
  margin-bottom: 16px;
  color: #ba1a1a;
}
button:not(:disabled) {
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.formatos-view {
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
  color: #283a70;
  font-size: 28px;
  line-height: 36px;
  margin-bottom: 8px;
}
.page-heading p {
  max-width: 768px;
  color: #45464f;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  margin-bottom: 32px;
  background: white;
  border: 1px solid #e2e2e8;
  border-radius: 8px;
  box-shadow: 0 2px 4px #0000000d;
}
.search {
  position: relative;
  width: 33.333%;
  min-width: 300px;
}
.search > .material-symbols-outlined {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #c5c6d1;
  pointer-events: none;
}
.search input {
  width: 100%;
  padding: 10px 16px 10px 40px;
  background: #f9f9ff;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  font-size: 14px;
  line-height: 20px;
}
.categories {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
}
.categories button {
  padding: 8px 16px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  background: #f9f9ff;
  color: #45464f;
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}
.categories button.active {
  background: #405189;
  border-color: #405189;
  color: #dce1ff;
}
.categories button:hover {
  border-color: #283a70;
}
.formats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
.format-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
  border: 1px solid #e2e2e8;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px #0000000d;
}
.card-heading {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.format-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border: 1px solid;
  border-radius: 4px;
}
.blue {
  background: #dce1ff4d;
  color: #283a70;
  border-color: #dce1ff;
}
.category {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 2px;
  background: #e2e2e8;
  color: #45464f;
  font-size: 11px;
  line-height: 14px;
}
h2 {
  font-size: 16px;
  line-height: 20px;
  font-weight: 600;
  margin-top: 8px;
}
.metadata {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e2e2e8;
  border-radius: 4px;
  background: #f9f9ff;
}
.metadata > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.metadata > div:first-child {
  padding-bottom: 8px;
  border-bottom: 1px solid #c5c6d14d;
}
.metadata dt {
  font-size: 11px;
  line-height: 14px;
  color: #45464f;
}
.metadata dd {
  font-size: 12px;
  line-height: 16px;
}
.version {
  font-weight: 600;
}
.downloads {
  display: flex;
  gap: 12px;
  padding-top: 8px;
  margin-top: auto;
}
.downloads button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 8px;
  padding: 8px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  background: #f9f9ff;
  color: #283a70;
  font-size: 12px;
  line-height: 16px;
}
.downloads .material-symbols-outlined {
  font-size: 18px;
}
.empty {
  display: grid;
  justify-items: center;
  gap: 16px;
  padding: 40px 16px;
  background: white;
  border: 1px solid #e2e2e8;
  border-radius: 8px;
  color: #45464f;
  text-align: center;
}
.empty button {
  padding: 8px 16px;
  color: white;
  background: #283a70;
  border: 0;
  border-radius: 4px;
}
@media (max-width: 1100px) {
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .search {
    width: 100%;
    min-width: 0;
  }
  .formats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .formats-grid {
    grid-template-columns: 1fr;
  }
  h1 {
    font-size: 24px;
    line-height: 32px;
  }
}
</style>
