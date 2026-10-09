import { ref, shallowRef } from 'vue'
import { pipeline, env } from '@huggingface/transformers'

/* ==========================================================================
   usePipeline — единая точка входа для работы с transformers.js.
   Никаких прямых вызовов pipeline() в компонентах — только через этот composable.

   Конфигурация путей:
   - env.localModelPath: модели лежат в public/models/ → доступны по /models/
   - env.allowLocalModels = true: РАЗРЕШАЕМ локальную загрузку (по умолчанию false в браузере!)
   - env.allowRemoteModels = false: используем только локальные файлы
     (требуется предварительный запуск `npm run setup`)
   - env.backends.onnx.wasm.wasmPaths: пути к WASM-файлам ONNX Runtime Web

   ВАЖНО про wasmPaths и .mjs-файл:
   onnxruntime-web v1.21+ грузит WASM через динамический import() .mjs-обёртки.
   Если .mjs лежит в public/, Vite ломает динамический import query-параметром ?import.
   Решение: кладём .mjs и .wasm в src/wasm/, импортируем через import.meta.url.
   Vite корректно резолвит new URL('./wasm/...', import.meta.url) и даёт статический
   URL для fetch + import() без перехвата.

   ВАЖНО про dtype:
   transformers.js v3 по умолчанию использует dtype='q8' (квантованные модели)
   с суффиксом `_quantized` в имени файла. Для каждой модели нужно явно указать dtype,
   соответствующий скачанным файлам:
   - Xenova/detr-resnet-50: 'fp32'  → onnx/model.onnx (без суффикса)
   - Xenova/opus-mt-ru-en:  'q8'    → onnx/encoder_model_quantized.onnx
                              + onnx/decoder_model_merged_quantized.onnx
   ========================================================================== */

// ── Глобальная конфигурация env (один раз при импорте модуля) ──
env.useBrowserCache = true
env.allowLocalModels = true     // ★ КЛЮЧЕВОЕ: по умолчанию false в браузере!
env.allowRemoteModels = false    // работаем строго офлайн
env.localModelPath = '/models/'

// ★ Решение проблемы с .mjs-импортом в Vite:
// Кладём .mjs и .wasm в src/wasm/ и получаем статический URL через import.meta.url.
// Vite корректно резолвит эти файлы и не добавляет ?import query к динамическому import().
const wasmMjsUrl = new URL('../wasm/ort-wasm-simd-threaded.mjs', import.meta.url).href
const wasmWasmUrl = new URL('../wasm/ort-wasm-simd-threaded.wasm', import.meta.url).href
env.backends.onnx.wasm.wasmPaths = {
  mjs: wasmMjsUrl,
  wasm: wasmWasmUrl,
}

/**
 * @param {string} task  — задача transformers.js ('object-detection', 'translation', ...)
 * @param {string} model — идентификатор модели ('Xenova/detr-resnet-50', ...)
 * @param {Object} [options]
 * @param {string} [options.dtype] — 'fp32' | 'q8' | 'q4' | 'fp16' | ... (по умолчанию 'q8')
 */
export function usePipeline(task, model, options = {}) {
  // shallowRef — чтобы не делать глубокую реактивность тяжёлого инстанса модели
  const instance = shallowRef(null)
  const loading = ref(false)
  const progress = ref(0)
  const error = ref(null)

  /**
   * Загрузка модели. progress_callback обновляет progress.value (0–100).
   * Объекты прогресса от HF имеют вид { status, progress, file, loaded, total, ... }.
   * Поддерживаемые статусы: 'progress', 'download', 'done', 'ready', 'error'.
   */
  async function load() {
    if (instance.value) return instance.value
    loading.value = true
    error.value = null
    progress.value = 0

    const pipelineOpts = {
      progress_callback: (p) => {
        // Логируем все события в консоль — помогает отладке
        if (p.status === 'progress' && typeof p.progress === 'number') {
          progress.value = Math.round(p.progress)
          console.log(`[usePipeline:${model}] ${p.file || ''} ${p.progress.toFixed(1)}%`)
        } else if (p.status === 'done') {
          console.log(`[usePipeline:${model}] ✓ ${p.file || 'готово'}`)
        } else if (p.status === 'ready') {
          console.log(`[usePipeline:${model}] Модель готова`)
        } else if (p.status === 'error') {
          console.error(`[usePipeline:${model}] Ошибка в callback:`, p)
        } else {
          console.log(`[usePipeline:${model}] ${p.status}:`, p.file || '')
        }
      },
    }

    // Явно указываем dtype, если передан (важно для совпадения с именами файлов)
    if (options.dtype) {
      pipelineOpts.dtype = options.dtype
    }

    try {
      instance.value = await pipeline(task, model, pipelineOpts)
    } catch (e) {
      error.value = e
      console.error(`[usePipeline:${model}] Ошибка загрузки модели:`, e)
      console.error('  task:', task)
      console.error('  model:', model)
      console.error('  dtype:', options.dtype || '(default q8)')
      console.error('  localModelPath:', env.localModelPath)
      console.error('  allowLocalModels:', env.allowLocalModels)
      console.error('  allowRemoteModels:', env.allowRemoteModels)
      console.error('  wasmPaths:', env.backends.onnx.wasm.wasmPaths)
    } finally {
      loading.value = false
    }
    return instance.value
  }

  /**
   * Освобождение ресурсов модели (если поддерживается).
   */
  function dispose() {
    if (instance.value && typeof instance.value.dispose === 'function') {
      instance.value.dispose()
    }
    instance.value = null
    progress.value = 0
    error.value = null
  }

  return { instance, loading, progress, error, load, dispose }
}
