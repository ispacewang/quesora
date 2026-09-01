import { test } from 'node:test'
import assert from 'node:assert/strict'

import { toggleAllOptions } from './multiSelect.js'

test('一键全选返回当前题目的全部原始选项字母', () => {
  assert.deepEqual(
    toggleAllOptions({ options: ['A', 'B', 'C'], _shuffleMap: [2, 0, 1] }, []),
    ['C', 'A', 'B'],
  )
})

test('全部选中后再次点击一键全选会清空选择', () => {
  assert.deepEqual(
    toggleAllOptions({ options: ['A', 'B', 'C'], _shuffleMap: [2, 0, 1] }, ['C', 'A', 'B']),
    [],
  )
})
