<script setup>
/**
 * HomeView.vue — хаб-страница.
 * Vue-техники:
 *   - <TransitionGroup> для staggering-появления карточек (по одной с задержкой)
 *   - staggering реализован через CSS-переменную --i (data-index) и transition-delay
 *   - computed не нужен — список статический
 */
import DemoCard from '../components/DemoCard.vue'
import { ref } from 'vue'
import { techStackFull } from '../data/techStack'

const demos = ref([
  {
    icon: '◎',
    title: 'Детектор объектов',
    description:
      'Загрузите изображение и нейросеть найдёт объекты на нём. Рисуем bounding box-ы прямо на canvas и показываем подписи классов с уверенностью модели.',
    to: '/detector',
  },
  {
    icon: '⇄',
    title: 'Переводчик',
    description:
      'Перевод между русским и английским с автоопределением направления. Текст разбивается на предложения и переводится инкрементально — результат появляется по одному предложению за раз.',
    to: '/translator',
  },
])
</script>

<template>
  <section class="home">
    <header class="home__header">
      <h1>Демо нейросетей в браузере</h1>
      <p class="home__lead">
        Учебный SPA на Vue 3, демонстрирующий Composition API, Router, Pinia и
        Transition-анимации на «вау-задачах» из машинного обучения. Модели
        работают прямо в браузере через transformers.js — без сервера.
      </p>
    </header>

    <!--
      TransitionGroup со staggering:
      каждому элементу ставим :style="{ '--i': index }".
      В CSS transition-delay: calc(var(--i) * 120ms) даёт каскадное появление.
      name="list" → классы list-enter-active / list-enter-from / list-move.
    -->
    <TransitionGroup tag="div" name="list" class="home__grid" appear>
      <DemoCard
        v-for="(demo, index) in demos"
        :key="demo.to"
        :icon="demo.icon"
        :title="demo.title"
        :description="demo.description"
        :to="demo.to"
        :style="{ '--i': index }"
      />
    </TransitionGroup>

    <section class="home__tech">
      <h2>Технологии Vue 3 в этом проекте:</h2>
      <div class="home__tech-grid">
        <div
          v-for="group in techStackFull"
          :key="group.category"
          class="home__tech-group"
        >
          <h3 class="home__tech-cat">{{ group.category }}</h3>
          <ul class="home__tech-list">
            <li v-for="item in group.items" :key="item.name">
              <code>{{ item.name }}</code>
              <span class="home__tech-detail">{{ item.detail }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.home__header {
  margin-bottom: 36px;
}
.home__header h1 {
  font-size: 32px;
  margin-bottom: 12px;
}
.home__lead {
  font-size: 16px;
  color: var(--color-text-muted);
  max-width: 720px;
}

.home__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 48px;
}

.home__tech {
  padding: 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.home__tech h2 {
  font-size: 18px;
  margin-bottom: 16px;
}

.home__tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.home__tech-group {
  display: flex;
  flex-direction: column;
}

.home__tech-cat {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-primary-dark);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
}

.home__tech-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.home__tech-list li {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.home__tech-list code {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--color-surface-alt);
  padding: 1px 6px;
  border-radius: 4px;
  align-self: flex-start;
  color: var(--color-text);
}
.home__tech-detail {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

/* === TransitionGroup со staggering === */
.list-enter-active {
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  /* Задержка зависит от индекса — каскадное появление */
  transition-delay: calc(var(--i, 0) * 120ms);
}
.list-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.96);
}
.list-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
  position: absolute;
}
.list-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
.list-move {
  transition: transform 0.4s ease;
}
</style>
