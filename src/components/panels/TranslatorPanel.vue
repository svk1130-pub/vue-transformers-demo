<script setup>
/**
 * TranslatorPanel.vue — демо-логика переводчика.
 * Вынесена из TranslatorView.vue, чтобы TranslatorView стал тонкой обёрткой
 * с provide для связи со вкладкой «Как это работает».
 *
 * Vue-техники:
 *   - два usePipeline (ru_en, en_ru), оба грузятся параллельно при монтировании
 *   - inject('pendingText') — текст, выбранный из примеров
 *   - watch на pendingText → подстановка в textarea
 *   - watch на inputText → сброс результатов при очистке
 *   - computed: effectiveDirection, currentPipeline, status, charCount
 *   - автоопределение направления по кириллице
 *   - <TransitionGroup> для предложений (staggering)
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, inject, nextTick } from 'vue'
import { usePipeline } from '@/composables/usePipeline'
import { useDemoStore } from '@/stores/demoStore'
import ModelStatus from '@/components/ModelStatus.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import ErrorBanner from '@/components/ErrorBanner.vue'

const MAX_CHARS = 500

const MODELS = {
  ru_en: { task: 'translation', model: 'Xenova/opus-mt-ru-en', label: 'RU → EN' },
  en_ru: { task: 'translation', model: 'Xenova/opus-mt-en-ru', label: 'EN → RU' },
}

const demoStore = useDemoStore()

const ruEn = usePipeline(MODELS.ru_en.task, MODELS.ru_en.model, { dtype: 'q8' })
const enRu = usePipeline(MODELS.en_ru.task, MODELS.en_ru.model, { dtype: 'q8' })

// ★ inject из TranslatorView
const pendingText = inject('pendingText', ref(null))

// --- Состояние ---
const inputText = ref('')
const direction = ref('auto')
const manualOverride = ref(false)
const translating = ref(false)
const translatedSentences = ref([])
const pageError = ref(null)

// --- Автоопределение направления ---
function detectDirection(text) {
  if (/[а-яёА-ЯЁ]/.test(text)) return 'ru_en'
  return 'en_ru'
}

const effectiveDirection = computed(() => {
  if (manualOverride.value) return direction.value
  return detectDirection(inputText.value)
})

const currentPipeline = computed(() =>
  effectiveDirection.value === 'ru_en' ? ruEn : enRu,
)

const directionLabel = computed(() => MODELS[effectiveDirection.value].label)

const status = computed(() => {
  const p = currentPipeline.value
  if (p.error.value) return 'error'
  if (p.loading.value) return 'loading'
  if (p.instance.value) return 'ready'
  return 'idle'
})

const currentProgress = computed(() => currentPipeline.value.progress.value)
const currentLoading = computed(() => currentPipeline.value.loading.value)
const currentError = computed(() => currentPipeline.value.error.value)

const charCount = computed(() => inputText.value.length)
const charCountClass = computed(() => {
  if (charCount.value > MAX_CHARS) return 'over'
  if (charCount.value > MAX_CHARS * 0.9) return 'warn'
  return ''
})

// --- Swap ---
function swapDirection() {
  manualOverride.value = true
  direction.value = effectiveDirection.value === 'ru_en' ? 'en_ru' : 'ru_en'
  if (inputText.value.trim()) {
    translate()
  }
}

// --- Разбиение на предложения ---
function splitIntoSentences(text) {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// --- Перевод с инкрементальным стримингом ---
async function translate() {
  const text = inputText.value.trim()
  if (!text) {
    translatedSentences.value = []
    return
  }
  if (charCount.value > MAX_CHARS) return

  const pipe = currentPipeline.value
  if (!pipe.instance.value) await pipe.load()
  if (!pipe.instance.value) return

  translating.value = true
  pageError.value = null
  translatedSentences.value = []

  try {
    const sentences = splitIntoSentences(text)
    for (const sentence of sentences) {
      const output = await pipe.instance.value(sentence)
      let target
      if (Array.isArray(output)) {
        target = output[0]?.translation_text ?? output[0] ?? ''
      } else if (typeof output === 'string') {
        target = output
      } else {
        target = output.translation_text ?? ''
      }
      translatedSentences.value.push({ source: sentence, target })
    }
  } catch (e) {
    console.error(e)
    pageError.value = 'Произошла ошибка при обработке. Попробуйте ещё раз.'
  } finally {
    translating.value = false
  }
}

// --- Жизненный цикл ---
onMounted(async () => {
  demoStore.setCurrentModel({
    task: MODELS.ru_en.task,
    name: MODELS.ru_en.model,
  })
  // ★ Грузим обе модели параллельно, чтобы индикатор сразу был согласован
  // с сайдбаром (см. фикс бага 3 из предыдущей итерации).
  await Promise.all([ruEn.load(), enRu.load()])
})

watch(effectiveDirection, (dir) => {
  demoStore.setCurrentModel({ task: MODELS[dir].task, name: MODELS[dir].model })
})

onBeforeUnmount(() => {
  demoStore.clearCurrentModel()
})

// --- Сброс результатов при очистке ---
watch(inputText, (val) => {
  if (!val.trim()) {
    translatedSentences.value = []
  }
})

// --- Реакция на выбор примера из «Как это работает» ---
// ★ Сбрасываем ручное переопределение, чтобы автоопределение снова заработало.
//   Старый перевод очищаем сразу — даже до запуска translate(),
//   чтобы пользователь не видел «зависший» результат от предыдущего текста.
//   Перевод запускаем автоматически (не ждём кнопки «Перевести»),
//   но с yield, чтобы Vue успел отрендерить очищенный output.
watch(pendingText, async (text) => {
  if (text) {
    inputText.value = text
    manualOverride.value = false
    translatedSentences.value = []  // ★ Очищаем старый перевод сразу
    pendingText.value = null
    // Даём Vue отрендерить очищенный output ДО запуска translate()
    await nextTick()
    // Автоматически запускаем перевод — пользователь нажимать «Перевести» не должен
    translate()
  }
})
</script>

<template>
  <div class="translator">
    <header class="translator__header">
      <h1>Переводчик</h1>
      <p class="translator__lead">
        Перевод между русским и английским прямо в браузере. Текст
        разбивается на предложения и переводится инкрементально — результат
        появляется по одному предложению за раз.
      </p>
    </header>

    <ErrorBanner
      v-if="currentError"
      :message="'Не удалось загрузить модель. Проверьте подключение к интернету или наличие файлов в public/ (запустите npm run setup).'"
      @dismiss="() => {}"
    />
    <ErrorBanner v-if="pageError" :message="pageError" @dismiss="pageError = null" />

    <div class="translator__status-bar">
      <ModelStatus :status="status" />
      <Transition name="fade">
        <div v-if="currentLoading" class="translator__progress">
          <ProgressBar :value="currentProgress" />
        </div>
      </Transition>
    </div>

    <div class="translator__controls">
      <div class="translator__dir">
        <span class="translator__dir-chip">{{ directionLabel }}</span>
        <span v-if="!manualOverride" class="translator__dir-hint">(авто)</span>
        <span v-else class="translator__dir-hint">(вручную)</span>
      </div>
      <button class="translator__swap" @click="swapDirection" title="Поменять направление">
        ⇄
      </button>
    </div>

    <div class="translator__grid">
      <div class="translator__col">
        <label class="translator__label" for="tr-input">Исходный текст</label>
        <textarea
          id="tr-input"
          v-model="inputText"
          class="translator__textarea"
          :maxlength="MAX_CHARS + 50"
          placeholder="Введите текст для перевода…"
          rows="8"
        ></textarea>
        <div class="translator__footer">
          <span class="translator__count" :class="charCountClass">
            {{ charCount }} / {{ MAX_CHARS }}
          </span>
          <button
            class="translator__btn"
            :disabled="!inputText.trim() || translating || charCount > MAX_CHARS"
            @click="translate"
          >
            {{ translating ? 'Перевод…' : 'Перевести' }}
          </button>
        </div>
      </div>

      <div class="translator__col">
        <label class="translator__label">Перевод</label>
        <div class="translator__output">
          <TransitionGroup name="list" tag="div" class="translator__sentences">
            <div
              v-for="(s, index) in translatedSentences"
              :key="index"
              class="translator__sentence"
              :style="{ '--i': index }"
            >
              {{ s.target }}
            </div>
          </TransitionGroup>
          <p v-if="!translatedSentences.length && !translating" class="translator__placeholder">
            Здесь появится перевод…
          </p>
          <p v-if="translating" class="translator__typing">Переводим по предложениям…</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.translator__header { margin-bottom: 24px; }
.translator__header h1 { font-size: 28px; margin-bottom: 8px; }
.translator__lead { color: var(--color-text-muted); max-width: 720px; }

.translator__status-bar {
  display: flex; align-items: center; gap: 24px;
  flex-wrap: wrap; margin-bottom: 20px;
}
.translator__progress { flex: 1; min-width: 240px; max-width: 500px; }

.translator__controls {
  display: flex; align-items: center; gap: 16px; margin-bottom: 16px;
}
.translator__dir { display: flex; align-items: center; gap: 8px; }
.translator__dir-chip {
  padding: 6px 14px; background: var(--color-primary-soft);
  color: var(--color-primary-dark); border-radius: 999px;
  font-weight: 600; font-size: 14px;
}
.translator__dir-hint { font-size: 12px; color: var(--color-text-muted); }
.translator__swap {
  width: 38px; height: 38px; border-radius: 50%;
  border: 1px solid var(--color-border); background: var(--color-surface);
  font-size: 18px; color: var(--color-text);
  display: grid; place-items: center;
  transition: transform 0.4s ease, background-color 0.2s ease;
}
.translator__swap:hover {
  transform: rotate(180deg);
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}

.translator__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.translator__col { display: flex; flex-direction: column; }
.translator__label {
  font-size: 13px; font-weight: 600;
  color: var(--color-text-muted); margin-bottom: 8px;
}
.translator__textarea {
  width: 100%; resize: vertical; padding: 14px 16px;
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  font-family: inherit; font-size: 15px; line-height: 1.5;
  color: var(--color-text); background: var(--color-surface);
  transition: border-color 0.2s ease;
}
.translator__textarea:focus {
  outline: none; border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-soft);
}
.translator__footer {
  display: flex; align-items: center; justify-content: space-between; margin-top: 8px;
}
.translator__count {
  font-size: 12px; color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.translator__count.warn { color: var(--color-warning); }
.translator__count.over { color: var(--color-danger); font-weight: 600; }
.translator__btn {
  padding: 10px 22px; background: var(--color-primary); color: #fff;
  border: none; border-radius: var(--radius-md);
  font-size: 14px; font-weight: 600;
  transition: background-color 0.2s ease, transform 0.15s ease;
}
.translator__btn:hover:not(:disabled) {
  background: var(--color-primary-dark); transform: translateY(-1px);
}
.translator__btn:disabled { opacity: 0.5; cursor: not-allowed; }

.translator__output {
  min-height: 200px; padding: 14px 16px;
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-surface); font-size: 15px; line-height: 1.6;
}
.translator__placeholder { color: var(--color-text-muted); }
.translator__typing { color: var(--color-text-muted); font-size: 14px; }
.translator__sentences { display: flex; flex-direction: column; gap: 8px; }
.translator__sentence { position: relative; }

/* === Анимации === */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.list-enter-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(var(--i, 0) * 80ms);
}
.list-enter-from { opacity: 0; transform: translateX(24px); }
.list-move { transition: transform 0.4s ease; }
</style>