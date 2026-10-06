import { ref } from 'vue'

const THEME_KEY = 'siset-theme'
const oscuro = ref(false)

function aplicarTema(valor: boolean) {
  oscuro.value = valor
  document.documentElement.classList.toggle('dark', valor)
  document.documentElement.style.colorScheme = valor ? 'dark' : 'light'
}

export function inicializarTema() {
  const guardado = localStorage.getItem(THEME_KEY)
  const preferenciaSistema = window.matchMedia('(prefers-color-scheme: dark)').matches
  aplicarTema(guardado ? guardado === 'dark' : preferenciaSistema)
}

export function useTheme() {
  function cambiarTema(valor: boolean) {
    aplicarTema(valor)
    localStorage.setItem(THEME_KEY, valor ? 'dark' : 'light')
  }

  return { oscuro, cambiarTema }
}
