// src/utils/answerLog.js — 答题流水：记录每次答题对错，供“错题规律”统计
import { ref } from 'vue'
import { computeKeywords } from './keywords'

const STORAGE_KEY = 'quesora-answer-log-v2' // v2：关键词只保留名词（旧 v1 数据含动词/形容词，作废重计）
const MAX_LOG = 1000

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}
function persist(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch { /* 存储满/禁用时静默忽略 */ }
}

const entries = ref(load())

/**
 * 记录一次答题结果（对错 + 关键词）
 * @param {Object} e - { questionId, bank, type, correct, meta, kw }
 * @returns {Object} 生成的流水条目
 */
export function logAnswer({ questionId, bank, type, correct, meta, kw }) {
  const entry = {
    questionId,
    bank,
    type,
    correct: !!correct,
    meta: meta || {},
    kw: kw || [],
    ts: Date.now(),
  }
  entries.value = [...entries.value, entry].slice(-MAX_LOG)
  persist(entries.value)
  return entry
}

/** 读取答题流水（响应式 ref） */
export function useAnswerLog() {
  return entries
}

/**
 * 把考试历史记录转换成答题流水条目（每条考试记录已含每题对错）
 * 关键词在合并时从题目+答案实时提取
 * @param {Object[]} records - useExamHistory 的 sorted 记录
 * @returns {Object[]} 流水条目数组
 */
export function examHistoryToAttempts(records) {
  const out = []
  for (const r of records || []) {
    const wrong = new Set(r.wrongSet || [])
    for (let i = 0; i < (r.questions || []).length; i++) {
      const q = r.questions[i]
      // 正确答案字母：答错从 wrongDetails 取，答对 = 用户所选。
      // Exam.vue 存答案时已用 toOriginalLetter 还原为原始字母，无需再转换
      const answerLetter = wrong.has(i)
        ? (r.wrongDetails?.[i]?.answer || '')
        : (r.answers?.[i] || '')
      out.push({
        questionId: q.id ?? q.questionId,
        bank: r.bankName,
        type: q.type,
        correct: !wrong.has(i),
        meta: q.meta || {},
        kw: computeKeywords(q, answerLetter),
        ts: r.id,
      })
    }
  }
  return out
}
