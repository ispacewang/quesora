const test = require('node:test');
const assert = require('node:assert/strict');

const { buildQuestionTypeFilter } = require('../question-types');

test('未指定题型时不过滤，导入的简答题和填空题可以进入题池', () => {
  assert.deepEqual(buildQuestionTypeFilter(), {
    sql: '1=1',
    args: [],
    key: 'all',
  });
});

test('指定题型时只保留允许的题型并生成稳定筛选键', () => {
  assert.deepEqual(buildQuestionTypeFilter('多选题,简答题,未知题,多选题'), {
    sql: 'type IN (?,?)',
    args: ['多选题', '简答题'],
    key: '多选题|简答题',
  });
});
