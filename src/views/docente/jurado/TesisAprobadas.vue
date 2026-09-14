<template>
  <div class="flex-1 lg:ml-[260px] min-h-screen flex flex-col">
    <header class="flex justify-between items-center h-[70px] px-gutter w-full sticky top-0 z-50 bg-surface-container-lowest border-b border-outline-variant shadow-sm">
      <div class="flex items-center gap-4">
        <button class="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <span class="material-symbols-outlined">menu</span>
        </button>
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
      <div class="flex flex-col md:flex-row items-center gap-6">
        <div class="flex items-center bg-surface-container-lowest px-6 py-4 rounded-full border border-outline-variant shadow-sm transition-shadow focus-within:shadow-md flex-1 md:max-w-[50%]">
          <span class="material-symbols-outlined text-primary mr-3">search</span>
          <input class="bg-transparent border-none focus:ring-0 text-body-md w-full placeholder:text-on-surface-variant/50" placeholder="Buscar" type="text" />
        </div>
        <div class="flex items-center gap-6 px-4">
          <label class="flex items-center gap-2 cursor-pointer group">
            <input class="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 transition-all cursor-pointer" type="checkbox" />
            <span class="text-body-md font-medium text-on-surface-variant group-hover:text-primary transition-colors">Autor</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer group">
            <input class="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 transition-all cursor-pointer" type="checkbox" />
            <span class="text-body-md font-medium text-on-surface-variant group-hover:text-primary transition-colors">Escuela</span>
          </label>
        </div>
      </div>

      <div class="flex items-end justify-between px-2">
        <div>
          <h3 class="font-headline-lg text-headline-lg text-primary">Tesis Aprobadas</h3>
          <p class="text-body-md text-on-surface-variant">Listado de tesis aprobadas por el jurado</p>
        </div>
      </div>

      <div class="space-y-4 pb-12">
        <!-- Static cards based on provided HTML -->
        <div class="group bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-secondary/30 transition-all duration-200">
          <div class="flex flex-col lg:flex-row gap-6">
            <div class="flex-1 space-y-4">
              <a href="#" class="block">
                <h4 class="font-headline-md text-headline-sm text-on-surface leading-snug group-hover:text-secondary transition-colors uppercase">"SISTEMA INFORMÁTICO HELPDESK EN LA CALIDAD DE SERVICIO TI DE LA DIRECCIÓN REGIONAL DE TRANSPORTES Y COMUNICACIONES - TARAPOTO, 2025"</h4>
              </a>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex items-center gap-3 text-on-surface-variant">
                  <span class="material-symbols-outlined text-outline text-[20px]">person</span>
                  <div>
                    <p class="text-label-sm font-bold text-on-surface">CARLOS HUMBERTO GONZALES DELGADO</p>
                    <p class="text-[12px]">chgonzalesd@gmail.com • 992794883</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 text-on-surface-variant">
                  <span class="material-symbols-outlined text-outline text-[20px]">assignment_ind</span>
                  <div>
                    <p class="text-label-sm font-bold text-on-surface">Vocal de Jurado</p>
                    <p class="text-[12px]">Rol designado</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="lg:w-72 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/50 pt-4 lg:pt-0 lg:pl-6 space-y-3">
              <div class="bg-secondary/10 border border-secondary/20 p-4 rounded-xl">
                <div class="flex items-center gap-2 text-secondary mb-2">
                  <span class="material-symbols-outlined text-[20px]">check_circle</span>
                  <span class="text-label-md font-bold uppercase tracking-tight">Tesis Aprobada</span>
                </div>
                <p class="text-[13px] leading-relaxed text-secondary font-medium">Proyecto de Tesis Aprobado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-outline-variant text-on-surface-variant gap-4 p-gutter">
      <div class="flex items-center gap-6"><p class="text-label-sm">© 2024 Facultad de Ciencias Económicas</p>
        <a class="text-label-sm hover:text-primary transition-colors" href="#">Términos y Condiciones</a>
        <a class="text-label-sm hover:text-primary transition-colors" href="#">Soporte Técnico</a>
      </div>
      <div class="flex items-center gap-2"><span class="w-2 h-2 bg-secondary rounded-full animate-pulse"></span><p class="text-[10px] font-bold uppercase tracking-widest">Sistema Operativo</p></div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// UI-only view for jurado -> tesis aprobadas
</script>

<style scoped>
.p-gutter { padding: 1.25rem; }
</style>
