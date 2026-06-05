<script setup>
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { useTheme } from './stores/theme'
import { addQuestionToMistakeBook } from './utils/mistakeBook'
import AppTour from './components/AppTour.vue'
import Quiz from './components/Quiz.vue'
import StatsCard from './components/StatsCard.vue'
import WrongAnswerCard from './components/WrongAnswerCard.vue'
import Exam from './components/Exam.vue'
import TitleBar from './components/TitleBar.vue'
import Dialog from './components/ui/Dialog.vue'
import DialogHeader from './components/ui/DialogHeader.vue'
import DialogTitle from './components/ui/DialogTitle.vue'
import DialogDescription from './components/ui/DialogDescription.vue'
import DialogFooter from './components/ui/DialogFooter.vue'
import Button from './components/ui/Button.vue'
import Input from './components/ui/Input.vue'
import Select from './components/ui/Select.vue'
import SelectItem from './components/ui/SelectItem.vue'

const quizRef = ref(null)
const quizStats = ref({ correct: 0, incorrect: 0, byType: {} })
const wrongAnswers = ref([])

// 初始化主题
useTheme()

const isExamMode = ref(false)
const examInfo = ref(null)

const handleAnswerSubmitted = (result) => {
  const type = result.questionData?.type || '未知'
  if (!quizStats.value.byType[type]) {
    quizStats.value.byType[type] = { correct: 0, incorrect: 0, total: 0 }
  }
  quizStats.value.byType[type].total++
  if (result.isCorrect) {
    quizStats.value.correct++
    quizStats.value.byType[type].correct++
  } else {
    quizStats.value.incorrect++
    quizStats.value.byType[type].incorrect++
    if (result.questionData && !wrongAnswers.value.some(x => x.questionData.questionId === result.questionData.questionId)) {
      wrongAnswers.value.unshift(result)
      addQuestionToMistakeBook(result.questionData)
      quizRef.value?.refreshBanks?.()
    }
  }
}

const handleBankChanged = () => {
  quizStats.value = { correct: 0, incorrect: 0, byType: {} }
  wrongAnswers.value = []
}

const handleCreateExam = (info) => {
  isExamMode.value = true
  examInfo.value = info || {}
  quizStats.value = { correct: 0, incorrect: 0, byType: {} }
  wrongAnswers.value = []
}

const handleExitExam = () => { isExamMode.value = false; examInfo.value = null }

// 考试弹窗
const showExamDialog = ref(false)
const examForm = ref({ bank: '', duration: 60 })
const availableBanks = ref([])

const fetchBanks = async () => {
  try {
    const { getBanks } = await import('./api')
    const res = await getBanks()
    availableBanks.value = res.data.banks || []
  } catch { availableBanks.value = [] }
}

const openExamDialog = async () => {
  await fetchBanks()
  if (!availableBanks.value.length) { toast.warning('请先上传题库'); return }
  showExamDialog.value = true
}

const startExam = () => {
  if (!examForm.value.bank) { toast.error('请选择题库'); return }
  if (!examForm.value.duration || examForm.value.duration <= 0) { toast.error('请输入有效时长'); return }
  showExamDialog.value = false
  handleCreateExam({ bank: examForm.value.bank, duration: examForm.value.duration })
}

// 引导弹窗
const showIntroDialog = ref(false)
onMounted(() => {
  if (!localStorage.getItem('ai-quiz-intro-shown')) {
    showIntroDialog.value = true
    localStorage.setItem('ai-quiz-intro-shown', '1')
  }
})
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-background/80">
    <!-- ===== 顶栏（固定不滚动） ===== -->
    <TitleBar class="sticky top-0 z-50" />

    <!-- 考试按钮（非考试模式下放在 TitleBar 下方操作栏） -->
    <div v-if="!isExamMode" class="flex items-center justify-between px-5 py-2 bg-background border-b border-border">
      <AppTour />
      <Button data-tour="exam-btn" @click="openExamDialog">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        考试
      </Button>
    </div>

    <!-- 引导弹窗 -->
    <Dialog :open="showIntroDialog" @update:open="showIntroDialog = $event" class="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>功能介绍</DialogTitle>
        <DialogDescription>答题小助手 — 题库上传、刷题、考试、错题本</DialogDescription>
      </DialogHeader>
      <div class="text-sm leading-relaxed">
        <ul class="space-y-1 pl-4 list-disc text-muted-foreground">
          <li>Excel/CSV 题库一键上传</li>
          <li>刷题模式 + 考试模式切换</li>
          <li>答题卡、倒计时、批量判题</li>
          <li>多题型：单选 / 多选 / 判断 / 简答</li>
        </ul>
      </div>
      <DialogFooter>
        <Button @click="showIntroDialog = false">知道了</Button>
      </DialogFooter>
    </Dialog>

    <!-- 考试弹窗 -->
    <Dialog :open="showExamDialog" @update:open="showExamDialog = $event" class="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>新建考试</DialogTitle>
      </DialogHeader>
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">题库</label>
          <Select v-model="examForm.bank" placeholder="请选择题库">
            <SelectItem v-for="b in availableBanks" :key="b" :value="b">{{ b }}</SelectItem>
          </Select>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium">时长（分钟）</label>
          <Input :model-value="examForm.duration" @update:model-value="examForm.duration = Number($event) || 0" type="number" :min="1" :max="180" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showExamDialog = false">取消</Button>
        <Button @click="startExam">开始</Button>
      </DialogFooter>
    </Dialog>

    <!-- ===== 考试模式 ===== -->
    <div v-if="isExamMode" class="flex-1 bg-background">
      <Exam :exam-info="examInfo" @exit-exam="handleExitExam" />
    </div>

    <!-- ===== 三栏布局（刷题模式） ===== -->
    <div v-else class="flex-1 grid bg-background" style="grid-template-columns: 260px 1fr 340px; min-height: 0;">
      <!-- 左栏：答题统计 -->
      <div data-tour="stats" class="bg-background border-r border-border overflow-y-auto min-h-0">
        <StatsCard :stats="quizStats" />
      </div>

      <!-- 中间：答题区 -->
      <div data-tour="quiz" class="bg-background overflow-y-auto min-h-0">
        <Quiz ref="quizRef" @answer-submitted="handleAnswerSubmitted" @bank-changed="handleBankChanged" />
      </div>

      <!-- 右栏：错题本 -->
      <div data-tour="wrong" class="bg-background border-l border-border overflow-y-auto sticky top-[52px] max-h-[calc(100vh-52px)] min-h-0">
        <WrongAnswerCard :wrong-answers="wrongAnswers" @clear="wrongAnswers = []" />
      </div>
    </div>

    <!-- Toast -->
    <Toaster position="top-center" rich-colors />
  </div>
</template>
