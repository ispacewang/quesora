<template>
  <div class="flex flex-col gap-4 py-5 px-4 h-full overflow-y-auto">
    <div class="flex items-center justify-between flex-shrink-0">
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">错题规律</span>
      <span v-if="summary.total" class="text-[10px] text-muted-foreground tabular-nums">错 {{ summary.total }} 题</span>
    </div>

    <!-- 没有错题 -->
    <div v-if="summary.total === 0" class="flex flex-col items-center justify-center py-10 text-center flex-1">
      <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3 opacity-40">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m21 12-5 5-4-4-4 4-5-5"/><path d="m9 17 3 3 9-9"/></svg>
      </div>
      <p class="text-xs text-muted-foreground">暂无错题</p>
      <p class="text-[10px] text-muted-foreground/60 mt-1 leading-relaxed">答对的题不参与统计，继续保持！</p>
    </div>

    <!-- 错题太少 -->
    <div v-else-if="summary.total < 3" class="flex flex-col items-center justify-center py-10 text-center flex-1">
      <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3 opacity-40">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/></svg>
      </div>
      <p class="text-xs text-muted-foreground">错题太少</p>
      <p class="text-[10px] text-muted-foreground/60 mt-1 leading-relaxed">再积累几道错题，这里会自动总结规律</p>
    </div>

    <template v-else>
      <!-- 高频错词词云：相关度越高，字号越大 -->
      <div v-if="summary.patterns.length" class="flex-1 min-h-0 overflow-y-auto">
        <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-1 mb-3">高频错词</div>
        <div class="flex flex-wrap gap-x-3 gap-y-3 items-baseline">
          <span
            v-for="p in summary.patterns"
            :key="p.keyword"
            class="cursor-default leading-none"
            :style="cloudStyle(p)"
            :title="`${p.keyword}：出现在 ${p.count}/${summary.total} 道错题中`"
          >{{ p.keyword }}</span>
        </div>
        <p class="text-[10px] text-muted-foreground/60 pt-3">关键词提取自题目与答案 · 字号越大，错得越多</p>
      </div>

      <!-- 错题较分散 -->
      <div v-else class="flex flex-col items-center justify-center py-10 text-center flex-1">
        <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3 opacity-40">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </div>
        <p class="text-xs text-muted-foreground">错题较分散</p>
        <p class="text-[10px] text-muted-foreground/60 mt-1">没有反复出现的错词，继续保持！</p>
      </div>
    </template>
  </div>
</template>

<script setup>
/** @file PatternPanel.vue — 错题规律面板：只统计错题，展示错题中反复出现的高频关键词（答对不参与） */
import { computed } from 'vue'
import { useAnswerLog, examHistoryToAttempts } from '../utils/answerLog'
import { summarizePatterns } from '../utils/patternSummary'
import { useExamHistory } from '../composables/useExamHistory'

const minCount = 2

const answerLog = useAnswerLog()
const { sorted: examRecords } = useExamHistory()

const summary = computed(() => {
  const attempts = [...examHistoryToAttempts(examRecords.value), ...answerLog.value]
  return summarizePatterns(attempts, { minCount })
})

/**
 * 词云样式：占比越高字号越大、颜色越深、字重越粗
 * @param {{pct:number}} p - 关键词统计
 */
const cloudStyle = (p) => {
  const size = 13 + Math.round(p.pct * 14) // 13px ~ 27px
  const alpha = 0.4 + p.pct * 0.6 // 0.4 ~ 1.0
  const weight = p.pct >= 0.5 ? 700 : p.pct >= 0.3 ? 600 : 500
  return {
    fontSize: `${size}px`,
    fontWeight: weight,
    color: `rgba(239, 68, 68, ${alpha.toFixed(2)})`, // destructive 红
  }
}
</script>
