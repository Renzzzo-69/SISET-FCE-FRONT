<script setup lang="ts">
defineProps({
  texto: { type: String, required: true },
  textoCargando: { type: String, default: 'Cargando...' },
  cargando: { type: Boolean, default: false }
});
</script>

<template>
  <button :disabled="cargando" type="submit">
    {{ cargando ? textoCargando : texto }}
  </button>
</template>

<style scoped>
button {
  width: 100%;
  padding: 10px;
  background-color: #534caf;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 10px;
}

button:disabled {
  background-color: #9ccc9c;
  cursor: not-allowed;
}
</style>