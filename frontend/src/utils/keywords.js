// src/utils/keywords.js — 中文关键词提取：从题干与答案文本中切词，供“错题规律”统计
import { Segment, useDefault, cnPOSTag } from 'segmentit'

let segment = null
function getSegment() {
  if (!segment) segment = useDefault(new Segment())
  return segment
}

// 只保留名词类词性（名词/专名/地名/人名/机构名/简称），过滤动词、形容词等
const isNounPos = (pos) =>
  pos.includes('名词') ||
  pos.includes('专名') ||
  pos.includes('地名') ||
  pos.includes('人名') ||
  pos.includes('机构名') ||
  pos.includes('简称')

// 停用词：题干/答案里的功能性词汇与题型噪音
const STOPWORDS = new Set([
  '正确', '错误', '应当', '必须', '不得', '可以', '应该', '需要', '进行', '相关', '有关',
  '下列', '以下', '上述', '情况', '内容', '部分', '规定', '要求', '按照', '根据', '依据',
  '其中', '以及', '对于', '关于', '通过', '或者', '等等', '如下', '属于', '包括', '是指',
  '说法', '正确性', '描述', '表述', '问题', '下列各项', '之一', '之一项', '一项', '各项',
  '以及', '其', '之', '时', '后', '前', '中', '上', '下', '内', '外', '等', '并', '而',
  '但', '为', '以', '对', '从', '向', '被', '把', '由', '于', '和', '与', '或', '及',
  '的', '了', '是', '在', '有', '不', '没', '要', '会', '能', '将', '已', '还', '再',
  '又', '很', '最', '更', '都', '只', '才', '就', '也', '这个', '那个', '这些', '那些',
  '习近平',
])

/**
 * 从文本中提取关键词（去重）
 * @param {string[]} texts - 文本数组（题干、答案等）
 * @returns {string[]} 关键词数组
 */
export function extractKeywords(texts) {
  const seg = getSegment()
  const out = new Set()
  for (const t of texts) {
    if (!t) continue
    const tokens = seg.doSegment(String(t))
    for (const tok of tokens) {
      const w = tok.w
      if (typeof w !== 'string' || w.length < 2 || w.length > 14) continue
      if (!/[\u4e00-\u9fa5A-Za-z]/.test(w)) continue
      const pos = cnPOSTag(tok.p) || ''
      if (!isNounPos(pos)) continue
      const key = w.toLowerCase()
      if (STOPWORDS.has(key)) continue
      out.add(key)
    }
  }
  return [...out]
}

/**
 * 取某道题某个原始字母对应的选项文本（去掉 "A-"/"A." 前缀）
 * @param {Object} q - 题目对象（可含 _originalOptions/_shuffleMap）
 * @param {string} origAnswer - 原始顺序的答案字母，如 "B"
 * @returns {string} 选项文本
 */
export function answerOptionText(q, origAnswer) {
  if (!q || !q.options || !origAnswer) return ''
  const origIdx = String(origAnswer).toUpperCase().charCodeAt(0) - 65
  if (origIdx < 0) return ''
  const opts = q._originalOptions || q.options
  const opt = opts[origIdx]
  if (opt == null) return ''
  const text = typeof opt === 'string' ? opt : (opt.text ?? '')
  return String(text).replace(/^[A-Za-z]\s*[.、)）：:．（）—–\-]\s*/, '')
}

/**
 * 计算一道题的关键词：题干 + 正确答案选项文本
 * @param {Object} q - 题目对象
 * @param {string} origAnswer - 原始顺序的正确答案字母
 * @returns {string[]} 关键词数组
 */
export function computeKeywords(q, origAnswer) {
  return extractKeywords([q?.question, answerOptionText(q, origAnswer)])
}
