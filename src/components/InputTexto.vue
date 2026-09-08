<script setup lang="ts">
// defineProps recibe las configuraciones visuales del input
defineProps({
  label: { type: String, required: true },
  tipo: { type: String, default: 'text' },
  placeholder: { type: String, default: '' }
});

// defineModel conecta automáticamente el valor con el v-model del padre
const modelo = defineModel();
</script>

<template>
  <div class="input-group">
    <label>{{ label }}</label>
    <input 
      :type="tipo" 
      :placeholder="placeholder" 
      v-model="modelo" 
      required
    />
  </div>
</template>

<style scoped>
.input-group {
  margin-bottom: 15px;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
</style>