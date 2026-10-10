// stores/progress.js
// Pinia-store прогресса изучения «Как это работает».
// Персистируется в localStorage между сессиями.
// Сохраняем только факт посещения страницы и факт прохождения викторины
// (сами ответы пользователя не сохраняем — это намеренное упрощение).

import { defineStore } from 'pinia'

const STORAGE_KEY = 'vue-transformers-progress'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

export const useProgressStore = defineStore('progress', {
  state: () => {
    const saved = load()
    return {
      visited: saved.visited || [],        // ['detector', 'translator']
      quizPassed: saved.quizPassed || [],  // ['detector']
    }
  },
  getters: {
    total: () => 2,
    visitedCount: (s) => s.visited.length,
    percent: (s) => Math.round((s.visited.length / 2) * 100),
    isVisited: (s) => (page) => s.visited.includes(page),
    isQuizPassed: (s) => (page) => s.quizPassed.includes(page),
    isComplete: (s) => s.visited.length === 2 && s.quizPassed.length === 2,
  },
  actions: {
    markVisited(page) {
      if (!this.visited.includes(page)) {
        this.visited.push(page)
        this.persist()
      }
    },
    markQuizPassed(page) {
      if (!this.quizPassed.includes(page)) {
        this.quizPassed.push(page)
        this.persist()
      }
    },
    reset() {
      this.visited = []
      this.quizPassed = []
      this.persist()
    },
    persist() {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          visited: this.visited,
          quizPassed: this.quizPassed,
        })
      )
    },
  },
})