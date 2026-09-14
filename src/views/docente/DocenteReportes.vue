<template>
  <div class="flex-1 lg:ml-[260px] min-h-screen flex flex-col">
    <header class="flex justify-between items-center h-[70px] px-gutter w-full sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant shadow-sm">
      <div class="flex items-center gap-4">
        <button class="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <h2 class="font-headline-sm text-headline-sm text-primary">Docente - Reportes</h2>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-right hidden sm:block">
          <p class="font-headline-sm text-headline-sm text-primary"><span class="font-medium">Bienvenido</span> Ing. Mg. Segundo Roger Ramírez Shupingahua</p>
          <p class="text-label-md text-on-surface-variant">segundoroger@gmail.com 944 929 63</p>
        </div>
      </div>
    </header>

    <main class="p-gutter lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 class="font-headline-lg text-headline-lg text-primary">Reportes y Analítica Académica</h3>
          <p class="text-body-md text-on-surface-variant">Monitoreo de rendimiento, tiempos de respuesta y trazabilidad de veredictos</p>
        </div>

        <div class="flex gap-2 bg-surface-container p-1 rounded-xl border border-outline-variant/30">
          <button class="px-4 py-2 rounded-lg font-label-md text-label-md font-bold transition-all bg-primary text-on-primary shadow-sm flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">timer</span>
            Plazos (Carbon API)
          </button>
          <button class="px-4 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-primary transition-all flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">history_edu</span>
            Historial de Rondas
          </button>
        </div>
      </div>

      <section class="space-y-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-secondary flex items-center justify-between">
            <div>
              <p class="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Revisiones a Tiempo</p>
              <h3 class="font-headline-lg text-headline-lg text-secondary">18</h3>
              <p class="text-[10px] text-secondary mt-1 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-secondary"></span> Plazo > 5 días</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary">
              <span class="material-symbols-outlined">check_circle</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-on-tertiary-container flex items-center justify-between">
            <div>
              <p class="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Próximos a Vencer</p>
              <h3 class="font-headline-lg text-headline-lg text-on-tertiary-container">06</h3>
              <p class="text-[10px] text-on-tertiary-container mt-1 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-on-tertiary-container animate-pulse"></span> 2 a 5 días hábiles</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-tertiary-fixed/20 flex items-center justify-center text-on-tertiary-container">
              <span class="material-symbols-outlined">warning</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-error flex items-center justify-between">
            <div>
              <p class="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Vencidos / Críticos</p>
              <h3 class="font-headline-lg text-headline-lg text-error">03</h3>
              <p class="text-[10px] text-error mt-1 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-error animate-ping"></span> Excedió límite</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-error-container/30 flex items-center justify-center text-error">
              <span class="material-symbols-outlined">priority_high</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-primary flex items-center justify-between">
            <div>
              <p class="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Promedio Respuesta</p>
              <h3 class="font-headline-lg text-headline-lg text-primary">4.2 <span class="text-xs font-normal">días</span></h3>
              <p class="text-[10px] text-primary mt-1 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">speed</span> Meta: <= 10 días</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined">timer</span>
            </div>
          </div>
        </div>

        <div class="bg-surface-container-lowest rounded-xl overflow-hidden">
          <div class="p-6 border-b border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
            <div>
              <h4 class="font-headline-md text-headline-md text-primary">Control de Tiempos de Respuesta por Expediente</h4>
              <p class="text-label-sm text-on-surface-variant">Lógica de días hábiles calculada dinámicamente</p>
            </div>
            <button class="bg-surface-container text-primary hover:bg-surface-container-high px-4 py-2 rounded-lg text-label-md font-bold transition-all flex items-center gap-2 border border-outline-variant/30">
              <span class="material-symbols-outlined">download</span> Exportar
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider border-b border-outline-variant/30">
                  <th class="py-3.5 px-6">Expediente / Tesista</th>
                  <th class="py-3.5 px-6">Jurado / Asesor</th>
                  <th class="py-3.5 px-6">Asignación</th>
                  <th class="py-3.5 px-6">Transcurrido</th>
                  <th class="py-3.5 px-6">Estado Semáforo</th>
                  <th class="py-3.5 px-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/30 text-body-md">
                <tr class="hover:bg-surface-container-low transition-colors">
                  <td class="py-4 px-6">
                    <div class="font-bold text-primary">EXP-2024-0842</div>
                    <div class="text-label-sm text-on-surface-variant">GARCÍA RUIZ, Alexander</div>
                  </td>
                  <td class="py-4 px-6">
                    <div class="font-semibold text-on-surface">Dr. RAMÍREZ, Carlos</div>
                    <div class="text-label-sm text-outline">Presidente de Jurado</div>
                  </td>
                  <td class="py-4 px-6 text-label-sm">02 Jul 2026</td>
                  <td class="py-4 px-6 font-bold text-on-surface">4 días hábiles</td>
                  <td class="py-4 px-6">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-bold bg-secondary-container/30 text-secondary">
                      <span class="w-2 h-2 rounded-full bg-secondary"></span>
                      Al día (Plazo OK)
                    </span>
                  </td>
                  <td class="py-4 px-6 text-right">
                    <router-link :to="{ name: 'docente-jurado-tesis-detalle', params: {} }" class="text-primary font-bold hover:underline text-label-md">Detalles</router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <footer class="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-outline-variant text-on-surface-variant gap-4">
      <div class="flex items-center gap-6">
        <p class="text-label-sm">© 2026 Facultad de Ciencias Económicas</p>
        <a class="text-label-sm hover:text-primary transition-colors" href="#">Términos y Condiciones</a>
        <a class="text-label-sm hover:text-primary transition-colors" href="#">Soporte Técnico</a>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
        <p class="text-[10px] font-bold uppercase tracking-widest">Sistema Operativo SISET-FCE</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// UI-only reportes del docente
</script>

<style scoped>
.p-gutter { padding: 1.25rem; }
</style>
