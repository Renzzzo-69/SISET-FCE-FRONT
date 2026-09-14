<script setup lang="ts">
// UI-only: Subir Resolución
</script>

<template>
  <div class="max-w-4xl mx-auto py-10 px-gutter">
    <div class="flex items-center gap-4 mb-8">
      <button class="p-2 rounded-full hover:bg-surface-container transition-colors">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h2 class="font-headline-lg text-headline-lg text-primary">Subir Resolución</h2>
    </div>

    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
      <div class="bg-surface-container-low px-card-padding py-4 border-b border-outline-variant/30">
        <h3 class="font-headline-sm text-headline-sm text-primary">Detalles del Documento</h3>
      </div>
      <div class="p-card-padding space-y-8">
        <div class="space-y-2">
          <label class="font-label-md text-label-md text-outline uppercase tracking-wider">Tipo de resolución</label>
          <select class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none">
            <option>Resolución de Decanato</option>
            <option>Resolución de Consejo de Facultad</option>
            <option>Resolución Directoral</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="font-label-md text-label-md text-outline uppercase tracking-wider">Destinatario</label>
          <select class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none">
            <option>Estudiante</option>
            <option>Docente</option>
            <option>Administrativo</option>
          </select>
        </div>

        <div>
          <label class="font-label-md text-label-md text-outline uppercase tracking-wider">Seleccionar Archivo</label>
          <div class="file-drop-area border-2 border-dashed border-outline-variant/60 rounded-xl p-8 flex flex-col items-center justify-center gap-4 transition-all hover:bg-surface-container/50 cursor-pointer">
            <div class="w-16 h-16 rounded-full bg-secondary-container/30 flex items-center justify-center">
              <span class="material-symbols-outlined text-secondary text-4xl">cloud_upload</span>
            </div>
            <div class="text-center">
              <p class="font-headline-sm text-on-surface">Arrastra y suelta tu archivo aquí</p>
              <p class="font-body-md text-on-surface-variant">o haz clic para explorar tus carpetas</p>
            </div>
            <p class="font-label-sm text-label-sm text-outline">Formatos permitidos: PDF, DOCX (Máx. 25MB)</p>
            <input class="hidden" type="file" />
          </div>
        </div>
      </div>

      <div class="bg-surface-container-low px-card-padding py-6 border-t border-outline-variant/30 flex justify-end gap-4">
        <button class="px-8 py-3 rounded-xl font-headline-sm text-secondary border border-secondary hover:bg-secondary-container/10 transition-all active:scale-95">Cancelar</button>
        <button class="px-10 py-3 rounded-xl font-headline-sm text-white bg-primary-container hover:brightness-110 shadow-sm transition-all active:scale-95">Aceptar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.p-card-padding { padding: 1.5rem; }
</style>
