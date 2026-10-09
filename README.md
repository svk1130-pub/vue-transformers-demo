# Vue 3 + transformers.js — учебное SPA-демо

SPA на Vue 3, демонстрирующее Composition API, Vue Router, Pinia и
Transition-анимации на «вау-задачах» из машинного обучения. Модели работают
прямо в браузере через [transformers.js](https://github.com/huggingface/transformers.js)
— без сервера.

## Демо

1. **Детектор объектов** (`Xenova/detr-resnet-50`) — загрузите изображение,
   нейросеть найдёт объекты и нарисует bounding box-ы прямо на canvas.
2. **Переводчик** (`Xenova/opus-mt-ru-en` / `opus-mt-en-ru`) — перевод
   RU ↔ EN с автоопределением направления и инкрементальным стримингом
   по предложениям.

## Запуск

```bash
# 1. Установить зависимости
npm install

# 2. Скачать модели (384 МБ) и WASM-файлы (требуется один раз)
npm run setup

# 3. Запустить dev-сервер
npm run dev
# → http://localhost:5173
```

## Сборка

```bash
npm run build      # production-сборка в dist/
npm run preview    # локальный preview production-сборки
```

## Важно про transformers.js v3 + Vite

В `transformers.js` v3.x есть три неочевидных нюанса, которые учтены в `usePipeline.js`:

1. **`env.allowLocalModels = true`** — по умолчанию в браузере `false`. Без этой
   настройки библиотека игнорирует локальные файлы и пытается грузить с HF Hub,
   но `allowRemoteModels = false` → загрузка падает.
2. **`dtype`** — по умолчанию `'q8'` (квантованные модели, суффикс `_quantized`
   в имени файла). Для `detr-resnet-50` мы передаём `dtype: 'fp32'`, потому что
   скачан `onnx/model.onnx` (без квантования). Для `opus-mt-*` используем `'q8'`.
3. **WASM-файлы в `src/wasm/`** — `onnxruntime-web` v1.21+ грузит WASM через
   динамический `import()` `.mjs`-обёртки. Если `.mjs` лежит в `public/`, Vite
   ломает импорт query-параметром `?import`. Поэтому `.mjs` + `.wasm` лежат в
   `src/wasm/` и резолвятся через `new URL('../wasm/...', import.meta.url)`.
   Скрипт `npm run setup` копирует их туда автоматически.

## Стек

| Слой | Технология |
|------|------------|
| Сборка | Vite 6 |
| Фреймворк | Vue 3.5 (Composition API, `<script setup>`) |
| Роутинг | Vue Router 4 (ленивый импорт страниц) |
| Состояние | Pinia |
| Стили | чистый CSS (без UI-фреймворков) |
| ML | `@huggingface/transformers` (transformers.js) |
| Язык | JavaScript (без TypeScript) |

## Структура

```
src/
  main.js                    # точка входа
  App.vue                    # каркас: сайдбар + RouterView + Transition
  router/index.js            # lazy-routes
  stores/demoStore.js        # Pinia: текущая модель, ошибки
  composables/usePipeline.js # обёртка над transformers.js
  components/
    AppSidebar.vue           # навигация
    DemoCard.vue             # карточка демо на хабе
    ModelStatus.vue           # индикатор статуса модели
    ProgressBar.vue          # прогресс загрузки
    ErrorBanner.vue          # баннер ошибки
  views/
    HomeView.vue             # хаб
    DetectorView.vue         # детектор объектов
    TranslatorView.vue       # переводчик
  wasm/                      # генерируется через `npm run setup` (simd-threaded .mjs + .wasm)
  assets/styles/base.css     # глобальные стили + CSS-переменные
public/
  favicon.svg
  samples/                   # примеры изображений
  models/                    # генерируется через `npm run setup`
scripts/
  download-models.js         # `npm run setup` (модели + WASM)
  download_samples.py        # утилита скачивания примеров
```

## Vue-техники, демонстрируемые в коде

- **Composition API** — все компоненты на `<script setup>`
- **Vue Router 4** — ленивый импорт через `() => import(...)`
- **Pinia** — глобальное состояние текущей модели
- **`<Transition>`** — смена страниц, статусы, ошибки, прогресс, canvas-overlay
- **`<TransitionGroup>`** — staggering карточек хаба, список объектов детектора,
  предложения переводчика
- **`watch` + `computed`** — авто-детекция при загрузке изображения, форматирование
  confidence, автоопределение направления перевода
- **template ref** — `<canvas>` для рисования боксов поверх `<img>`

Все обращения к transformers.js идут только через composable `usePipeline` —
никаких прямых вызовов `pipeline()` в компонентах.
