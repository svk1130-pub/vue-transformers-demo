<script setup>
/**
 * DetectorView.vue — тонкая обёртка над DemoPage.
 *
 * Отвечает за provide значений, которые связывают демо-вкладку и вкладку
 * «Как это работает»:
 *   - detectedClasses — список классов, найденных на текущем изображении
 *     (используется ChipsSection для подсветки найденных классов)
 *   - pendingSample — URL картинки, выбранный из галереи
 *     (GallerySection вызывает loadSample, который ставит значение и
 *     переключает на демо-вкладку)
 *   - loadSample — функция, которую вызывает GallerySection
 *
 * Саму демо-логику (загрузка модели, drag&drop, canvas) см. в DetectorPanel.
 */
import { provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import DemoPage from '@/components/DemoPage.vue'
import DetectorPanel from '@/components/panels/DetectorPanel.vue'

const router = useRouter()

// Список классов, найденных детектором. Обновляется в DetectorPanel
// после каждого инференса. Читается ChipsSection для подсветки.
const detectedClasses = ref([])

// URL картинки, выбранный из галереи на вкладке «Как это работает».
// Когда GallerySection вызывает loadSample(src), сюда кладётся src;
// DetectorPanel через watch видит изменение, грузит картинку и сбрасывает в null.
const pendingSample = ref(null)

provide('detectedClasses', detectedClasses)
provide('pendingSample', pendingSample)

// Функция, которую вызывает GallerySection при клике на карточку.
// Ставит src в pendingSample и переключает на демо-вкладку.
provide('loadSample', (src) => {
  pendingSample.value = src
  router.replace({ query: { tab: 'demo' } })
})
</script>

<template>
  <DemoPage :demo-component="DetectorPanel" />
</template>