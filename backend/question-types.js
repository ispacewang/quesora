const ALLOWED_QUESTION_TYPES = [
  '单选题',
  '多选题',
  '判断题',
  '简答题',
  '填空题',
];

/**
 * 构造题型查询条件。未传筛选时必须返回全题型，包含导入的主观题。
 */
function buildQuestionTypeFilter(types) {
  const allowedTypes = new Set(ALLOWED_QUESTION_TYPES);
  const typeList = String(types || '')
    .split(',')
    .map((type) => type.trim())
    .filter((type) => allowedTypes.has(type));
  const uniqueTypes = [...new Set(typeList)];

  if (uniqueTypes.length === 0) {
    return { sql: '1=1', args: [], key: 'all' };
  }

  return {
    sql: `type IN (${uniqueTypes.map(() => '?').join(',')})`,
    args: uniqueTypes,
    key: uniqueTypes.slice().sort().join('|'),
  };
}

module.exports = { ALLOWED_QUESTION_TYPES, buildQuestionTypeFilter };
