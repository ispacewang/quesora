const test = require('node:test');
const assert = require('node:assert/strict');

const { judgeShortAnswer } = require('../question-judge');

test('简答题忽略空白和标点后完全匹配', () => {
  assert.equal(
    judgeShortAnswer('  依法治国，建设法治社会。 ', '依法治国，建设法治社会'),
    true,
  );
  assert.equal(judgeShortAnswer('依法治国', '参考答案：依法治国'), true);
});

test('简答题覆盖主要答案要点即可判定正确', () => {
  assert.equal(
    judgeShortAnswer(
      '发生事故后要及时报告，并保护现场。',
      '1. 及时报告事故；2. 保护现场；3. 配合调查。',
    ),
    true,
  );
});

test('简答题答案为空或没有核心要点时判定错误', () => {
  assert.equal(judgeShortAnswer('', '依法治国，建设法治社会'), false);
  assert.equal(judgeShortAnswer('注意安全', '及时报告事故；保护现场；配合调查'), false);
});
