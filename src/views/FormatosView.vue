<script setup lang="ts">
import { computed, ref } from 'vue'

const busqueda = ref('')
const categoria = ref('Todos')
const categorias = ['Todos', 'Inscripción', 'Proyectos', 'Sustentación']
// Datos visuales de Formatos_Oficiales.html. Las descargas requieren los archivos oficiales.
const formatos = [
  {
    nombre: 'Solicitud de inscripción',
    categoria: 'Inscripción',
    version: 'v3.0',
    fecha: '15/03/2024',
    icono: 'description',
    tono: 'green',
    bloqueado: false,
  },
  {
    nombre: 'Plantilla de proyecto',
    categoria: 'Proyectos',
    version: 'v1.2',
    fecha: '10/01/2024',
    icono: 'article',
    tono: 'blue',
    bloqueado: false,
  },
  {
    nombre: 'Informe final',
    categoria: 'Sustentación',
    version: 'v4.0',
    fecha: '05/11/2023',
    icono: 'assignment',
    tono: 'gold',
    bloqueado: false,
  },
  {
    nombre: 'Levantamiento observaciones',
    categoria: 'Proyectos',
    version: 'v2.1',
    fecha: '20/08/2023',
    icono: 'fact_check',
    tono: 'red',
    bloqueado: false,
  },
  {
    nombre: 'Formato de Exoneración',
    categoria: '',
    version: '',
    fecha: '',
    icono: 'lock',
    tono: '',
    bloqueado: true,
  },
]
function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
const visibles = computed(() =>
  formatos.filter(
    (formato) =>
      (categoria.value === 'Todos' || formato.categoria === categoria.value) &&
      normalizar(`${formato.nombre} ${formato.categoria} ${formato.version}`).includes(
        normalizar(busqueda.value),
      ),
  ),
)
function limpiar() {
  busqueda.value = ''
  categoria.value = 'Todos'
}
</script>

<template>
  <section class="formatos-view" aria-labelledby="formatos-title">
    <header class="page-heading">
      <h1 id="formatos-title">Formatos Oficiales</h1>
      <p>
        Directorio oficial de plantillas, solicitudes y documentos normativos requeridos para la
        gestión de proyectos de tesis y graduación. Asegúrese de utilizar la versión vigente
        detallada en cada tarjeta.
      </p>
    </header>
    <div class="toolbar">
      <label class="search"
        ><span class="material-symbols-outlined" aria-hidden="true">search</span
        ><span class="sr-only">Buscar formato por nombre o versión</span
        ><input
          v-model="busqueda"
          type="search"
          placeholder="Buscar formato por nombre o versión..."
      /></label>
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
    <span class="sr-only" role="status">{{ visibles.length }} formatos encontrados.</span>
    <div class="formats-grid">
      <article
        v-for="formato in visibles"
        :key="formato.nombre"
        class="format-card"
        :class="{ locked: formato.bloqueado }"
      >
        <template v-if="formato.bloqueado"
          ><span class="locked-icon material-symbols-outlined" aria-hidden="true">lock</span>
          <div>
            <h2>{{ formato.nombre }}</h2>
            <p>Este documento se encuentra en revisión normativa.</p>
          </div>
          <span class="unavailable"
            ><span class="material-symbols-outlined" aria-hidden="true">block</span>No disponible
            temporalmente</span
          ></template
        >
        <template v-else>
          <header class="card-heading">
            <span
              class="format-icon material-symbols-outlined"
              :class="formato.tono"
              aria-hidden="true"
              >{{ formato.icono }}</span
            >
            <div>
              <span class="category">{{ formato.categoria }}</span>
              <h2>{{ formato.nombre }}</h2>
            </div>
          </header>
          <dl class="metadata">
            <div>
              <dt>Versión vigente</dt>
              <dd class="version">{{ formato.version }}</dd>
            </div>
            <div>
              <dt>Fecha vigencia</dt>
              <dd>{{ formato.fecha }}</dd>
            </div>
          </dl>
          <div class="downloads">
            <button
              disabled
              :aria-label="`Word de ${formato.nombre}: archivo pendiente de publicación`"
              title="Archivo oficial pendiente de publicación"
              aria-describedby="formatos-notice"
            >
              <span class="material-symbols-outlined" aria-hidden="true">description</span
              >Word</button
            ><button
              class="pdf"
              disabled
              :aria-label="`PDF de ${formato.nombre}: archivo pendiente de publicación`"
              title="Archivo oficial pendiente de publicación"
              aria-describedby="formatos-notice"
            >
              <span class="material-symbols-outlined" aria-hidden="true">picture_as_pdf</span>PDF
            </button>
          </div>
        </template>
      </article>
    </div>
    <div v-if="!visibles.length" class="empty">
      <span class="material-symbols-outlined" aria-hidden="true">search_off</span>
      <p>No se encontraron formatos con estos filtros.</p>
      <button @click="limpiar">Limpiar filtros</button>
    </div>
    <p id="formatos-notice" class="catalog-notice">
      Catálogo de referencia. Las versiones y fechas están pendientes de validación; las descargas
      se habilitarán cuando se publiquen los archivos oficiales.
    </p>
  </section>
</template>

<style scoped>
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
.green {
  background: #6ff5dc33;
  color: #006b5c;
  border-color: #6ff5dc80;
}
.blue {
  background: #dce1ff4d;
  color: #283a70;
  border-color: #dce1ff;
}
.gold {
  background: #ffdf9b4d;
  color: #4e3a00;
  border-color: #e8c26d;
}
.red {
  background: #ffdad64d;
  color: #ba1a1a;
  border-color: #ffdad6;
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
.downloads button.pdf {
  background: #283a70;
  color: white;
  border-color: #283a70;
}
.downloads .material-symbols-outlined {
  font-size: 18px;
}
.format-card.locked {
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 280px;
  text-align: center;
  background: #ededf3;
  border: 1px dashed #c5c6d1;
  box-shadow: none;
  opacity: 0.8;
}
.locked-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: #e2e2e8;
  color: #757681;
  font-size: 32px;
  margin-bottom: 8px;
}
.locked h2 {
  color: #45464f;
  margin: 0 0 4px;
}
.locked p {
  max-width: 200px;
  margin: 0 auto;
  color: #757681;
  font-size: 11px;
  line-height: 14px;
}
.unavailable {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  margin-top: 8px;
  background: #e2e2e8;
  border-radius: 4px;
  color: #45464f;
  font-size: 12px;
  line-height: 16px;
}
.unavailable .material-symbols-outlined {
  font-size: 16px;
}
.catalog-notice {
  color: #757681;
  font-size: 12px;
  line-height: 18px;
  margin-top: 24px;
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
