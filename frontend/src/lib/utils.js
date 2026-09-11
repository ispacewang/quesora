import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Fisher-Yates 洗牌：返回 { shuffled, map }
 *   shuffled[i] = 打乱后第 i 个选项（原始内容）
 *   map[i]      = 打乱后第 i 个选项在原始数组中的索引
 *
 * 例：原始 [A选项, B选项, C选项, D选项] 正确答案 "B"
 *     map = [2, 0, 1, 3]
 *     shuffled = [C选项, A选项, B选项, D选项]
 *     用户点第 2 个 → originalLetter = Chr(65+map[2]) = Chr(66) = "B" ✓
 */
export function shuffleOptions(options) {
  if (!options || options.length <= 1) {
    return { shuffled: options || [], map: (options || []).map((_, i) => i) }
  }
  const n = options.length
  const indices = options.map((_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return {
    shuffled: indices.map(i => options[i]),
    map: indices,
  }
}

/**
 * 对题目对象进行选项打乱，附加 _shuffleMap 和 _originalOptions
 * 简答/填空题不处理
 * @param {Object} q - 题目对象 { options, type, ... }
 * @returns {Object} 处理后的题目对象
 */
export function applyShuffle(q) {
  if (!q || !q.options || q.options.length <= 1) return q
  if (q.type === '简答题' || q.type === '填空题' || q.type === '判断题') return q
  // 如果之前打过乱，先还原到原始顺序，避免二次打乱导致映射断裂
  if (q._originalOptions) {
    q.options = [...q._originalOptions]
  }
  const { shuffled, map } = shuffleOptions(q.options)
  q._originalOptions = [...q.options]
  q.options = shuffled
  q._shuffleMap = map
  return q
}

/**
 * 根据显示位置获取原始选项字母
 * @param {Object} q - 题目对象（含 _shuffleMap）
 * @param {number} displayIdx - 显示位置索引
 * @returns {string} 原始字母 (A, B, C, ...)
 */
export function toOriginalLetter(q, displayIdx) {
  if (!q._shuffleMap) return String.fromCharCode(65 + displayIdx)
  return String.fromCharCode(65 + q._shuffleMap[displayIdx])
}

/**
 * 将原始选项字母映射回打乱后的显示字母
 * @param {Object} q - 题目对象（含 _shuffleMap）
 * @param {string|string[]} origAnswer - 原始答案字母
 * @returns {string} 显示字母（如 "B" 或 "A, C"）
 */
export function toDisplayAnswer(q, origAnswer) {
  if (!q._shuffleMap) return Array.isArray(origAnswer) ? origAnswer.join(', ') : (origAnswer || '')
  const arr = typeof origAnswer === 'string'
    ? origAnswer.replace(/,/g, '').split('').filter(Boolean)
    : (Array.isArray(origAnswer) ? origAnswer : [])
  return arr.map(letter => {
    const origIdx = letter.toUpperCase().charCodeAt(0) - 65
    const displayIdx = q._shuffleMap.indexOf(origIdx)
    return displayIdx === -1 ? letter : String.fromCharCode(65 + displayIdx)
  }).join(', ')
}
