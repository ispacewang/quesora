import { toOriginalLetter } from '../lib/utils.js'

export function getOptionLetters(question) {
  return (question?.options || []).map((_, index) =>
    toOriginalLetter(question, index),
  )
}

/**
 * 多选题的全选切换：按当前显示顺序返回原始答案字母，避免选项打乱后判题映射断裂。
 */
export function toggleAllOptions(question, selectedAnswer) {
  const letters = getOptionLetters(question)
  const selected = new Set(Array.isArray(selectedAnswer) ? selectedAnswer : [])
  const allSelected = letters.length > 0 && letters.every((letter) => selected.has(letter))
  return allSelected ? [] : letters
}
