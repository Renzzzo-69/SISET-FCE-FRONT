<script setup lang="ts">
// UI-only dashboard for Docente module (Jurado / Asesor)
</script>

<template>
  <div class="flex-1 lg:ml-[250px] min-h-screen flex flex-col">
    <header class="flex justify-between items-center h-[70px] px-gutter w-full sticky top-0 z-50 bg-surface-container-lowest border-b border-outline-variant shadow-sm">
      <div class="flex items-center gap-4">
        <h2 class="font-headline-sm text-headline-sm text-primary">Docente</h2>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-right hidden sm:block">
          <p class="font-headline-sm text-headline-sm text-primary"><span class="font-medium">Bienvenido</span> Ing. Mg. Segundo Roger Ramírez Shupingahua</p>
          <p class="text-label-md text-on-surface-variant">segundoroger@gmail.com 944 929 63</p>
        </div>
      </div>
    </header>

    <div class="p-gutter lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
      <div class="flex items-center bg-surface-container px-4 py-3 rounded-xl border border-outline-variant shadow-sm">
        <span class="material-symbols-outlined text-outline mr-3">search</span>
        <input class="bg-transparent border-none focus:ring-0 text-body-md w-full" placeholder="Buscar expedientes, alumnos o trámites..." type="text" />
      </div>

      <div class="space-y-8">
        <div class="space-y-4">
          <h4 class="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Actuales</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-primary flex items-center justify-between">
              <div>
                <p class="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Tesis en Asesoría</p>
                <h3 class="font-headline-lg text-headline-lg text-primary">12</h3>
                <p class="text-[10px] text-primary mt-1 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">sync</span> 2 nuevas esta semana</p>
              </div>
              <div class="w-12 h-12 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary"><span class="material-symbols-outlined">school</span></div>
            </div>
            <div class="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-on-tertiary-container flex items-center justify-between">
              <div>
                <p class="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Proyectos como Jurado</p>
                <h3 class="font-headline-lg text-headline-lg text-on-tertiary-container">05</h3>
                <p class="text-[10px] text-on-tertiary-container mt-1 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">timer</span> 1 por vencer</p>
              </div>
              <div class="w-12 h-12 rounded-full bg-tertiary-fixed/20 flex items-center justify-center text-on-tertiary-container"><span class="material-symbols-outlined">gavel</span></div>
            </div>
            <div class="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-secondary flex items-center justify-between">
              <div>
                <p class="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Trámites en Revisión</p>
                <h3 class="font-headline-lg text-headline-lg text-secondary">08</h3>
                <p class="text-[10px] text-secondary mt-1 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">pending_actions</span> En proceso</p>
              </div>
              <div class="w-12 h-12 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary"><span class="material-symbols-outlined">history_edu</span></div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Históricas</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-secondary flex items-center justify-between">
              <div>
                <p class="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Tesis Aprobadas</p>
                <h3 class="font-headline-lg text-headline-lg text-secondary">45</h3>
                <p class="text-[10px] text-secondary mt-1 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">verified</span> Acumulado total</p>
              </div>
              <div class="w-12 h-12 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary"><span class="material-symbols-outlined">task_alt</span></div>
            </div>
            <div class="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-primary flex items-center justify-between">
              <div>
                <p class="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Proyectos Aprobados</p>
                <h3 class="font-headline-lg text-headline-lg text-primary">32</h3>
                <p class="text-[10px] text-primary mt-1 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">check_circle</span> Gestión exitosa</p>
              </div>
              <div class="w-12 h-12 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary"><span class="material-symbols-outlined">fact_check</span></div>
            </div>
            <div class="bg-surface-container-lowest p-5 rounded-xl border-l-4 border-outline flex items-center justify-between">
              <div>
                <p class="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Jurados Completados</p>
                <h3 class="font-headline-lg text-headline-lg text-on-surface">118</h3>
                <p class="text-[10px] text-outline mt-1 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">done_all</span> Historial académico</p>
              </div>
              <div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline"><span class="material-symbols-outlined">assignment_turned_in</span></div>
            </div>
          </div>
        </div>
      </div>

      <section class="bg-surface-container-lowest rounded-xl overflow-hidden">
        <div class="p-6 border-b border-outline-variant flex justify-between items-center bg-white">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary">notifications_active</span>
            <h4 class="font-headline-md text-headline-md text-primary">Control de Plazos y Notificaciones</h4>
          </div>
          <div class="flex gap-4">
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-error"></span><span class="text-label-sm text-on-surface-variant">Urgente</span></div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-tertiary"></span><span class="text-label-sm text-on-surface-variant">Próximo</span></div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-secondary"></span><span class="text-label-sm text-on-surface-variant">Al día</span></div>
            <button class="ml-4 text-primary text-label-sm font-bold hover:underline">Marcar todas como leídas</button>
          </div>
        </div>
        <div class="divide-y divide-outline-variant/30">
          <!-- sample notifications omitted for brevity - static UI -->
          <div class="p-6 flex items-start gap-6 group relative border-l-4 border-error">
            <div class="shrink-0 mt-1"><span class="material-symbols-outlined text-error text-[28px]">priority_high</span></div>
            <div class="flex-1 flex justify-between items-center ml-6">
              <div class="space-y-1">
                <h6 class="font-headline-sm text-headline-sm text-on-surface">Revisión Urgente: Tesis Exp. #2024-0042</h6>
                <p class="text-body-md text-on-surface-variant">El plazo para emitir el informe de jurado está por expirar.</p>
                <div class="flex items-center gap-4 mt-3"> <span class="text-label-sm text-on-surface-variant">Juan Pérez</span> <span class="text-label-sm text-on-surface-variant">Hace 45 minutos</span></div>
              </div>
              <div class="flex flex-col items-end gap-3"><span class="bg-error-container text-on-error-container text-[11px] font-bold w-[120px] py-1 rounded-full uppercase tracking-wider text-center">Vence en 2h</span><button class="bg-primary text-on-primary px-4 py-2 rounded-lg text-label-md font-bold opacity-0 group-hover:opacity-100 transition-all">Revisar ahora</button></div>
            </div>
          </div>
        </div>
        <div class="p-4 bg-surface-container-low text-center"><button class="text-primary font-bold text-label-md hover:underline">Ver todo el historial de notificaciones</button></div>
      </section>

    </div>

    <footer class="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-outline-variant text-on-surface-variant gap-4 p-gutter">
      <div class="flex items-center gap-6"><p class="text-label-sm">© 2024 Facultad de Ciencias Económicas</p></div>
      <div class="flex items-center gap-2"><span class="w-2 h-2 bg-secondary rounded-full animate-pulse"></span><p class="text-[10px] font-bold uppercase tracking-widest">Sistema Operativo</p></div>
    </footer>
  </div>
</template>

<style scoped>
.p-gutter { padding: 1.25rem; }
</style>
