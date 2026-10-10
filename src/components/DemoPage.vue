<script setup>
/**
 * DemoPage.vue — обёртка с двумя вкладками: «Демо» и «Как это работает».
 *
 * Vue-техники:
 *   - useRoute/useRouter — читаем query.tab, меняем через router.replace
 *   - computed от route.query — определение активной вкладки
 *   - defineAsyncComponent — ленивая загрузка «Как это работает»
 *   - markRaw — компоненты в объекте tabs не должны быть реактивными
 *   - <Transition mode="out-in"> — плавная смена вкладок
 *   - <KeepAlive> — сохраняет состояние демо (модель, картинка, текст)
 *
 * Использование:
 *   <DemoPage :demo-component="DetectorPanel" />
 *   <DemoPage :demo-component="TranslatorPanel" />
 */
import { computed, markRaw, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  demoComponent: { type: Object, required: true },
})

const route = useRoute()
const router = useRouter()

// Ленивая загрузка панели «Как это работает» — грузится только когда
// пользователь первый раз переключается на эту вкладку.
const HowItWorksPanel = defineAsyncComponent(
  () => import('./HowItWorksPanel.vue'),
)

// Объект вкладок. markRaw — иначе Vue делает компоненты реактивными,
// что может привести к лишним перерисовкам и предупреждениям в консоли.
const tabs = {
  demo: markRaw(props.demoComponent),
  how: markRaw(HowItWorksPanel),
}

// Активная вкладка: 'how' если query.tab === 'how', иначе 'demo'.
// Любое другое значение → fallback на 'demo'.
const active = computed(() => (route.query.tab === 'how' ? 'how' : 'demo'))

function switchTab(key) {
  // Для 'demo' очищаем query, для 'how' — ставим ?tab=how.
  // Используем replace, чтобы не засорять history.
  router.replace({ query: key === 'demo' ? {} : { tab: key } })
}
</script>

<template>
  <div class="demo-page">
    <div class="demo-page__tabs">
      <button
        type="button"
        class="demo-page__tab"
        :class="{ active: active === 'demo' }"
        @click="switchTab('demo')"
      >
        Демо
      </button>
      <button
        type="button"
        class="demo-page__tab"
        :class="{ active: active === 'how' }"
        @click="switchTab('how')"
      >
        Как это работает
      </button>
    </div>

    <!--
      ★ Убрали mode="out-in" — теперь leave и enter происходят одновременно,
      DetectorPanel появляется в DOM мгновенно (с opacity 0), и watch на
      pendingSample корректно триггерит отрисовку спиннера.
      Обёртка demo-page__content с position: relative + absolute children
      нужна, чтобы старая и новая вкладки не накладывались по layout
      во время Transition.
    -->
    <div class="demo-page__content">
      <Transition name="fade">
        <KeepAlive>
          <component :is="tabs[active]" />
        </KeepAlive>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
  .demo-page__tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 24px;
  }
  .demo-page__tab {
    padding: 10px 18px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color 0.2s ease, border-color 0.2s ease;
    margin-bottom: -1px;
  }
  .demo-page__tab:hover {
    color: var(--color-text);
  }
  .demo-page__tab.active {
    color: var(--color-primary-dark);
    border-bottom-color: var(--color-primary);
  }

  /* ★ Обёртка с position: relative + absolute children — чтобы во время
    Transition старая и новая вкладки не накладывались по layout. */
  .demo-page__content {
    position: relative;
  }
  .demo-page__content > :deep(*) {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }

  /* Fade для смены вкладок (без mode="out-in" — одновременно) */
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.25s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>