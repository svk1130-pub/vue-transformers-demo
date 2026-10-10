<script setup>
/**
 * TranslatorView.vue — тонкая обёртка над DemoPage.
 *
 * Provide:
 *   - pendingText — текст, выбранный из примеров на вкладке «Как это работает»
 *   - loadExample — функция, вызывается ExamplesSection при клике на карточку
 *
 * Саму демо-логику (загрузка моделей, swap, перевод) см. в TranslatorPanel.
 */
import { provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import DemoPage from '@/components/DemoPage.vue'
import TranslatorPanel from '@/components/panels/TranslatorPanel.vue'

const router = useRouter()

const pendingText = ref(null)

provide('pendingText', pendingText)

// ExamplesSection вызывает loadExample(text) при клике.
// Ставим текст в pendingText и переключаем на демо-вкладку.
// TranslatorPanel через watch видит изменение, подставляет в textarea и сбрасывает.
provide('loadExample', (text) => {
  pendingText.value = text
  router.replace({ query: { tab: 'demo' } })
})
</script>

<template>
  <DemoPage :demo-component="TranslatorPanel" />
</template>