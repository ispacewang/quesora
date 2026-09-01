import { test } from 'node:test'
import assert from 'node:assert/strict'

import { judgeAnswer } from './answerJudge.js'

test('前端本地判题与后端一致地支持简答题要点覆盖', () => {
  assert.equal(
    judgeAnswer({
      type: '简答题',
      standardAnswer: '及时报告事故；保护现场；配合调查',
      userAnswer: '发生事故后及时报告，并保护现场',
    }),
    true,
  )
  assert.equal(
    judgeAnswer({
      type: '简答题',
      standardAnswer: '参考答案：依法治国',
      userAnswer: '依法治国',
    }),
    true,
  )
})

test('前端本地判题拒绝没有核心要点的简答题答案', () => {
  assert.equal(
    judgeAnswer({
      type: '简答题',
      standardAnswer: '及时报告事故；保护现场；配合调查',
      userAnswer: '注意安全',
    }),
    false,
  )
})
