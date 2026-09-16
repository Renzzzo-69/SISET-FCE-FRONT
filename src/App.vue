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
