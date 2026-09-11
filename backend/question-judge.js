/**
 * 题目答案判定逻辑。
 *
 * 选择题使用标准化后的字母集合精确比对；简答题不要求逐字一致，
 * 而是将标准答案拆成要点，再按要点覆盖率判定，避免导入题库后只能
 * 依赖完全相同的字符串才能答对。
 */

const ANSWER_PREFIX_RE = /^(?:参考答案|标准答案|答案|答)\s*[:：]\s*/i;
const ANSWER_POINT_SEPARATOR_RE = /[，,、；;。.!！?？\n]+/;
const ANSWER_ALTERNATIVE_SEPARATOR_RE = /[\/／|｜]/;

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '并', '和', '与', '或', '对', '通过', '可以', '能够',
  '需要', '应', '要', '将', '把', '为', '及', '以及', '一个', '进行', '从而',
  '因此', '因为', '所以', '具有', '主要', '相关', '其中', '该', '这', '其',
]);

function toText(value) {
  return String(value ?? '').normalize('NFKC');
}

/**
 * 归一化自由文本：忽略大小写、空白和常见标点，但保留文字/数字/公式字符。
 */
function normalizeText(value) {
  return toText(value)
    .toLocaleLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，,、；;。.!！?？:："“”‘’'`（）()【】[\]{}<>《》]/g, '');
}

function stripAnswerPrefix(value) {
  return toText(value).replace(ANSWER_PREFIX_RE, '').trim();
}

/**
 * 从标准答案中提取评分要点。逗号、分号、句号和换行都视为要点边界。
 */
function splitAnswerPoints(value) {
  const points = stripAnswerPrefix(value)
    .split(ANSWER_POINT_SEPARATOR_RE)
    .map((point) => normalizeText(point))
    .filter((point) => point.length >= 2);

  return [...new Set(points)];
}

function extractTerms(value) {
  const text = toText(value);
  let terms = [];

  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
    terms = [...segmenter.segment(text)]
      .filter((part) => part.isWordLike)
      .map((part) => normalizeText(part.segment));
  } else {
    terms = text.match(/[\p{Script=Han}]{2,}|[a-z0-9]+/giu) || [];
    terms = terms.map(normalizeText);
  }

  return [...new Set(terms)].filter(
    (term) => term.length >= 2 && !STOP_WORDS.has(term),
  );
}

function pointMatches(userText, point) {
  const alternatives = point
    .split(ANSWER_ALTERNATIVE_SEPARATOR_RE)
    .map(normalizeText)
    .filter(Boolean);

  return alternatives.some((alternative) => {
    if (userText.includes(alternative)) return true;

    const terms = extractTerms(alternative);
    if (terms.length < 2) return false;

    const matchedTerms = terms.filter((term) => userText.includes(term));
    return matchedTerms.length >= Math.max(2, Math.ceil(terms.length * 0.6));
  });
}

/**
 * 判定简答题：完全匹配直接通过；否则至少覆盖 60% 的评分要点，
 * 且至少命中两个要点。三点答案允许漏掉一点，四点答案需要命中三点。
 */
function judgeShortAnswer(userAnswer, standardAnswer) {
  const userText = normalizeText(userAnswer);
  const standardText = normalizeText(stripAnswerPrefix(standardAnswer));
  if (!userText || !standardText) return false;
  if (userText === standardText) return true;

  const points = splitAnswerPoints(standardAnswer);
  if (points.length > 1) {
    const matchedPoints = points.filter((point) => pointMatches(userText, point));
    const requiredPoints = Math.max(2, Math.ceil(points.length * 0.6));
    return matchedPoints.length >= requiredPoints;
  }

  const terms = extractTerms(stripAnswerPrefix(standardAnswer));
  if (terms.length < 2) return userText.includes(standardText);

  const matchedTerms = terms.filter((term) => userText.includes(term));
  return matchedTerms.length >= Math.max(2, Math.ceil(terms.length * 0.6));
}

function normalizeChoiceAnswer(value) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => toText(item).replace(/[,，]/g, '').split(''))
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .sort();
}

/**
 * 统一判题入口，供 HTTP 答题接口使用。
 */
function judgeAnswer({ type, standardAnswer, userAnswer }) {
  if (type === '简答题') return judgeShortAnswer(userAnswer, standardAnswer);

  if (type === '多选题') {
    return JSON.stringify(normalizeChoiceAnswer(standardAnswer)) ===
      JSON.stringify(normalizeChoiceAnswer(userAnswer));
  }

  return normalizeText(standardAnswer) === normalizeText(userAnswer);
}

module.exports = {
  judgeAnswer,
  judgeShortAnswer,
  normalizeText,
  splitAnswerPoints,
};
