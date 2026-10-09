import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/base.css'

// Точка входа приложения.
// Создаём инстанс Vue, подключаем Pinia (глобальное состояние) и Router.
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
