<script setup>
import { computed, onMounted, ref } from "vue";
import {
  Calendar,
  CollectionTag,
  DataAnalysis,
  Plus,
  Timer,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { getBanks } from "./api";
import Exam from "./components/Exam.vue";
import Quiz from "./components/Quiz.vue";
import StatsCard from "./components/StatsCard.vue";
import WrongAnswerCard from "./components/WrongAnswerCard.vue";

const quizRef = ref(null);
const quizStats = ref({ correct: 0, incorrect: 0 });
const wrongAnswers = ref([]);
const currentBankName = ref("");

const isExamMode = ref(false);
const examInfo = ref(null);

const showExamDialog = ref(false);
const showIntroDialog = ref(false);
const examForm = ref({
  bank: "",
  duration: 60,
});
const availableBanks = ref([]);

const totalAnswered = computed(
  () => quizStats.value.correct + quizStats.value.incorrect
);
const accuracy = computed(() => {
  if (!totalAnswered.value) return 0;
  return Math.round((quizStats.value.correct / totalAnswered.value) * 100);
});

const handleAnswerSubmitted = (result) => {
  if (result.isCorrect) {
    quizStats.value.correct += 1;
  } else {
    quizStats.value.incorrect += 1;
    if (
      result.questionData &&
      !wrongAnswers.value.some(
        (item) => item.questionData.idx === result.questionData.idx
      )
    ) {
      wrongAnswers.value.unshift(result);
    }
  }
};

const resetPracticeState = () => {
  quizStats.value = { correct: 0, incorrect: 0 };
  wrongAnswers.value = [];
};

const handleBankChanged = (newBankName) => {
  currentBankName.value = newBankName;
  resetPracticeState();
};

const handleCreateExam = (info) => {
  isExamMode.value = true;
  examInfo.value = info || {};
  resetPracticeState();
};

const handleExitExam = () => {
  isExamMode.value = false;
  examInfo.value = null;
};

const fetchBanks = async () => {
  try {
    const res = await getBanks();
    availableBanks.value = res.data.banks || [];
  } catch (error) {
    availableBanks.value = [];
    ElMessage.error("获取题库列表失败");
  }
};

const openExamDialog = async () => {
  await fetchBanks();
  showExamDialog.value = true;
};

const startExam = () => {
  if (!examForm.value.bank) {
    ElMessage.error("请选择题库");
    return;
  }

  if (!examForm.value.duration || examForm.value.duration <= 0) {
    ElMessage.error("请输入有效的考试时长");
    return;
  }

  showExamDialog.value = false;
  handleCreateExam({
    bank: examForm.value.bank,
    duration: examForm.value.duration,
  });
};

onMounted(() => {
  if (!localStorage.getItem("ai-quiz-intro-shown")) {
    showIntroDialog.value = true;
    localStorage.setItem("ai-quiz-intro-shown", "1");
  }
});
</script>

<template>
  <div class="app-shell">
    <div class="hero-glow hero-glow-left"></div>
    <div class="hero-glow hero-glow-right"></div>

    <el-main class="app-main">
      <section class="hero-section">
        <div class="hero-copy">
          <div class="hero-kicker">AI Quiz Workspace</div>
          <h1>更清晰的练习流，更顺手的考试流</h1>
          <p>
            把题库选择、答题反馈、错题沉淀和考试入口整合到一个稳定的操作界面里，减少切换成本，让连续刷题更顺手。
          </p>

          <div class="hero-metrics">
            <div class="metric-pill">
              <el-icon><DataAnalysis /></el-icon>
              <span>已答 {{ totalAnswered }} 题</span>
            </div>
            <div class="metric-pill">
              <el-icon><CollectionTag /></el-icon>
              <span>错题 {{ wrongAnswers.length }} 道</span>
            </div>
            <div class="metric-pill">
              <el-icon><Timer /></el-icon>
              <span>正确率 {{ accuracy }}%</span>
            </div>
          </div>
        </div>

        <div class="hero-panel">
          <div class="hero-panel-card">
            <div class="panel-label">当前工作区</div>
            <div class="panel-value">
              {{ currentBankName || "请选择题库开始练习" }}
            </div>
            <div class="panel-caption">
              {{
                isExamMode
                  ? "当前处于考试模式，右侧错题与统计面板暂时折叠。"
                  : "错题会自动沉淀，答题统计会实时刷新。"
              }}
            </div>
          </div>

          <div class="hero-actions">
            <el-button
              class="primary-action"
              type="primary"
              size="large"
              :icon="Plus"
              @click="openExamDialog"
            >
              新建考试
            </el-button>
            <div class="action-note">
              <el-icon><Calendar /></el-icon>
              <span>支持题库选择、考试时长设置和独立考试页</span>
            </div>
          </div>
        </div>
      </section>

      <el-dialog
        v-model="showExamDialog"
        class="exam-dialog"
        title="创建考试"
        width="460px"
      >
        <div class="dialog-intro">
          从题库中抽取试卷，进入独立考试模式。
        </div>
        <el-form :model="examForm" label-position="top">
          <el-form-item label="题库">
            <el-select
              v-model="examForm.bank"
              placeholder="请选择一个题库"
              style="width: 100%"
            >
              <el-option
                v-for="bank in availableBanks"
                :key="bank"
                :label="bank"
                :value="bank"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="考试时长（分钟）">
            <el-input-number
              v-model="examForm.duration"
              :min="1"
              :max="180"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showExamDialog = false">取消</el-button>
          <el-button type="primary" @click="startExam">开始考试</el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="showIntroDialog"
        class="intro-dialog"
        title="功能说明"
        width="560px"
        :close-on-click-modal="false"
      >
        <div class="intro-body">
          <p>这个版本的界面重新围绕“练习”和“考试”两条主线组织：</p>
          <div class="intro-grid">
            <div class="intro-item">
              <strong>练习模式</strong>
              <span>题库选择、顺序/随机答题、错题自动沉淀。</span>
            </div>
            <div class="intro-item">
              <strong>考试模式</strong>
              <span>单独试卷页、倒计时、统一交卷和结果查看。</span>
            </div>
            <div class="intro-item">
              <strong>统计视图</strong>
              <span>正确率、答题量和练习状态实时更新。</span>
            </div>
            <div class="intro-item">
              <strong>错题复盘</strong>
              <span>随时导出错题内容，方便整理和复习。</span>
            </div>
          </div>
        </div>
        <template #footer>
          <el-button type="primary" @click="showIntroDialog = false">
            开始使用
          </el-button>
        </template>
      </el-dialog>

      <section class="workspace-grid">
        <aside v-if="!isExamMode" class="left-column">
          <StatsCard
            :stats="quizStats"
            :current-bank-name="currentBankName"
          />
        </aside>

        <main :class="['center-column', { wide: isExamMode }]">
          <div v-if="!isExamMode" class="workspace-heading">
            <div>
              <div class="workspace-kicker">Practice</div>
              <h2>刷题工作台</h2>
            </div>
            <div class="workspace-summary">
              <span>{{ currentBankName || "未选择题库" }}</span>
              <strong>{{ totalAnswered }} / {{ accuracy }}%</strong>
            </div>
          </div>

          <Exam
            v-if="isExamMode"
            :exam-info="examInfo"
            @exit-exam="handleExitExam"
          />
          <Quiz
            v-else
            ref="quizRef"
            @answer-submitted="handleAnswerSubmitted"
            @bank-changed="handleBankChanged"
          />
        </main>

        <aside v-if="!isExamMode" class="right-column">
          <WrongAnswerCard :wrong-answers="wrongAnswers" />
        </aside>
      </section>
    </el-main>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.hero-glow {
  position: fixed;
  width: 420px;
  height: 420px;
  border-radius: 999px;
  filter: blur(10px);
  opacity: 0.55;
  pointer-events: none;
  z-index: 0;
}

.hero-glow-left {
  top: -120px;
  left: -120px;
  background: radial-gradient(circle, rgba(255, 122, 26, 0.24), transparent 68%);
}

.hero-glow-right {
  top: -140px;
  right: -100px;
  background: radial-gradient(circle, rgba(33, 118, 255, 0.26), transparent 70%);
}

.app-main {
  position: relative;
  z-index: 1;
  width: min(1480px, 100%);
  margin: 0 auto;
  padding: 36px 28px 40px;
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(340px, 420px);
  gap: 28px;
  align-items: stretch;
  margin-bottom: 28px;
}

.hero-copy,
.hero-panel {
  border: 1px solid rgba(133, 158, 196, 0.18);
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  box-shadow: 0 22px 52px rgba(27, 49, 89, 0.1);
}

.hero-copy {
  border-radius: 32px;
  padding: 34px 36px;
}

.hero-kicker,
.workspace-kicker {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(33, 118, 255, 0.1);
  color: #1658c0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h1 {
  margin: 18px 0 14px;
  font-size: clamp(32px, 4vw, 48px);
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.hero-copy p {
  margin: 0;
  max-width: 760px;
  color: #5c6e89;
  font-size: 16px;
  line-height: 1.8;
}

.hero-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.metric-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid rgba(133, 158, 196, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #344765;
  font-weight: 600;
}

.hero-panel {
  border-radius: 28px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
}

.hero-panel-card {
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.96), #ffffff);
  border: 1px solid rgba(133, 158, 196, 0.15);
}

.panel-label {
  color: #7a8aa4;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.panel-value {
  margin-top: 12px;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
  color: #16233c;
}

.panel-caption {
  margin-top: 10px;
  color: #6d7f99;
  line-height: 1.7;
}

.hero-actions {
  display: grid;
  gap: 14px;
}

.primary-action {
  min-height: 52px;
  border-radius: 16px;
  font-weight: 700;
  box-shadow: 0 18px 28px rgba(33, 118, 255, 0.2);
}

.action-note {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #64758f;
  font-size: 14px;
}

.dialog-intro {
  margin-bottom: 18px;
  color: #62748f;
}

.intro-body p {
  margin: 0 0 18px;
  color: #5d708c;
  line-height: 1.8;
}

.intro-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.intro-item {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 18px;
  background: #f7faff;
  border: 1px solid rgba(133, 158, 196, 0.14);
}

.intro-item strong {
  font-size: 15px;
  color: #16233c;
}

.intro-item span {
  color: #64758f;
  line-height: 1.7;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 360px;
  gap: 24px;
  align-items: start;
}

.left-column,
.right-column {
  min-width: 0;
}

.center-column {
  min-width: 0;
}

.center-column.wide {
  grid-column: 1 / -1;
}

.workspace-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 18px;
  margin-bottom: 18px;
}

.workspace-heading h2 {
  margin: 12px 0 0;
  font-size: 30px;
  letter-spacing: -0.02em;
}

.workspace-summary {
  display: grid;
  gap: 6px;
  min-width: 180px;
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(133, 158, 196, 0.15);
  text-align: right;
}

.workspace-summary span {
  color: #70819c;
  font-size: 13px;
}

.workspace-summary strong {
  font-size: 22px;
  color: #17233c;
}

:deep(.exam-dialog .el-dialog),
:deep(.intro-dialog .el-dialog) {
  border-radius: 24px;
  overflow: hidden;
}

:deep(.exam-dialog .el-dialog__header),
:deep(.intro-dialog .el-dialog__header) {
  padding: 24px 24px 12px;
  margin: 0;
}

:deep(.exam-dialog .el-dialog__body),
:deep(.intro-dialog .el-dialog__body) {
  padding: 8px 24px 8px;
}

:deep(.exam-dialog .el-dialog__footer),
:deep(.intro-dialog .el-dialog__footer) {
  padding: 12px 24px 24px;
}

@media (max-width: 1360px) {
  .workspace-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .left-column,
  .right-column,
  .center-column,
  .center-column.wide {
    grid-column: auto;
  }
}

@media (max-width: 980px) {
  .app-main {
    padding: 24px 16px 28px;
  }

  .hero-section {
    grid-template-columns: 1fr;
  }

  .hero-copy,
  .hero-panel {
    border-radius: 24px;
  }

  .workspace-heading {
    flex-direction: column;
    align-items: flex-start;
  }

  .workspace-summary {
    width: 100%;
    text-align: left;
  }

  .intro-grid {
    grid-template-columns: 1fr;
  }
}
</style>
