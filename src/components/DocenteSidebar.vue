<template>
  <aside class="hidden lg:flex flex-col h-full w-[260px] fixed left-0 top-0 bg-primary shadow-2xl z-50">
      <div class="p-6 border-b border-white/10 bg-black/10">
          <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center overflow-hidden p-1.5 shrink-0">
                  <img alt="Institutional Logo" class="w-full h-full object-contain" :src="logoSrc">
              </div>
              <div class="overflow-hidden">
                  <h1 class="font-headline-sm text-base font-bold text-white tracking-wide truncate">SISET-FCE</h1>
                  <p class="text-[11px] text-white/60 font-medium truncate">Sistema de Seguimiento</p>
              </div>
          </div>
      </div>

      <nav class="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div class="space-y-1.5">
              <p class="text-[10px] font-bold text-white/40 uppercase tracking-widest px-3">Navegación</p>
              <router-link class="px-3 py-2.5 flex items-center gap-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-150 group" :to="{ name: 'docente-dashboard' }">
                  <span class="material-symbols-outlined text-xl text-white/50 group-hover:text-[#6ff5dc] transition-colors">home</span>
                  <span class="text-sm font-medium tracking-wide">Inicio Principal</span>
              </router-link>
          </div>

          <div class="space-y-4">
              <p class="text-[10px] font-bold text-white/40 uppercase tracking-widest px-3">Módulo Docente</p>
              
              <div class="bg-black/15 border border-white/5 rounded-2xl p-2 space-y-1">
                  <div class="px-3 py-2 flex items-center gap-3 text-white rounded-xl bg-white/10 shadow-sm">
                      <span class="material-symbols-outlined text-xl text-[#6ff5dc]">gavel</span>
                      <span class="text-sm font-semibold tracking-wide">Jurado</span>
                  </div>
                  
                  <div class="pt-2 space-y-3 pl-2">
                      <div class="px-2">
                          <span class="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Tesis</span>
                          <div class="space-y-1 border-l-2 border-white/15 pl-3 ml-1">
                              <router-link class="block text-[13px] text-white font-bold py-1 hover:translate-x-0.5 transition-transform" :to="{ name: 'docente-jurado-tesis-revision' }">Tesis en revisión</router-link>
                              <router-link class="block text-[13px] text-white/60 hover:text-white py-1 hover:translate-x-0.5 transition-transform" :to="{ name: 'docente-jurado-tesis-aprobadas' }">Tesis Aprobadas</router-link>
                          </div>
                      </div>
                      <div class="px-2">
                          <span class="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Proyectos</span>
                          <div class="space-y-1 border-l-2 border-white/15 pl-3 ml-1">
                              <router-link class="block text-[13px] text-white/60 hover:text-white py-1 hover:translate-x-0.5 transition-transform" :to="{ name: 'docente-jurado-proyectos-revision' }">Proyectos en revisión</router-link>
                              <router-link class="block text-[13px] text-white/60 hover:text-white py-1 hover:translate-x-0.5 transition-transform" :to="{ name: 'docente-jurado-proyectos-aprobados' }">Proyectos aprobados</router-link>
                          </div>
                      </div>
                  </div>
              </div>

              <div class="bg-black/15 border border-white/5 rounded-2xl p-2 space-y-1">
                  <div class="px-3 py-2 flex items-center gap-3 text-white/70 hover:text-white transition-colors">
                      <span class="material-symbols-outlined text-xl text-white/40">school</span>
                      <span class="text-sm font-medium tracking-wide">Asesor</span>
                  </div>
                  
                  <div class="pt-2 space-y-3 pl-2">
                      <div class="px-2">
                          <span class="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Asesor de Proyectos</span>
                          <div class="space-y-1 border-l-2 border-white/15 pl-3 ml-1">
                              <router-link class="block text-[13px] text-white/60 hover:text-white py-1 hover:translate-x-0.5 transition-transform" :to="{ name: 'docente-asesor-proyectos-revision' }">Proyectos en revisión</router-link>
                              <router-link class="block text-[13px] text-white/60 hover:text-white py-1 hover:translate-x-0.5 transition-transform" :to="{ name: 'docente-asesor-proyectos-aprobados' }">Proyectos aprobados</router-link>
                          </div>
                      </div>
                      <div class="px-2">
                          <span class="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">Asesor de Tesis</span>
                          <div class="space-y-1 border-l-2 border-white/15 pl-3 ml-1">
                              <router-link class="block text-[13px] text-white/60 hover:text-white py-1 hover:translate-x-0.5 transition-transform" :to="{ name: 'docente-asesor-tesis-revision' }">Tesis en revisión</router-link>
                              <router-link class="block text-[13px] text-white/60 hover:text-white py-1 hover:translate-x-0.5 transition-transform" :to="{ name: 'docente-asesor-tesis-aprobadas' }">Tesis aprobadas</router-link>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          <div>
             <router-link class="px-3 py-2.5 flex items-center gap-3 text-white bg-white/10 rounded-xl transition-all duration-150 font-semibold group" :to="{ name: 'docente-reportes' }">
                  <span class="material-symbols-outlined text-xl text-[#6ff5dc]">bar_chart</span>
                  <span class="text-sm tracking-wide">Reportes </span>
              </router-link>
          </div>
          <div class="pt-4 border-t border-white/10 space-y-1.5">
              <p class="text-[10px] font-bold text-white/40 uppercase tracking-widest px-3">General</p>
              <router-link class="px-3 py-2.5 flex items-center gap-3 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all group" to="/perfil">
                  <span class="material-symbols-outlined text-xl text-white/40 group-hover:text-white transition-colors">settings</span>
                  <span class="text-sm font-medium">Configuración</span>
              </router-link>
          </div>
      </nav>

      <div class="p-4 border-t border-white/10 bg-black/10">
          <button class="w-full bg-white/10 hover:bg-[#ba1a1a]/20 text-white hover:text-[#ffdad6] py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-150">
              <span class="material-symbols-outlined text-lg">logout</span>
              <span>Cerrar Sesión</span>
          </button>
      </div>
  </aside>
</template>

<script setup lang="ts">
const logoSrc = 'https://lh3.googleusercontent.com/aida/ADBb0ugNA3MZcI-5IoN1VZGgyIZjzCrqMdzxkUR5cr3_jvyhWXYL-CUB8Uqo2dQSPO6VK2fuBmG0G_sPxnDVSpiYiIKXM_4DmmCW5lO0zGCJz4hiyHWjTu3DPXqf9zW8PuDD7M3oJHeJ_BasoPp9i7OQ3esMzXYU8pXjekMFl7s7v2A8VtJ11V_Rw_9gHRN0cPjj8DvIH9n6AggZUaE7RJxaD3VRbtgiekHpdJNnaazT21GghUTfuxcYsWOwGlQHEw1eMwc0a4MKdR-jAyM'
</script>

<style scoped>
.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
</style>
