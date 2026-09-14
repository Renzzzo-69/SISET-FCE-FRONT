<template>
  <div class="flex-1 lg:ml-[260px] min-h-screen flex flex-col">
    <header class="flex justify-between items-center h-[70px] px-gutter w-full sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant shadow-sm">
      <div class="flex items-center gap-4">
        <button class="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 class="font-headline-sm text-headline-sm text-primary">Detalle de Tesis</h2>
      </div>
    </header>

    <main class="p-gutter lg:p-10 max-w-7xl mx-auto w-full">
      <div class="flex items-center gap-4 mb-6">
        <button class="p-2 hover:bg-surface-container rounded-full transition-colors">
          <span class="material-symbols-outlined text-primary">arrow_back</span>
        </button>
        <div>
          <h3 class="font-headline-lg text-primary leading-tight">SISTEMA INFORMATICO HELPDESK EN LA CALIDAD DE SERVICIO TI</h3>
        </div>
      </div>

      <section class="space-y-6 pb-12">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <article class="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div class="flex items-center gap-2 mb-4 text-primary">
                  <span class="material-symbols-outlined">person</span>
                  <h4 class="font-headline-sm">Datos del Tesista</h4>
                </div>
                <div class="space-y-3">
                  <div>
                    <p class="text-label-sm text-on-surface-variant uppercase">Nombre Completo</p>
                    <p class="text-body-md font-bold">CARLOS HUMBERTO GONZALES DELGADO</p>
                  </div>
                  <div>
                    <p class="text-label-sm text-on-surface-variant uppercase">Escuela</p>
                    <p class="text-body-md">Ingeniería de Sistemas e Informática</p>
                  </div>
                </div>
              </div>

              <div class="lg:border-l lg:pl-8 border-outline-variant">
                <div class="flex items-center gap-2 mb-4 text-primary">
                  <span class="material-symbols-outlined">school</span>
                  <h4 class="font-headline-sm">Datos del Asesor</h4>
                </div>
                <div class="space-y-3">
                  <div>
                    <p class="text-label-sm text-on-surface-variant uppercase">Nombre del Asesor</p>
                    <p class="text-body-md font-bold">Ing. Mg. Segundo Roger Ramírez Shupingahua</p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article class="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
            <div class="flex items-center gap-2 mb-6 text-primary">
              <span class="material-symbols-outlined">gavel</span>
              <h4 class="font-headline-sm">Evaluación de Jurados</h4>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-secondary/10 border border-secondary/20 p-4 rounded-xl">
                <p class="text-label-sm font-bold text-secondary mb-1 uppercase">Jurado 1: Vocal</p>
                <p class="text-body-md font-bold text-secondary">Lic. Marco Antonio Ruiz</p>
                <div class="mt-2 pt-2 border-t border-secondary/20 text-label-sm text-secondary">
                  <p>Correo: vocal1@example.com</p>
                </div>
              </div>
              <div class="bg-tertiary-container/10 border border-tertiary-container/20 p-4 rounded-xl">
                <p class="text-label-sm font-bold text-tertiary mb-1 uppercase">Jurado 2: Secretario</p>
                <p class="text-body-md font-bold text-tertiary-container">Ing. Mg. Segundo Roger Ramírez</p>
              </div>
              <div class="bg-surface-container-high border border-outline-variant p-4 rounded-xl">
                <p class="text-label-sm font-bold text-on-surface-variant mb-1 uppercase">Jurado 3: Presidente</p>
                <p class="text-body-md font-bold text-on-surface-variant">Dr. Juan Carlos Vega</p>
              </div>
            </div>
          </article>
        </div>

        <div class="flex flex-wrap justify-end items-center gap-4 py-8 border-t border-outline-variant">
          <a href="#" class="h-11 px-5 border border-primary/40 text-primary rounded-lg font-medium text-body-md flex items-center justify-center gap-2 hover:bg-primary/5 transition-all">
            <span class="material-symbols-outlined text-[20px]">visibility</span>
            <span>Ver Informe</span>
          </a>
          <button class="h-11 px-5 border-2 border-secondary text-secondary rounded-lg font-bold text-body-md flex items-center justify-center gap-2 hover:bg-secondary/5 transition-all">
            <span class="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Aprobar Informe</span>
          </button>
        </div>
      </section>
    </main>

    <footer class="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-outline-variant text-on-surface-variant gap-4">
      <div class="flex items-center gap-6">
        <p class="text-label-sm">© 2024 Facultad de Ciencias Económicas</p>
        <a class="text-label-sm hover:text-primary transition-colors" href="#">Términos y Condiciones</a>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
        <p class="text-[10px] font-bold uppercase tracking-widest">Sistema Operativo</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// UI-only detail page for jurado tesis
</script>

<style scoped>
.p-gutter { padding: 1.25rem; }
</style>
