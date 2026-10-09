import { defineStore } from 'pinia'

// Глобальное хранилище демо.
// Хранит общее состояние: какая модель сейчас загружена, глобальные ошибки.
// Локальное состояние страниц — в ref/reactive внутри view.
export const useDemoStore = defineStore('demo', {
  state: () => ({
    // Информация о модели, загруженной в данный момент (для отображения в сайдбаре)
    currentModel: null, // { task, name }
    // Глобальная ошибка (если нужна вне страницы)
    globalError: null,
  }),
  actions: {
    setCurrentModel(model) {
      this.currentModel = model
    },
    clearCurrentModel() {
      this.currentModel = null
    },
    setGlobalError(message) {
      this.globalError = message
    },
    clearGlobalError() {
      this.globalError = null
    },
  },
})
