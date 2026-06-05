<template>
  <div class="flex flex-col min-h-full">
    <!-- 题库选择栏 -->
    <div class="px-5 py-3.5 border-b border-border">
      <BankSelector ref="bankSelectorRef" @bank-change="onBankChange" />
    </div>

    <!-- 空状态 -->
    <div v-if="!currentBank && !loading" class="flex-1 flex flex-col items-center justify-center py-16 px-5 text-muted-foreground">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" class="opacity-35 mb-3.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
      </svg>
      <p class="text-sm">{{ emptyDescription }}</p>
    </div>

    <!-- 加载中 -->
    <div v-else-if="loading" class="p-5 space-y-3">
      <div class="h-3 w-[30%] bg-muted animate-pulse" />
      <div class="h-3 w-full bg-muted animate-pulse" />
      <div class="h-3 w-[80%] bg-muted animate-pulse" />
      <div class="h-3 w-[55%] bg-muted animate-pulse" />
      <div class="h-10 w-full bg-muted animate-pulse" />
      <div class="h-10 w-full bg-muted animate-pulse" />
    </div>

    <!-- 题目 -->
    <div v-else-if="question" class="flex-1 flex flex-col">
      <div class="px-7 py-6 max-w-[680px] mx-auto w-full">
        <!-- 工具栏 -->
        <div class="flex items-center justify-between pb-3.5 mb-4 border-b border-border">
          <div class="flex items-center gap-2 flex-wrap">
            <Badge variant="default">{{ question.type }}</Badge>
            <Badge v-if="question.meta?.['题目分类']" variant="success">{{ question.meta['题目分类'] }}</Badge>
            <Badge v-if="question.meta?.['一级纲要']" variant="warning">{{ question.meta['一级纲要'] }}</Badge>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-medium" :class="!orderMode ? 'text-primary' : 'text-muted-foreground'">随机</span>
              <label class="relative inline-block w-[34px] h-5 cursor-pointer">
                <input type="checkbox" v-model="orderMode" @change="onModeChange" class="opacity-0 w-0 h-0" />
                <span class="absolute inset-0 rounded-full transition-colors duration-300" :class="orderMode ? 'bg-primary' : 'bg-border'" />
                <span class="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform duration-300" :class="orderMode ? 'left-[17px]' : 'left-[3px]'" />
              </label>
              <span class="text-[11px] font-medium" :class="orderMode ? 'text-primary' : 'text-muted-foreground'">顺序</span>
            </div>
            <Button size="xs" :variant="quickMode ? 'default' : 'outline'" @click="quickMode = !quickMode">⚡ 速刷</Button>
          </div>
        </div>

        <!-- 题干 -->
        <p class="text-base font-semibold leading-relaxed mb-5 text-foreground">{{ question.question }}</p>

        <!-- 简答 -->
        <Textarea v-if="isShortAnswer" v-model="userAnswer" :rows="4" placeholder="输入你的答案..." />

        <!-- 多选 -->
        <div v-else-if="isMultiChoice" class="flex flex-col gap-2 mb-5 border border-border p-px">
          <div v-for="(opt, i) in question.options" :key="i"
            class="flex items-start gap-2.5 px-3.5 py-2.5 border border-border cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:translate-x-0.5"
            :class="{ 'border-primary bg-primary/5': userAnswer.includes(String.fromCharCode(65 + i)) }"
            @click="toggleMultiOption(i)"
          >
            <span class="flex items-center justify-center w-6 h-6 border text-xs font-semibold flex-shrink-0 transition-colors"
              :class="userAnswer.includes(String.fromCharCode(65 + i)) ? 'bg-primary border-primary text-primary-foreground' : 'border-border text-muted-foreground'"
            >{{ String.fromCharCode(65 + i) }}</span>
            <span class="text-sm leading-relaxed pt-0.5">{{ opt }}</span>
          </div>
        </div>

        <!-- 单选/判断 -->
        <div v-else class="flex flex-col gap-2 mb-5 border border-border p-px">
          <div v-for="(opt, i) in question.options" :key="i"
            class="flex items-start gap-2.5 px-3.5 py-2.5 border border-border cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:translate-x-0.5"
            :class="{ 'border-primary bg-primary/5': userAnswer === String.fromCharCode(65 + i) }"
            @click="userAnswer = String.fromCharCode(65 + i)"
          >
            <span class="flex items-center justify-center w-6 h-6 border text-xs font-semibold flex-shrink-0 transition-colors"
              :class="userAnswer === String.fromCharCode(65 + i) ? 'bg-primary border-primary text-primary-foreground' : 'border-border text-muted-foreground'"
            >{{ String.fromCharCode(65 + i) }}</span>
            <span class="text-sm leading-relaxed pt-0.5">{{ opt }}</span>
          </div>
        </div>

        <!-- 操作 -->
        <div class="flex gap-2.5 pt-4 border-t border-border">
          <Button variant="outline" size="sm" @click="submitAnswer" :disabled="!canSubmit">提交答案</Button>
          <Button variant="ghost" size="sm" @click="quickNext">{{ quickMode ? '提交并继续 →' : '下一题 →' }}</Button>
        </div>

        <!-- 反馈 -->
        <div v-if="showResult" class="mt-4 space-y-3.5">
          <div class="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-l-[3px]"
            :class="lastResult?.correct
              ? 'bg-success/10 border-success text-success'
              : 'bg-destructive/10 border-destructive text-destructive'"
          >
            <span class="text-sm font-bold">{{ lastResult?.correct ? '✓' : '✗' }}</span>
            <span>{{ lastResult?.correct ? '回答正确！' : '回答错误' }}</span>
            <span v-if="isMistakeBook && lastResult?.correct" class="text-success text-xs">（已移出错题库）</span>
          </div>
          <div v-if="lastResult?.explanation" class="p-3.5 bg-muted border-l-2 border-primary">
            <span class="text-[10px] font-semibold text-primary uppercase tracking-wider block mb-1">解析</span>
            <p class="text-xs leading-relaxed text-muted-foreground m-0">{{ lastResult.explanation }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import Badge from './ui/Badge.vue'
import Button from './ui/Button.vue'
import Textarea from './ui/Textarea.vue'
import BankSelector from './BankSelector.vue'
import * as api from '../api'
import { getMistakeBook, removeQuestionFromMistakeBook, MISTAKE_BOOK_ID } from '../utils/mistakeBook'

const bankSelectorRef = ref(null)
const currentBank = ref('')
const question = ref(null)
const userAnswer = ref('')
const orderMode = ref(false)
const quickMode = ref(false)
const loading = ref(false)
const showResult = ref(false)
const lastResult = ref(null)
const lastMistakeIdx = ref(0)

const emit = defineEmits(['answer-submitted', 'bank-changed'])

const canSubmit = computed(() => !!userAnswer.value && !showResult.value)
const isShortAnswer = computed(() => question.value?.type === '简答题')
const isMultiChoice = computed(() => question.value?.type === '多选题')
const isMistakeBook = computed(() => currentBank.value === MISTAKE_BOOK_ID)

const emptyDescription = computed(() => {
  if (!currentBank.value) return '选择一个题库开始答题'
  if (isMistakeBook.value) return '错题库为空'
  return '题库为空'
})

const onBankChange = async (bankId) => {
  currentBank.value = bankId
  emit('bank-changed')
  if (!bankId) { question.value = null; return }
  lastMistakeIdx.value = 0
  await loadQuestion()
}

const loadQuestion = async () => {
  if (!currentBank.value) return
  loading.value = true
  try {
    if (isMistakeBook.value) {
      const book = getMistakeBook()
      if (book.length === 0) {
        question.value = null
        loading.value = false
        return
      }
      let q
      if (orderMode.value) {
        if (lastMistakeIdx.value >= book.length) lastMistakeIdx.value = 0
        q = book[lastMistakeIdx.value]
        lastMistakeIdx.value++
      } else {
        const idx = Math.floor(Math.random() * book.length)
        q = book[idx]
      }
      question.value = { ...q, id: q.questionId }
    } else {
      const res = await api.getQuestion(currentBank.value, orderMode.value)
      question.value = res.data
    }
    userAnswer.value = ''
    showResult.value = false
    lastResult.value = null
  } catch (e) {
    toast.error(e.response?.data?.error || '加载失败')
    question.value = null
  } finally {
    loading.value = false
  }
}

const onModeChange = () => { loadQuestion() }

const toggleMultiOption = (i) => {
  if (showResult.value) return
  const l = String.fromCharCode(65 + i)
  if (!Array.isArray(userAnswer.value)) userAnswer.value = []
  const a = [...userAnswer.value]
  const p = a.indexOf(l)
  p === -1 ? a.push(l) : a.splice(p, 1)
  userAnswer.value = a
}

const checkLocalAnswer = (q, ua) => {
  const answer = q.correctAnswer || q.answer || ''
  if (q.type === '多选题') {
    const std = answer.replace(/,/g, '').split('').map(s => s.trim().toUpperCase()).filter(Boolean).sort()
    const usr = (Array.isArray(ua) ? ua : [ua]).map(s => String(s).trim().toUpperCase()).filter(Boolean).sort()
    return JSON.stringify(std) === JSON.stringify(usr)
  }
  return answer.trim().toUpperCase() === String(ua || '').trim().toUpperCase()
}

const submitAnswer = async () => {
  if (!canSubmit.value) return
  const q = question.value
  try {
    let correct, answer, explanation
    if (isMistakeBook.value) {
      correct = checkLocalAnswer(q, userAnswer.value)
      answer = q.correctAnswer || q.answer
      explanation = q.explanation
    } else {
      const res = await api.submitAnswer(q.id, userAnswer.value, currentBank.value)
      correct = res.data?.correct
      answer = res.data?.answer
      explanation = res.data?.explanation
    }
    lastResult.value = { correct, explanation, correctAnswer: answer,
      questionData: { ...q, questionId: q.questionId || q.id, userAnswer: userAnswer.value, correctAnswer: answer, explanation },
    }
    showResult.value = true
    emit('answer-submitted', { isCorrect: correct, questionData: lastResult.value.questionData })
    if (isMistakeBook.value && correct) {
      removeQuestionFromMistakeBook(q.questionId)
      bankSelectorRef.value?.refreshBanks()
    }
  } catch { toast.error('提交失败') }
}

const nextQuestion = () => { loadQuestion() }

const quickNext = async () => {
  if (quickMode.value && canSubmit.value) { await submitAnswer() }
  loadQuestion()
}

defineExpose({ refreshBanks: () => bankSelectorRef.value?.refreshBanks() })
</script>
