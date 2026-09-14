<template>
  <div class="flex-1 lg:ml-[260px] min-h-screen flex flex-col">
    <header class="flex justify-between items-center h-[70px] px-gutter w-full sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant shadow-sm">
      <div class="flex items-center gap-4">
        <button class="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <h2 class="font-headline-sm text-headline-sm text-primary">Asesor — Proyectos Aprobados</h2>
      </div>
    </header>

    <main class="p-gutter lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
      <div class="flex flex-col md:flex-row items-center gap-6">
        <div class="flex items-center bg-surface-container-lowest px-6 py-4 rounded-full border border-outline-variant shadow-sm flex-1 md:max-w-[50%]">
          <span class="material-symbols-outlined text-primary mr-3">search</span>
          <input class="bg-transparent border-none focus:ring-0 text-body-md w-full" placeholder="Buscar" type="text" />
        </div>
      </div>

      <div>
        <h3 class="font-headline-lg text-primary">Proyectos Aprobados (Asesor)</h3>
        <p class="text-body-md text-on-surface-variant">Historial de expedientes de proyectos aprobados donde usted actúa como asesor</p>
      </div>

      <section class="space-y-4 pb-12">
        <div class="group bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm transition-all">
          <div class="flex flex-col lg:flex-row gap-6">
            <div class="flex-1 space-y-4">
              <a href="/docente/asesor/proyectos/detalle-aprobada" class="block">
                <h4 class="font-headline-md text-on-surface leading-snug group-hover:text-secondary uppercase">SISTEMA BASADO EN VISIÓN POR COMPUTADORA PARA DETECCIÓN</h4>
              </a>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex items-center gap-3 text-on-surface-variant">
                  <span class="material-symbols-outlined text-secondary text-[20px]">person</span>
                  <div>
                    <p class="text-label-sm font-bold text-on-surface">KEVIN JHORDY FASABI SALDAÑA</p>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 pt-2 border-t border-outline-variant/30">
                <span class="material-symbols-outlined text-secondary text-[18px]">description</span>
                <span class="text-[12px] font-medium text-on-surface-variant">Resolución:</span>
                <a class="text-[12px] font-bold text-secondary hover:underline" href="#">Resolución N°045-2024</a>
              </div>
            </div>

            <div class="lg:w-72 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/50 pt-4 lg:pt-0 lg:pl-6">
              <div class="bg-secondary-container/10 border border-secondary/20 p-4 rounded-xl">
                <div class="flex items-center gap-2 text-secondary mb-2">
                  <span class="material-symbols-outlined text-[20px]">verified</span>
                  <span class="text-label-md font-bold uppercase tracking-tight">Proyecto Aprobado</span>
                </div>
                <a class="flex items-center justify-center gap-2 py-2 px-4 bg-secondary text-on-secondary rounded-lg text-label-sm font-bold" href="#">Ver Carta</a>
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
// UI-only: lista de proyectos aprobados (asesor)
</script>

<style scoped>
.p-gutter { padding: 1.25rem; }
</style>
