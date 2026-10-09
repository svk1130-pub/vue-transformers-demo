import { ref, shallowRef } from 'vue'
import { pipeline, env } from '@huggingface/transformers'

/* ==========================================================================
   usePipeline — единая точка входа для работы с transformers.js.
   Никаких прямых вызовов pipeline() в компонентах — только через этот composable.

   Конфигурация путей:
   - env.localModelPath: модели лежат в public/models/ → доступны по /models/
   - env.allowRemoteModels = false: используем только локальные файлы
     (требуется предварительный запуск `npm run setup`)
   - env.backends.onnx.wasm.wasmPaths: WASM-файлы в public/wasm/ → /wasm/
   ========================================================================== */

env.useBrowserCache = true
env.localModelPath = '/models/'
env.allowRemoteModels = false
env.backends.onnx.wasm.wasmPaths = '/wasm/'

/**
 * @param {string} task  — задача transformers.js ('object-detection', 'translation', ...)
 * @param {string} model — идентификатор модели ('Xenova/detr-resnet-50', ...)
 */
export function usePipeline(task, model) {
  // shallowRef — чтобы не делать глубокую реактивность тяжёлого инстанса модели
  const instance = shallowRef(null)
  const loading = ref(false)
  const progress = ref(0)
  const error = ref(null)

  /**
   * Загрузка модели. progress_callback обновляет progress.value (0–100).
   * Объекты прогресса от HF имеют вид { status, progress, ... }.
   * Нас интересует только status === 'progress'.
   */
  async function load() {
    if (instance.value) return instance.value
    loading.value = true
    error.value = null
    progress.value = 0
    try {
      instance.value = await pipeline(task, model, {
        progress_callback: (p) => {
          if (p.status === 'progress' && typeof p.progress === 'number') {
            progress.value = Math.round(p.progress)
          }
        },
      })
    } catch (e) {
      error.value = e
      console.error('[usePipeline] Ошибка загрузки модели:', e)
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
