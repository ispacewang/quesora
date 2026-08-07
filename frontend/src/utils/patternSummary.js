// src/utils/patternSummary.js — 错题规律：统计错题中反复出现的高频关键词
// 设计：只统计答错的题，答对完全不参与，面板数字稳定不随正确答题变动。
// 每个关键词统计“出现在多少道错题中”，按次数排序，占比 = 次数 ÷ 错题总数。

const DEFAULT_MIN_COUNT = 2 // 关键词至少出现在几道错题中（防小样本噪声）
const MAX_PATTERNS = 12

/**
 * 汇总错题规律
 * @param {Object[]} attempts - 答题流水 [{ questionId, type, correct, kw, ts }]
 * @param {Object} [opts] - { minCount }
 * @returns {{ total:number, patterns:Array<{keyword:string,count:number,pct:number}> }}
 */
export function summarizePatterns(attempts, opts = {}) {
  const minCount = opts.minCount ?? DEFAULT_MIN_COUNT

  const wrong = attempts.filter(a => !a.correct)
  const total = wrong.length
  if (total < 1) return { total, patterns: [] }

  // 每个关键词在错题中出现的次数（同一道错题内去重）
  const stats = new Map()
  const bump = (kw) => {
    if (!kw || typeof kw !== 'string') return
    const k = kw.trim()
    if (k.length < 2) return
    stats.set(k, (stats.get(k) || 0) + 1)
  }
  for (const a of wrong) {
    const seen = new Set()
    for (const k of a.kw || []) {
      if (seen.has(k)) continue
      seen.add(k)
      bump(k)
    }
    // 注意：题型（单选/多选/判断）不计入词云
  }

  const patterns = [...stats.entries()]
    .map(([keyword, count]) => ({ keyword, count, pct: count / total }))
    .filter(p => p.count >= minCount)
    .sort((a, b) => b.count - a.count || b.pct - a.pct)
    .slice(0, MAX_PATTERNS)

  return { total, patterns }
}
