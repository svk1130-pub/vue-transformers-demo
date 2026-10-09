<script setup>
/**
 * App.vue — корневой компонент.
 * Каркас: сайдбар + основная область с <RouterView>.
 * Vue-техники:
 *   - <Transition> для смены страниц (через v-slot у RouterView)
 *   - <Transition> для появления сайдбара
 */
import AppSidebar from './components/AppSidebar.vue'
</script>

<template>
  <div class="app-shell">
    <!-- Сайдбар появляется с анимацией через Transition -->
    <Transition name="slide" appear>
      <AppSidebar />
    </Transition>

    <main class="app-main">
      <!--
        v-slot="{ Component }" достаёт текущий компонент маршрута.
        <Transition mode="out-in"> обеспечивает плавную смену страниц:
        старая страница уходит, затем входит новая.
        key по route.path, чтобы Transition срабатывал при смене страниц.
      -->
      <RouterView v-slot="{ Component, route }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  min-width: 0;
  padding: 32px 40px 64px;
  max-width: var(--content-max);
}

/* Сайдбар выезжает слева */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
}
.slide-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* Плавная смена страниц */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
