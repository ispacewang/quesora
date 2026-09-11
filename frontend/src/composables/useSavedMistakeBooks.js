// composables/useSavedMistakeBooks.js — 保存的错题本快照
import { ref, computed } from 'vue'

const STORAGE_KEY = 'saved-mistake-books'
const MAX_RECORDS = 20

const records = ref(loadRecords())

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveRecords(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECORDS)))
}

export function useSavedMistakeBooks() {
  const sorted = computed(() =>
    [...records.value].sort((a, b) => b.id - a.id)
  )

  function saveMistakeBookSnapshot(data) {
    const questions = (data.questions || []).map(item => ({
      ...item.questionData,
      note: item.questionData?.note || '',
    }))
    const record = {
      id: Date.now(),
      date: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      title: data.title || '错题本',
      count: questions.length,
      questions,
    }
    records.value = [record, ...records.value].slice(0, MAX_RECORDS)
    saveRecords(records.value)
    return record
  }

  function removeMistakeBook(id) {
    records.value = records.value.filter(r => r.id !== id)
    saveRecords(records.value)
  }

  function clearAll() {
    records.value = []
    saveRecords([])
  }

  return {
    records,
    sorted,
    saveMistakeBookSnapshot,
    removeMistakeBook,
    clearAll,
  }
}
