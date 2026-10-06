<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '@/services/api'

type Proyecto = { id_expediente:number; codigo:string; titulo:string; version:number; tesista:string; correo:string|null; celular:string|null; escuela:string|null; responsabilidad:string; estado:string; resolucion:string|null; archivo_resolucion:string|null; fecha:string }
type Respuesta = { docente:{nombre:string;correo:string;celular:string}; total:number; proyectos:Proyecto[] }

const cargando=ref(true); const error=ref(''); const busqueda=ref(''); const proyectos=ref<Proyecto[]>([]); const docente=ref({nombre:'',correo:'',celular:''})
const visibles=computed(()=>{const q=busqueda.value.trim().toLocaleLowerCase('es');return !q?proyectos.value:proyectos.value.filter(p=>`${p.codigo} ${p.titulo} ${p.tesista} ${p.escuela??''} ${p.resolucion??''}`.toLocaleLowerCase('es').includes(q))})
function fecha(valor:string){return new Date(valor).toLocaleDateString('es-PE')}
async function cargar(){cargando.value=true;error.value='';try{const{data}=await api.get<Respuesta>('/docente/asesor/proyectos',{params:{estado:'aprobados'}});proyectos.value=data.proyectos;docente.value=data.docente}catch(e:any){error.value=e.response?.data?.message??'No se pudieron cargar los proyectos aprobados.'}finally{cargando.value=false}}
onMounted(cargar)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <header class="flex justify-between items-center h-[70px] px-gutter sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant shadow-sm"><h2 class="font-headline-sm text-primary">Docente — Asesoría</h2><div class="text-right hidden sm:block"><p class="font-headline-sm text-primary"><span class="font-medium">Bienvenido</span> {{docente.nombre}}</p><p class="text-label-md text-on-surface-variant">{{docente.correo}}<span v-if="docente.celular"> · {{docente.celular}}</span></p></div></header>
    <main class="p-gutter lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
      <div class="flex items-center bg-surface-container-lowest px-6 py-4 rounded-full border border-outline-variant shadow-sm max-w-2xl"><span class="material-symbols-outlined text-secondary mr-3">search</span><input v-model="busqueda" class="bg-transparent border-none focus:ring-0 outline-none w-full" placeholder="Buscar proyecto, expediente, tesista o resolución"></div>
      <div class="flex items-end justify-between px-2"><div><h3 class="font-headline-lg text-headline-lg text-primary">Proyectos Aprobados</h3><p class="text-on-surface-variant">Historial de proyectos aprobados asesorados por el docente</p></div><span class="text-sm text-on-surface-variant">{{visibles.length}} resultado(s)</span></div>
      <div v-if="cargando" class="py-16 text-center text-on-surface-variant">Cargando historial...</div>
      <div v-else-if="error" class="rounded-xl bg-error-container p-4 text-error">{{error}} <button class="font-bold underline" @click="cargar">Reintentar</button></div>
      <div v-else-if="!visibles.length" class="rounded-2xl bg-surface-container-lowest border border-outline-variant p-10 text-center text-on-surface-variant">No tiene proyectos aprobados como asesor.</div>
      <div v-else class="space-y-4 pb-12">
        <article v-for="item in visibles" :key="item.id_expediente" class="group bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm hover:shadow-md"><div class="flex flex-col lg:flex-row gap-6"><div class="flex-1 space-y-4"><RouterLink :to="{name:'docente-asesor-proyectos-detalle-aprobada',params:{id:item.id_expediente}}"><h4 class="font-headline-md text-headline-sm text-on-surface group-hover:text-secondary uppercase">{{item.titulo}}</h4><p class="text-xs text-secondary mt-1">{{item.codigo}}</p></RouterLink><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="flex gap-3"><span class="material-symbols-outlined text-outline">person</span><div><p class="text-label-sm font-bold">{{item.tesista}}</p><p class="text-xs text-on-surface-variant">{{item.correo??'Sin correo'}}<span v-if="item.celular"> · {{item.celular}}</span></p></div></div><div class="flex gap-3"><span class="material-symbols-outlined text-outline">school</span><div><p class="text-label-sm font-bold">{{item.responsabilidad}}</p><p class="text-xs text-on-surface-variant">{{item.escuela??'Escuela no registrada'}}</p></div></div></div><div class="flex items-center gap-2 pt-2 border-t border-outline-variant/30"><span class="material-symbols-outlined text-secondary text-[18px]">description</span><span class="text-xs">Resolución: <strong>{{item.resolucion??'Pendiente de emisión'}}</strong></span></div></div><div class="lg:w-72 lg:border-l border-outline-variant/50 lg:pl-6"><div class="bg-secondary/10 border border-secondary/20 p-4 rounded-xl"><div class="flex items-center gap-2 text-secondary mb-2"><span class="material-symbols-outlined">verified</span><span class="text-xs font-bold uppercase">Proyecto aprobado</span></div><p class="text-sm text-secondary font-medium">{{item.estado}}</p><p class="text-xs text-on-surface-variant mt-2">Versión {{item.version}} · {{fecha(item.fecha)}}</p><RouterLink :to="{name:'docente-asesor-proyectos-detalle-aprobada',params:{id:item.id_expediente}}" class="mt-4 flex justify-center border border-secondary text-secondary px-4 py-2 rounded-lg font-bold">Ver detalle</RouterLink></div></div></div></article>
      </div>
    </main>
  </div>
</template>
