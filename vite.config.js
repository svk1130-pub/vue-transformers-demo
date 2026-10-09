import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Конфигурация Vite для Vue 3 SPA
// optimizeDeps исключён — transformers.js использует Web Worker/WASM и должен
// загружаться динамически, без пред-бандлинга Vite.
export default defineConfig({
  plugins: [vue()],
  // Ограничиваем сканер зависимостей только index.html,
  // чтобы Vite не пытался обработать файлы из skills/ и прочих соседних директорий.
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    port: 5173,
    open: false,
    // Заголовки для корректной работы WASM с SharedArrayBuffer
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    port: 4173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    // Увеличиваем лимит для инлайн-ассетов
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Разделяем transformers.js в отдельный чанк — он тяжёлый
        manualChunks: {
          transformers: ['@huggingface/transformers'],
        },
      },
    },
  },
})
