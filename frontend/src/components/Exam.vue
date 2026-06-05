<template>
  <div class="w-full">
    <!-- ===== 加载状态 ===== -->
    <div v-if="!examStarted && !submitted" class="max-w-[500px] mx-auto my-16 py-8 text-center">
      <div class="h-3 w-[35%] bg-muted rounded animate-pulse mx-auto mb-3.5" />
      <div class="h-3 w-full bg-muted rounded animate-pulse mx-auto mb-2.5" />
      <div class="h-3 w-[75%] bg-muted rounded animate-pulse mx-auto mb-2.5" />
      <p class="text-muted-foreground mt-4 text-sm">正在生成试卷…</p>
    </div>

    <!-- ===== 考试中 ===== -->
    <template v-else-if="examStarted">
      <!-- 信息栏 -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/50">
        <div class="flex items-center flex-wrap gap-1.5">
          <span class="inline-flex items-center gap-1.5">
            <span class="text-xs text-muted-foreground font-medium">题库</span>
            <span class="text-sm font-semibold">{{ examInfo.bank }}</span>
          </span>
          <span class="w-px h-3.5 bg-border mx-1" />
          <span class="inline-flex items-center gap-1.5">
            <span class="text-xs text-muted-foreground font-medium">时长</span>
            <span class="text-sm font-semibold">{{ examInfo.duration }}分钟</span>
          </span>
          <span class="w-px h-3.5 bg-border mx-1" />
          <span class="inline-flex items-center gap-1.5">
            <span class="text-xs text-muted-foreground font-medium">进度</span>
            <span class="text-sm font-semibold">{{ currentIdx + 1 }}/{{ questions.length }}</span>
          </span>
          <span class="w-px h-3.5 bg-border mx-1" />
          <span class="inline-flex items-center gap-1.5">
            <span class="text-xs text-muted-foreground font-medium">剩余</span>
            <span class="text-sm font-semibold text-destructive tabular-nums">{{ timeStr }}</span>
          </span>
        </div>
        <Button variant="destructive" size="sm" @click="onExitExam">退出考试</Button>
      </div>

      <!-- 三栏布局 -->
      <div class="grid" style="grid-template-columns: 180px 1fr 300px; height: calc(100vh - 130px);">
        <!-- 左栏：答题卡 -->
        <div class="p-3.5 overflow-y-auto border-r border-border">
          <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5 pb-2.5 border-b border-border">答题卡</div>
          <div class="grid grid-cols-4 gap-1">
            <template v-for="(ans, qi) in answers" :key="qi">
              <div v-if="qi === 0" class="col-span-4 text-[10px] font-semibold text-muted-foreground mt-3 pb-1 border-b border-border first:mt-0">单选</div>
              <div v-if="qi === 40" class="col-span-4 text-[10px] font-semibold text-muted-foreground mt-3 pb-1 border-b border-border">多选</div>
              <div v-if="qi === 70" class="col-span-4 text-[10px] font-semibold text-muted-foreground mt-3 pb-1 border-b border-border">判断</div>
              <div
                class="flex items-center justify-center w-[28px] h-[28px] text-[11px] font-medium cursor-pointer border rounded transition-all duration-150"
                :class="{
                  'bg-primary text-primary-foreground border-primary font-bold': qi === currentIdx,
                  'bg-success/10 text-success border-success/25': qi !== currentIdx && ans !== null,
                  'border-warning ring-1 ring-warning': markedSet.has(qi),
                  'border-border text-muted-foreground': qi !== currentIdx && ans === null && !markedSet.has(qi),
                }"
                @click="goTo(qi)"
              >{{ qi + 1 }}</div>
            </template>
          </div>
        </div>

        <!-- 中间：题目 -->
        <div class="px-8 py-7 max-w-[740px] w-full mx-auto overflow-y-auto">
          <!-- 题头 -->
          <div class="flex justify-between items-center pb-3.5 mb-4 border-b border-border">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-base font-bold text-primary">第 {{ currentIdx + 1 }} 题</span>
              <Badge variant="default">{{ questions[currentIdx].type }}</Badge>
              <Badge v-if="questions[currentIdx].meta?.['题目分类']" variant="success">{{ questions[currentIdx].meta['题目分类'] }}</Badge>
              <Badge v-if="questions[currentIdx].meta?.['一级纲要']" variant="warning">{{ questions[currentIdx].meta['一级纲要'] }}</Badge>
            </div>
            <Button variant="ghost" size="sm" @click="toggleMark">
              {{ markedSet.has(currentIdx) ? '★ 已标记' : '☆ 标记' }}
            </Button>
          </div>

          <!-- 题干 -->
          <p class="text-base font-semibold leading-relaxed mb-5">{{ questions[currentIdx].question }}</p>

          <!-- 简答 -->
          <Textarea v-if="questions[currentIdx].type === '简答题'" v-model="answers[currentIdx]" :rows="4" placeholder="输入答案..." />

          <!-- 多选 -->
          <div v-else-if="questions[currentIdx].type === '多选题'" class="flex flex-col gap-2 mb-5 border border-border rounded-lg p-px">
            <div v-for="(opt, i) in questions[currentIdx].options" :key="i"
              class="flex items-start gap-2.5 px-3.5 py-2.5 border border-border rounded-md cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:translate-x-0.5"
              :class="{ 'border-primary bg-primary/5': answers[currentIdx]?.includes(String.fromCharCode(65 + i)) }"
              @click="toggleMultiOption(i)"
            >
              <span class="flex items-center justify-center w-6 h-6 border rounded text-xs font-semibold flex-shrink-0 transition-colors"
                :class="answers[currentIdx]?.includes(String.fromCharCode(65 + i)) ? 'bg-primary border-primary text-primary-foreground' : 'border-border text-muted-foreground'"
              >{{ String.fromCharCode(65 + i) }}</span>
              <span class="text-sm leading-relaxed pt-0.5">{{ opt }}</span>
            </div>
          </div>

          <!-- 单选/判断 -->
          <div v-else class="flex flex-col gap-2 mb-5 border border-border rounded-lg p-px">
            <div v-for="(opt, i) in questions[currentIdx].options" :key="i"
              class="flex items-start gap-2.5 px-3.5 py-2.5 border border-border rounded-md cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:translate-x-0.5"
              :class="{ 'border-primary bg-primary/5': answers[currentIdx] === String.fromCharCode(65 + i) }"
              @click="answers[currentIdx] = String.fromCharCode(65 + i)"
            >
              <span class="flex items-center justify-center w-6 h-6 border rounded text-xs font-semibold flex-shrink-0 transition-colors"
                :class="answers[currentIdx] === String.fromCharCode(65 + i) ? 'bg-primary border-primary text-primary-foreground' : 'border-border text-muted-foreground'"
              >{{ String.fromCharCode(65 + i) }}</span>
              <span class="text-sm leading-relaxed pt-0.5">{{ opt }}</span>
            </div>
          </div>

          <!-- 导航按钮 -->
          <div class="flex gap-2 pt-4 border-t border-border">
            <Button size="lg" variant="outline" :disabled="currentIdx === 0" @click="prev">← 上一题</Button>
            <Button size="lg" variant="outline" :disabled="currentIdx === questions.length - 1" @click="next">下一题 →</Button>
            <Button size="lg" class="ml-auto" :disabled="submitted" @click="onSubmitExam">交卷</Button>
          </div>
        </div>

        <!-- 右栏：占位 -->
        <div class="border-l border-border p-4 overflow-y-auto">
          <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5 pb-2.5 border-b border-border">提示</div>
          <p class="text-xs text-muted-foreground leading-relaxed">
            · 点击答题卡序号快速跳转<br>
            · ☆ 标记可标记疑问题目<br>
            · 交卷后自动判分
          </p>
        </div>
      </div>

      <!-- 退出确认弹窗 -->
      <AlertDialog
        :open="showExitDialog"
        title="确认退出"
        description="退出后本次答题不保存。"
        confirm-text="确定"
        cancel-text="取消"
        variant="destructive"
        @update:open="showExitDialog = $event"
        @confirm="confirmExit"
        @cancel="showExitDialog = false"
      />

      <!-- 交卷确认弹窗 -->
      <AlertDialog
        :open="showSubmitDialog"
        title="交卷确认"
        description="交卷后立即判分。"
        confirm-text="确定"
        cancel-text="取消"
        @update:open="showSubmitDialog = $event"
        @confirm="confirmSubmit"
        @cancel="showSubmitDialog = false"
      />
    </template>

    <!-- ===== 交卷结果 ===== -->
    <div v-else-if="submitted" class="max-w-[640px] mx-auto my-10 text-center">
      <!-- 分数 -->
      <div class="mb-5">
        <span class="text-[56px] font-bold -tracking-[0.03em] text-primary">{{ score }}</span>
        <span class="text-[32px] text-muted-foreground font-light mx-1.5">/</span>
        <span class="text-[32px] text-muted-foreground font-medium">{{ questions.length }}</span>
        <p class="text-sm text-muted-foreground mt-2">最终得分</p>
      </div>

      <hr class="border-border my-5" />

      <!-- 错题 -->
      <div v-if="wrongSet.size" class="text-left">
        <div class="text-sm font-semibold mb-4">错题详情 ({{ wrongSet.size }} 题)</div>
        <div v-for="wi in sortedWrong" :key="wi" class="border border-border rounded-lg p-4 mb-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm font-bold text-primary">第 {{ wi + 1 }} 题</span>
            <Badge variant="default">{{ questions[wi].type }}</Badge>
          </div>
          <p class="text-sm font-medium mb-3 leading-relaxed">{{ questions[wi].question }}</p>
          <div v-if="questions[wi].options" class="flex flex-col gap-0.5 mb-2">
            <div v-for="(opt, j) in questions[wi].options" :key="j"
              class="text-xs px-1 py-0.5 flex gap-1"
              :class="wrongDetails[wi]?.answer?.includes(String.fromCharCode(65 + j)) ? 'text-success font-medium' : 'text-muted-foreground'"
            >{{ String.fromCharCode(65 + j) }}. {{ opt }}</div>
          </div>
          <div class="flex flex-col gap-2 text-xs mb-2">
            <span>你的：<span class="text-destructive font-semibold">{{ fmtAns(answers[wi], questions[wi]) }}</span></span>
            <span>正确：<span class="text-success font-semibold">{{ wrongDetails[wi]?.answer || '?' }}</span></span>
          </div>
          <div v-if="wrongDetails[wi]?.explanation" class="p-3 bg-muted rounded border-l-2 border-primary mt-2">
            <span class="text-[10px] font-semibold text-primary uppercase tracking-wider block mb-0.5">解析</span>
            <span class="text-xs leading-relaxed text-muted-foreground">{{ wrongDetails[wi].explanation }}</span>
          </div>
        </div>
      </div>

      <!-- 全对 -->
      <div v-else class="py-8">
        <span class="text-4xl">🎉</span>
        <p class="text-sm text-muted-foreground mt-3">全部答对！太厉害了！</p>
      </div>

      <hr class="border-border my-5" />
      <Button size="lg" class="mt-4" @click="onExitExam">退出考试</Button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue'
import { toast } from 'vue-sonner'
import Button from './ui/Button.vue'
import Badge from './ui/Badge.vue'
import Textarea from './ui/Textarea.vue'
import AlertDialog from './ui/AlertDialog.vue'
import * as api from '../api'
import axios from 'axios'

const props = defineProps({ examInfo: { type: Object, required: true } })

const questions = ref([])
const answers = ref([])
const markedSet = ref(new Set())
const currentIdx = ref(0)
const timer = ref(null)
const timeLeft = ref(0)
const examStarted = ref(false)
const submitted = ref(false)
const score = ref(0)
const wrongSet = ref(new Set())
const correctSet = ref(new Set())
const wrongDetails = ref({})

const showExitDialog = ref(false)
const showSubmitDialog = ref(false)

const sortedWrong = computed(() => Array.from(wrongSet.value).sort((a, b) => a - b))
const timeStr = computed(() => {
  const m = Math.floor(timeLeft.value / 60).toString().padStart(2, '0')
  const s = (timeLeft.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const genPaper = async () => {
  const r = await axios.get('/generate-paper', { params: { bankName: props.examInfo.bank } })
  questions.value = r.data
  answers.value = Array(questions.value.length).fill(null)
  markedSet.value = new Set(); currentIdx.value = 0
  timeLeft.value = (props.examInfo.duration || 60) * 60
  examStarted.value = true; submitted.value = false
  score.value = 0; wrongSet.value = new Set(); correctSet.value = new Set(); wrongDetails.value = {}
  if (timer.value) clearInterval(timer.value)
  timer.value = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) { clearInterval(timer.value); submitExam() }
  }, 1000)
}

watch(() => props.examInfo, v => { if (v?.bank) genPaper() }, { immediate: true })

const goTo = i => { if (examStarted.value) currentIdx.value = i }
const prev = () => { if (currentIdx.value > 0) currentIdx.value-- }
const next = () => { if (currentIdx.value < questions.value.length - 1) currentIdx.value++ }

const toggleMark = () => {
  if (markedSet.value.has(currentIdx.value)) markedSet.value.delete(currentIdx.value)
  else markedSet.value.add(currentIdx.value)
}

function toggleMultiOption(i) {
  const l = String.fromCharCode(65 + i)
  if (!Array.isArray(answers.value[currentIdx.value])) answers.value[currentIdx.value] = []
  const a = [...answers.value[currentIdx.value]]
  const p = a.indexOf(l); p === -1 ? a.push(l) : a.splice(p, 1)
  answers.value[currentIdx.value] = a
}

const emit = defineEmits(['exit-exam'])

const onExitExam = () => { showExitDialog.value = true }
const confirmExit = () => { showExitDialog.value = false; emit('exit-exam') }

const onSubmitExam = () => {
  if (submitted.value) return
  const na = answers.value.findIndex((a, i) => {
    if (questions.value[i].type === '多选题') return !Array.isArray(a) || a.length === 0
    return a == null || a === ''
  })
  if (na !== -1) { toast.warning(`第${na + 1}题未作答`); return }
  showSubmitDialog.value = true
}

const confirmSubmit = () => { showSubmitDialog.value = false; submitExam() }

const fmtAns = (a, q) => (q.type === '多选题' && Array.isArray(a)) ? a.join(', ') : (a || '')

const submitExam = async () => {
  if (submitted.value) return
  clearInterval(timer.value); submitted.value = true; examStarted.value = false
  let cc = 0; const wr = new Set(), cr = new Set(), wd = {}
  for (let i = 0; i < questions.value.length; i++) {
    const q = questions.value[i], a = answers.value[i]
    let r; try { r = await api.submitAnswer(q.id, a, props.examInfo.bank) } catch { wr.add(i); continue }
    if (r.data?.correct) { cc++; cr.add(i) } else {
      wr.add(i); if (r.data) wd[i] = { answer: r.data.answer, explanation: r.data.explanation }
    }
  }
  score.value = cc; wrongSet.value = wr; correctSet.value = cr; wrongDetails.value = wd
}

onUnmounted(() => { if (timer.value) clearInterval(timer.value) })
</script>
