import { test } from 'node:test'
import assert from 'node:assert/strict'

import { shouldShowAiJudgeButton } from './quizUi.js'

test('AI 开关关闭时不显示主观题 AI 判题按钮', () => {
  assert.equal(
    shouldShowAiJudgeButton({
      aiMode: false,
      shortAnswer: true,
      fillBlank: false,
      showResult: false,
    }),
    false,
  )
})

test('AI 开关打开且正在答简答/填空题时显示 AI 判题按钮', () => {
  assert.equal(
    shouldShowAiJudgeButton({
      aiMode: true,
      shortAnswer: true,
      fillBlank: false,
      showResult: false,
    }),
    true,
  )
  assert.equal(
    shouldShowAiJudgeButton({
      aiMode: true,
      shortAnswer: false,
      fillBlank: true,
      showResult: false,
    }),
    true,
  )
})

test('主观题已经显示结果时隐藏 AI 判题按钮', () => {
  assert.equal(
    shouldShowAiJudgeButton({
      aiMode: true,
      shortAnswer: true,
      fillBlank: false,
      showResult: true,
    }),
    false,
  )
})
