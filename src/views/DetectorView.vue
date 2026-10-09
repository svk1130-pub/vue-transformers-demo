<script setup>
/**
 * DetectorView.vue — детектор объектов.
 * Модель: Xenova/detr-resnet-50 (через usePipeline, task='object-detection').
 *
 * Vue-техники:
 *   - usePipeline — единая обёртка над transformers.js (никаких прямых pipeline() вызовов)
 *   - watch на выбранное изображение → авто-запуск детекции
 *   - computed для форматирования confidence (в процентах)
 *   - <Transition> для появления canvas и списка объектов
 *   - <TransitionGroup> для списка найденных объектов (по одному с задержкой)
 *   - template ref на <canvas> для рисования боксов
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { usePipeline } from '../composables/usePipeline'
import { useDemoStore } from '../stores/demoStore'
import ModelStatus from '../components/ModelStatus.vue'
import ProgressBar from '../components/ProgressBar.vue'
import ErrorBanner from '../components/ErrorBanner.vue'

const MODEL_TASK = 'object-detection'
const MODEL_NAME = 'Xenova/detr-resnet-50'

const demoStore = useDemoStore()

// Палитра цветов для боксов разных классов (циклически)
const BOX_COLORS = [
  '#42b883', '#3b82f6', '#f5a623', '#e5484d',
  '#a855f7', '#06b6d4', '#ec4899', '#84cc16',
]

// Компонент-обёртка над transformers.js
// ★ dtype: 'fp32' — у нас скачан onnx/model.onnx (FP32, 166 МБ).
//   Если бы использовали dtype: 'q8' (default), библиотека искала бы
//   onnx/model_quantized.onnx, которого нет.
const { instance, loading, progress, error, load } = usePipeline(
  MODEL_TASK,
  MODEL_NAME,
  { dtype: 'fp32' },
)

// --- Состояние страницы (локальное, через ref) ---
const imageUrl = ref(null) // выбранный URL изображения (object URL или путь к sample)
const imageEl = ref(null) // template ref на <img>
const canvasEl = ref(null) // template ref на <canvas>
const detections = ref([]) // найденные объекты [{ label, score, box }]
const inferencing = ref(false) // идёт ли инференс
const pageError = ref(null) // локальная ошибка страницы

// Статус модели — computed, зависящий от state composable'а
const status = computed(() => {
  if (error.value) return 'error'
  if (loading.value) return 'loading'
  if (instance.value) return 'ready'
  return 'idle'
})

// confidence в процентах для каждого детекта (computed-маппинг)
const formattedDetections = computed(() =>
  detections.value.map((d, i) => ({
    ...d,
    scorePct: (d.score * 100).toFixed(1),
    color: BOX_COLORS[i % BOX_COLORS.length],
  })),
)

// Цвет бокса по индексу детекта
function colorForIndex(i) {
  return BOX_COLORS[i % BOX_COLORS.length]
}

// --- Загрузка модели при монтировании страницы ---
onMounted(async () => {
  demoStore.setCurrentModel({ task: MODEL_TASK, name: MODEL_NAME })
  await load()
})

onBeforeUnmount(() => {
  // Освобождаем object URL, если он был создан из файла
  if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageUrl.value)
  }
  demoStore.clearCurrentModel()
})

// --- Обработка выбора файла (file input) ---
function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  loadImageFromBlob(file)
}

// --- Drag & drop ---
function onDrop(e) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    loadImageFromBlob(file)
  }
}
function onDragOver(e) {
  e.preventDefault()
}

function loadImageFromBlob(file) {
  // Отзываем старый object URL, чтобы не копить
  if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageUrl.value)
  }
  imageUrl.value = URL.createObjectURL(file)
  detections.value = [] // сброс результатов
}

// --- Пример из public/samples/ ---
function loadSample(name) {
  if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageUrl.value)
  }
  imageUrl.value = `/samples/${name}`
  detections.value = []
}

// --- Авто-запуск детекции при загрузке изображения ---
// watch на imageUrl + на instance (когда модель станет готовой, повторим запуск)
watch(
  [imageUrl, instance],
  async ([url, model]) => {
    if (!url || !model) return
    await runDetection()
  },
)

// --- Основная логика: детекция + отрисовка на canvas ---
async function runDetection() {
  if (!instance.value || !imageUrl.value) return
  inferencing.value = true
  pageError.value = null
  try {
    // transformers.js object-detection принимает URL или HTMLImageElement
    const output = await instance.value(imageUrl.value)
    // output — массив объектов: { label, score, box: { xmin, ymin, xmax, ymax } }
    detections.value = Array.isArray(output) ? output : [output]
    // Ждём отрисовку DOM <img>, затем рисуем canvas
    await nextTick()
    drawBoxes()
  } catch (e) {
    console.error(e)
    pageError.value = 'Произошла ошибка при обработке. Попробуйте ещё раз.'
  } finally {
    inferencing.value = false
  }
}

// --- Рисование боксов на canvas поверх <img> ---
function drawBoxes() {
  const img = imageEl.value
  const canvas = canvasEl.value
  if (!img || !canvas || !img.naturalWidth) return

  // Размер canvas = натуральному размеру изображения
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')

  detections.value.forEach((d, i) => {
    const color = colorForIndex(i)
    const { xmin, ymin, xmax, ymax } = d.box
    const w = xmax - xmin
    const h = ymax - ymin

    // Прямоугольник
    ctx.lineWidth = Math.max(2, img.naturalWidth / 400)
    ctx.strokeStyle = color
    ctx.strokeRect(xmin, ymin, w, h)

    // Подпись: "label 95%"
    const label = `${d.label} ${(d.score * 100).toFixed(0)}%`
    ctx.font = `${Math.max(14, img.naturalWidth / 50)}px ${getComputedStyle(document.body).fontFamily}`
    const textW = ctx.measureText(label).width
    const padX = 6, padY = 4
    const fontH = Math.max(14, img.naturalWidth / 50)

    // Фон подписи
    ctx.fillStyle = color
    ctx.fillRect(xmin, ymin - fontH - padY * 2, textW + padX * 2, fontH + padY * 2)

    // Текст подписи
    ctx.fillStyle = '#fff'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, xmin + padX, ymin - (fontH + padY * 2) / 2)
  })
}
</script>

<template>
  <div class="detector">
    <header class="detector__header">
      <h1>Детектор объектов</h1>
      <p class="detector__lead">
        Модель <code>Xenova/detr-resnet-50</code> находит объекты на изображении
        и возвращает bounding box-ы с подписями классов и оценкой уверенности.
      </p>
    </header>

    <!-- Баннер глобальной ошибки (загрузка модели) -->
    <ErrorBanner
      v-if="error"
      :message="'Не удалось загрузить модель. Проверьте подключение к интернету или наличие файлов в public/ (запустите npm run setup).'"
      @dismiss="() => {}"
    />
    <!-- Локальная ошибка инференса -->
    <ErrorBanner v-if="pageError" :message="pageError" @dismiss="pageError = null" />

    <!-- Панель статуса + прогресс загрузки -->
    <div class="detector__status-bar">
      <ModelStatus :status="status" />
      <!-- Прогресс-бар появляется только во время загрузки -->
      <Transition name="fade">
        <div v-if="loading" class="detector__progress">
          <ProgressBar :value="progress" />
        </div>
      </Transition>
    </div>

    <!-- Зона загрузки изображения (drag&drop + file input) -->
    <div
      class="detector__dropzone"
      :class="{ dragging: false }"
      @drop="onDrop"
      @dragover="onDragOver"
    >
      <p class="detector__dropzone-hint">Перетащите изображение сюда или выберите файл</p>
      <div class="detector__dropzone-actions">
        <label class="detector__btn">
          Выбрать файл
          <input type="file" accept="image/*" hidden @change="onFileChange" />
        </label>
        <button class="detector__btn detector__btn--ghost" @click="loadSample('cat.jpg')">
          Пример: кот
        </button>
        <button class="detector__btn detector__btn--ghost" @click="loadSample('street.jpg')">
          Пример: улица
        </button>
        <button class="detector__btn detector__btn--ghost" @click="loadSample('dog.jpg')">
          Пример: собака
        </button>
      </div>
    </div>

    <!-- Превью изображения + canvas-overlay -->
    <Transition name="fade">
      <div v-if="imageUrl" class="detector__canvas-wrap">
        <div class="detector__canvas-inner">
          <img ref="imageEl" :src="imageUrl" alt="Загруженное изображение" class="detector__img" />
          <!-- Canvas поверх изображения; Transition появление -->
          <Transition name="fade">
            <canvas v-if="detections.length" ref="canvasEl" class="detector__overlay"></canvas>
          </Transition>
        </div>
        <p v-if="inferencing" class="detector__inferring">Идёт детекция…</p>
      </div>
    </Transition>

    <!-- Список найденных объектов: TransitionGroup, элементы появляются по одному -->
    <section class="detector__results">
      <h2 v-if="formattedDetections.length">Найденные объекты</h2>
      <TransitionGroup name="list" tag="ul" class="detector__list">
        <li
          v-for="(d, index) in formattedDetections"
          :key="d.label + '-' + index"
          class="detector__item"
          :style="{ '--color': d.color, '--i': index }"
        >
          <span class="detector__item-dot"></span>
          <span class="detector__item-label">{{ d.label }}</span>
          <span class="detector__item-score">{{ d.scorePct }}%</span>
        </li>
      </TransitionGroup>
    </section>
  </div>
</template>

<style scoped>
.detector__header {
  margin-bottom: 24px;
}
.detector__header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}
.detector__lead {
  color: var(--color-text-muted);
  max-width: 720px;
}
.detector__lead code {
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--color-surface-alt);
  padding: 1px 6px;
  border-radius: 4px;
}

.detector__status-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.detector__progress {
  flex: 1;
  min-width: 240px;
  max-width: 500px;
}

.detector__dropzone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 32px 24px;
  text-align: center;
  background: var(--color-surface);
  margin-bottom: 24px;
  transition: border-color 0.2s ease;
}
.detector__dropzone:hover {
  border-color: var(--color-primary);
}
.detector__dropzone-hint {
  color: var(--color-text-muted);
  margin-bottom: 16px;
}
.detector__dropzone-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.detector__btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 18px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.15s ease;
}
.detector__btn:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}
.detector__btn--ghost {
  background: var(--color-surface-alt);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
.detector__btn--ghost:hover {
  background: var(--color-surface);
  border-color: var(--color-primary);
}

.detector__canvas-wrap {
  margin-bottom: 24px;
}
.detector__canvas-inner {
  position: relative;
  display: inline-block;
  max-width: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}
.detector__img {
  display: block;
  max-width: 100%;
  height: auto;
}
.detector__overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.detector__inferring {
  margin-top: 8px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.detector__results h2 {
  font-size: 18px;
  margin-bottom: 14px;
}
.detector__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
  list-style: none;
}
.detector__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.detector__item-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color);
  flex-shrink: 0;
}
.detector__item-label {
  flex: 1;
  font-weight: 500;
  font-size: 14px;
  text-transform: capitalize;
}
.detector__item-score {
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  color: var(--color-text-muted);
  font-weight: 600;
}

/* === Анимации === */

/* Fade — для canvas, прогресс-бара, превью */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* TransitionGroup для списка найденных объектов: появление по одному */
.list-enter-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(var(--i, 0) * 90ms);
}
.list-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.list-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
  position: absolute;
}
.list-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
.list-move {
  transition: transform 0.4s ease;
}
</style>
