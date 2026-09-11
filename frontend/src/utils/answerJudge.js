const ANSWER_PREFIX_RE = /^(?:参考答案|标准答案|答案|答)\s*[:：]\s*/i
const ANSWER_POINT_SEPARATOR_RE = /[，,、；;。.!！?？\n]+/
const ANSWER_ALTERNATIVE_SEPARATOR_RE = /[\/／|｜]/
const STOP_WORDS = new Set([
  '的', '了', '是', '在', '并', '和', '与', '或', '对', '通过', '可以', '能够',
  '需要', '应', '要', '将', '把', '为', '及', '以及', '一个', '进行', '从而',
  '因此', '因为', '所以', '具有', '主要', '相关', '其中', '该', '这', '其',
])

const toText = (value) => String(value ?? '').normalize('NFKC')

export function normalizeAnswerText(value) {
  return toText(value)
    .toLocaleLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，,、；;。.!！?？:："“”‘’'`（）()【】[\]{}<>《》]/g, '')
}

function splitAnswerPoints(value) {
  const points = toText(value)
    .replace(ANSWER_PREFIX_RE, '')
    .trim()
    .split(ANSWER_POINT_SEPARATOR_RE)
    .map(normalizeAnswerText)
    .filter((point) => point.length >= 2)

  return [...new Set(points)]
}

function extractTerms(value) {
  const text = toText(value)
  let terms = []

  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('zh', { granularity: 'word' })
    terms = [...segmenter.segment(text)]
      .filter((part) => part.isWordLike)
      .map((part) => normalizeAnswerText(part.segment))
  } else {
    terms = text.match(/[\p{Script=Han}]{2,}|[a-z0-9]+/giu) || []
    terms = terms.map(normalizeAnswerText)
  }

  return [...new Set(terms)].filter(
    (term) => term.length >= 2 && !STOP_WORDS.has(term),
  )
}

function pointMatches(userText, point) {
  const alternatives = point
    .split(ANSWER_ALTERNATIVE_SEPARATOR_RE)
    .map(normalizeAnswerText)
    .filter(Boolean)

  return alternatives.some((alternative) => {
    if (userText.includes(alternative)) return true

    const terms = extractTerms(alternative)
    if (terms.length < 2) return false

    const matchedTerms = terms.filter((term) => userText.includes(term))
    return matchedTerms.length >= Math.max(2, Math.ceil(terms.length * 0.6))
  })
}

function judgeShortAnswer(userAnswer, standardAnswer) {
  const userText = normalizeAnswerText(userAnswer)
  const standardText = normalizeAnswerText(
    toText(standardAnswer).replace(ANSWER_PREFIX_RE, ''),
  )
  if (!userText || !standardText) return false
  if (userText === standardText) return true

  const points = splitAnswerPoints(standardAnswer)
  if (points.length > 1) {
    const matchedPoints = points.filter((point) => pointMatches(userText, point))
    const requiredPoints = Math.max(2, Math.ceil(points.length * 0.6))
    return matchedPoints.length >= requiredPoints
  }

  const terms = extractTerms(toText(standardAnswer).replace(ANSWER_PREFIX_RE, ''))
  if (terms.length < 2) return userText.includes(standardText)

  const matchedTerms = terms.filter((term) => userText.includes(term))
  return matchedTerms.length >= Math.max(2, Math.ceil(terms.length * 0.6))
}

function normalizeChoiceAnswer(value) {
  const values = Array.isArray(value) ? value : [value]
  return values
    .flatMap((item) => toText(item).replace(/[,，]/g, '').split(''))
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .sort()
}

export function judgeAnswer({ type, standardAnswer, userAnswer }) {
  if (type === '简答题') return judgeShortAnswer(userAnswer, standardAnswer)

  if (type === '多选题') {
    return JSON.stringify(normalizeChoiceAnswer(standardAnswer)) ===
      JSON.stringify(normalizeChoiceAnswer(userAnswer))
  }

  return normalizeAnswerText(standardAnswer) === normalizeAnswerText(userAnswer)
}
