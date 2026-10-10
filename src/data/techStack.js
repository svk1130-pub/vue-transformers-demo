// src/data/techStack.js
// Единый справочник Vue-технологий, используемых в проекте.
// Сайдбар показывает краткий список (свойство sidebar), страница Хаба — расширенный.

// Краткий список для сайдбара — только ключевые технологии, мелким шрифтом
export const techStackShort = ['Composition API', 'Router', 'Pinia', 'Transition']

// Расширенный список для страницы Хаба — со списком компонентов/композаблов
export const techStackFull = [
  {
    category: 'Ядро Vue 3',
    items: [
      { name: 'Composition API', detail: 'все компоненты на <script setup>' },
      { name: 'Vue Router 4', detail: 'ленивый импорт страниц через () => import(...)' },
      { name: 'Pinia', detail: 'глобальное состояние: текущая модель, ошибки' },
    ],
  },
  {
    category: 'Реактивность',
    items: [
      { name: 'ref / reactive', detail: 'локальное состояние компонентов' },
      { name: 'computed', detail: 'форматирование confidence, автоопределение направления перевода, статус модели' },
      { name: 'watch', detail: 'авто-запуск детекции при загрузке изображения, реактивная подгрузка второй модели переводчика' },
      { name: 'shallowRef', detail: 'инстанс модели (без глубокой реактивности)' },
    ],
  },
  {
    category: 'Анимации',
    items: [
      { name: '<Transition>', detail: 'смена страниц, статусы модели, ошибки, прогресс-бар, canvas-overlay' },
      { name: '<TransitionGroup>', detail: 'staggering карточек хаба, список найденных объектов детектора, предложения переводчика' },
      { name: 'list-move', detail: 'плавное перемещение элементов в TransitionGroup' },
    ],
  },
  {
    category: 'Композаблы и шаблоны',
    items: [
      { name: 'usePipeline', detail: 'единая обёртка над transformers.js' },
      { name: 'template ref', detail: '<canvas> для рисования боксов поверх <img>' },
      { name: 'defineProps / defineEmits', detail: 'типизированный API компонентов' },
    ],
  },
]