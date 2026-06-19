<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';

// 1. Importamos nuestros nuevos componentes reutilizables
import InputTexto from '../components/InputTexto.vue';
import BotonPrincipal from '../components/BotonPrincipal.vue';

const router = useRouter();

const credenciales = ref({
  correo_electronico: '',
  password: ''
});

const cargando = ref(false);
const mensajeError = ref('');

const iniciarSesion = async () => {
  mensajeError.value = '';
  cargando.value = true;

  try {
    const respuesta = await api.post('/login', credenciales.value);
    const token = respuesta.data.token; 
    
    if (token) {
      localStorage.setItem('token', token);
      console.log('¡Login exitoso! Token guardado.');
      router.push('/panel'); 
    }

  } catch (error) {
    console.error("Error en el login:", error);
    mensajeError.value = error.response?.data?.message || 'Credenciales incorrectas o error de conexión.';
  } finally {
    cargando.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h2>Iniciar Sesión</h2>
      <p class="subtitle">Sistema de Seguimiento de Tesis - FCE</p>

      <form @submit.prevent="iniciarSesion">
        
        <InputTexto 
          label="Correo Electrónico" 
          tipo="email"
          placeholder="usuario@ejemplo.com"
          v-model="credenciales.correo_electronico" 
        />

        <InputTexto 
          label="Contraseña" 
          tipo="password"
          placeholder="********"
          v-model="credenciales.password" 
        />

        <p v-if="mensajeError" class="error-text">{{ mensajeError }}</p>

        <BotonPrincipal 
          texto="Ingresar" 
          textoCargando="Ingresando..."
          :cargando="cargando" 
        />

      </form>
    </div>
  </div>
</template>

<style scoped>
/* Solo conservamos los estilos del contenedor y textos, 
   lo demás ya vive en los componentes */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.login-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

h2 {
  margin-top: 0;
  margin-bottom: 5px;
  color: #333;
}

.subtitle {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.error-text {
  color: #d32f2f;
  font-size: 0.85rem;
  margin-bottom: 10px;
  text-align: left;
}
</style>