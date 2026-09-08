<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

watch(
  () => auth.autenticado,
  (autenticado) => {
    if (!autenticado && router.currentRoute.value.meta.requiereAutenticacion) {
      router.replace({ name: 'login' })
    }
  },
)
</script>

<template>
  <RouterView />
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: #1f2937;
  font-family: Arial, sans-serif;
  background: #f4f7f6;
}

button,
input {
  font: inherit;
}
</style>
