<script setup>
/**
 * HowItWorksPanel.vue — контейнер вкладки «Как это работает».
 *
 * Vue-техники:
 *   - computed от route.name — определяет, какой контент показывать
 *   - объект componentByType — маппинг type → компонент для динамического рендера
 *   - <component :is> по типу секции — рендеринг разных секций одним механизмом
 *   - <TransitionGroup> для появления секций (staggering)
 *   - markVisited() в Pinia-store прогресса при первом открытии
 *
 * Логика работы:
 *   1. При монтировании вычисляется route.name ('detector' | 'translator')
 *   2. По нему выбирается массив секций из content/detector.js или content/translator.js
 *   3. Каждая секция рендерится соответствующим компонентом из componentByType
 *   4. Прогресс отмечается через progress.markVisited(route.name)
 */
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { detectorHowItWorks } from '@/content/detector'
import { translatorHowItWorks } from '@/content/translator'
import { useProgressStore } from '@/stores/progress'

import TextSection from './sections/TextSection.vue'
import ListSection from './sections/ListSection.vue'
import ChipsSection from './sections/ChipsSection.vue'
import GallerySection from './sections/GallerySection.vue'
import ExamplesSection from './sections/ExamplesSection.vue'
import QuizSection from './sections/QuizSection.vue'

const route = useRoute()
const progress = useProgressStore()

// Маппинг типа секции → компонент. markRaw не нужен — компоненты используются как
// значения, а не как реактивные данные.
const componentByType = {
  text: TextSection,
  list: ListSection,
  chips: ChipsSection,
  gallery: GallerySection,
  examples: ExamplesSection,
  quiz: QuizSection,
}

// Выбор контента в зависимости от текущего маршрута
const sections = computed(() => {
  if (route.name === 'detector') return detectorHowItWorks
  if (route.name === 'translator') return translatorHowItWorks
  return []
})

// Отмечаем посещение страницы для прогресса изучения
onMounted(() => {
  if (route.name === 'detector' || route.name === 'translator') {
    progress.markVisited(route.name)
  }
})
</script>

<template>
  <article class="how-it-works">
    <TransitionGroup name="list" tag="div" class="how-it-works__sections" appear>
      <component
        v-for="(section, index) in sections"
        :key="section.id"
        :is="componentByType[section.type]"
        :section="section"
        :style="{ '--i': index }"
      />
    </TransitionGroup>
  </article>
</template>

<style scoped>
.how-it-works__sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 800px;
}

/* Staggering секций */
.list-enter-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(var(--i, 0) * 100ms);
}
.list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.list-leave-active {
  transition: opacity 0.3s ease;
  position: absolute;
}
.list-leave-to {
  opacity: 0;
}
.list-move {
  transition: transform 0.4s ease;
}
</style>