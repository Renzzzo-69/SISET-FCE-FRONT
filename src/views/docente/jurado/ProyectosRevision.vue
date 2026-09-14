<template>
  <div class="flex-1 lg:ml-[260px] min-h-screen flex flex-col">
    <header class="flex justify-between items-center h-[70px] px-gutter w-full sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant shadow-sm">
      <div class="flex items-center gap-4">
        <button class="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <h2 class="font-headline-sm text-headline-sm text-primary">Docente — Proyectos en Revisión</h2>
      </div>
    </header>

    <main class="p-gutter lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
      <div class="flex flex-col md:flex-row items-center gap-6">
        <div class="flex items-center bg-surface-container-lowest px-6 py-4 rounded-full border border-outline-variant shadow-sm transition-shadow flex-1 md:max-w-[50%]">
          <span class="material-symbols-outlined text-primary mr-3">search</span>
          <input class="bg-transparent border-none focus:ring-0 text-body-md w-full" placeholder="Buscar" type="text" />
        </div>
        <div class="flex items-center gap-6 px-4">
          <label class="flex items-center gap-2 cursor-pointer group">
            <input class="w-5 h-5 rounded border-outline-variant text-primary" type="checkbox" />
            <span class="text-body-md font-medium text-on-surface-variant">Autor</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer group">
            <input class="w-5 h-5 rounded border-outline-variant text-primary" type="checkbox" />
            <span class="text-body-md font-medium text-on-surface-variant">Escuela</span>
          </label>
        </div>
      </div>

      <div>
        <h3 class="font-headline-lg text-primary">Proyectos en revisión</h3>
        <p class="text-body-md text-on-surface-variant">Gestión de expedientes en revisión de jurado</p>
      </div>

      <section class="space-y-4 pb-12">
        <div class="group bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div class="flex flex-col lg:flex-row gap-6">
            <div class="flex-1 space-y-4">
              <a href="/docente/jurado/tesis/detalle" class="block">
                <h4 class="font-headline-md text-on-surface leading-snug group-hover:text-primary">AGENTE CONVERSACIONAL PARA LA SATISFACCIÓN DE USUARIOS EN LA FACULTAD DE EDUCACIÓN</h4>
              </a>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex items-center gap-3 text-on-surface-variant">
                  <span class="material-symbols-outlined text-primary/70 text-[20px]">person</span>
                  <div>
                    <p class="text-label-sm font-bold text-on-surface">EDWIN RENATO PIÑA JARAMILLO</p>
                    <p class="text-[12px]">erpinaj@alumno.unsm.edu.pe • 943316756</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 text-on-surface-variant">
                  <span class="material-symbols-outlined text-primary/70 text-[20px]">assignment_ind</span>
                  <div>
                    <p class="text-label-sm font-bold text-on-surface">Secretario de Jurado</p>
                    <p class="text-[12px]">Rol designado</p>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-2 border-t border-outline-variant/30">
                <span class="material-symbols-outlined text-primary/70 text-[18px]">description</span>
                <span class="text-[12px] font-medium text-on-surface-variant">Resolución:</span>
                <a class="text-[12px] font-bold text-primary hover:underline" href="#">Resolución N°023-2026</a>
              </div>
            </div>

            <div class="lg:w-72 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/50 pt-4 lg:pt-0 lg:pl-6">
              <div class="bg-error/10 border border-error/20 p-4 rounded-xl">
                <div class="flex items-center gap-2 text-error mb-2">
                  <span class="material-symbols-outlined text-[20px]">notification_important</span>
                  <span class="text-label-md font-bold uppercase">Acción Requerida</span>
                </div>
                <p class="text-[13px] leading-relaxed text-error font-medium">El alumno levantó sus Observaciones. Usted debe enviar Observaciones o Aprobar el Informe</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-outline-variant text-on-surface-variant gap-4">
      <div class="flex items-center gap-6">
        <p class="text-label-sm">© 2024 Facultad de Ciencias Económicas</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// UI-only: lista de proyectos en revisión (jurado)
</script>

<style scoped>
.p-gutter { padding: 1.25rem; }
</style>
