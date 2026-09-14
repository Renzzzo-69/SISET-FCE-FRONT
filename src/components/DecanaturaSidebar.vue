<script setup lang="ts">
// Sidebar simple y reutilizable para las vistas de Decanatura
</script>

<template>
  <aside class="fixed left-0 top-0 h-screen w-sidebar-width bg-sidebar-bg flex flex-col p-gutter border-r border-outline-variant/20 z-50" role="navigation" aria-label="Menú Decanatura">
    <div class="flex items-center gap-3 mb-10">
      <img alt="FCE Logo" class="w-10 h-10 object-contain rounded" src="/fce-logo.png" />
      <div class="flex flex-col">
        <span class="font-headline-lg text-headline-lg font-bold text-on-primary">SISET-FCE</span>
        <span class="font-label-md text-label-md text-on-primary-container">Sistema de de seguiiento de Tesis</span>
      </div>
    </div>

    <nav class="flex-grow space-y-1">
      <div class="font-nav-caps text-nav-caps text-on-primary-container mb-2 uppercase">Menú Principal</div>
      <router-link class="bg-primary-container text-on-primary-fixed rounded-xl flex items-center gap-3 px-4 py-3 transition-colors" :to="{ name: 'decanatura' }">
        <span class="material-symbols-outlined">dashboard</span>
        <span class="font-label-md text-label-md">Principal</span>
      </router-link>
      <router-link class="text-primary-fixed/70 hover:text-primary-fixed hover:bg-primary-container/50 flex items-center gap-3 px-4 py-3 transition-colors rounded-xl" :to="{ name: 'decanatura-documentos' }">
        <span class="material-symbols-outlined">description</span>
        <span class="font-label-md text-label-md">Formatos Oficiales</span>
      </router-link>
      <router-link class="text-primary-fixed/70 hover:text-primary-fixed hover:bg-primary-container/50 flex items-center gap-3 px-4 py-3 transition-colors rounded-xl" :to="{ name: 'decanatura-asignacion' }">
        <span class="material-symbols-outlined">assignment_ind</span>
        <span class="font-label-md text-label-md">Asignación de Jurados</span>
      </router-link>
      <router-link class="text-primary-fixed/70 hover:text-primary-fixed hover:bg-primary-container/50 flex items-center gap-3 px-4 py-3 transition-colors rounded-xl" :to="{ name: 'decanatura-subir-resolucion' }">
        <span class="material-symbols-outlined">gavel</span>
        <span class="font-label-md text-label-md">Resoluciones</span>
      </router-link>
      <router-link class="text-primary-fixed/70 hover:text-primary-fixed hover:bg-primary-container/50 flex items-center gap-3 px-4 py-3 transition-colors rounded-xl" :to="{ name: 'decanatura-notificaciones' }">
        <span class="material-symbols-outlined">settings</span>
        <span class="font-label-md text-label-md">Configuración</span>
      </router-link>
    </nav>

    <div class="mt-auto pt-6 space-y-1">
      <button class="w-full mt-4 bg-secondary-container text-on-secondary-container font-label-md text-label-md py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all">
        <span class="material-symbols-outlined">logout</span>
        Cerrar Sesión
      </button>
    </div>
  </aside>
</template>

<style scoped>
.deca-sidebar{
  width:260px;
  background:#fff;
  border-radius:12px;
  padding:16px;
  box-shadow:0 1px 2px rgba(16,24,40,0.04);
  height:100%;
}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.brand-logo{width:44px;height:44px;object-fit:contain;border-radius:6px}
.brand-title{font-weight:700;color:#0f2359}
.deca-sidebar ul{list-style:none;padding:0;margin:8px 0 0 0}
.deca-sidebar li{margin:6px 0}
.deca-sidebar a{color:#24324a;text-decoration:none;padding:8px 10px;display:block;border-radius:8px}
.deca-sidebar a.router-link-active{background:#eef4ff;color:#0f2359;font-weight:700}
@media (max-width:900px){
  .deca-sidebar{width:100%;display:flex;gap:12px;overflow:auto}
  .deca-sidebar ul{display:flex;gap:8px}
  .deca-sidebar li{margin:0}
}
</style>
