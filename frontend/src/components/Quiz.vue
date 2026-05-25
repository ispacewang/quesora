<template>
  <el-card class="quiz-shell" shadow="never">
    <div class="quiz-topbar">
      <div class="topbar-copy">
        <div class="section-kicker">Practice Flow</div>
        <h3>智能刷题</h3>
        <p>先选题库，再按当前模式持续练习。错题会自动归档，方便后续复盘。</p>
      </div>

      <div class="topbar-actions">
        <div class="mode-panel">
          <div class="mode-label">
            <span>答题模式</span>
            <strong>{{ questionMod ? "顺序练习" : "随机练习" }}</strong>
          </div>
          <el-switch
            v-model="questionMod"
            inline-prompt
            class="mode-switch"
            active-text="顺序"
            inactive-text="随机"
            @change="handleModeChange"
          />
        </div>
        <div class="sync-tip">错题会自动沉淀到“我的错题库”</div>
      </div>
    </div>

    <BankSelector ref="bankSelectorRef" @bank-change="onBankChange" />

    <div class="main-content-area">
      <div v-if="loading" class="loading-state">
        <div class="loading-card">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="text" style="width: 28%; height: 18px" />
              <el-skeleton-item
                variant="h3"
                style="width: 92%; height: 30px; margin-top: 18px"
              />
              <el-skeleton-item
                variant="text"
                style="width: 100%; height: 16px; margin-top: 26px"
              />
              <el-skeleton-item
                variant="text"
                style="width: 100%; height: 16px; margin-top: 12px"
              />
              <el-skeleton-item
                variant="rect"
                style="width: 100%; height: 64px; margin-top: 28px; border-radius: 18px"
              />
              <el-skeleton-item
                variant="rect"
                style="width: 100%; height: 64px; margin-top: 14px; border-radius: 18px"
              />
            </template>
          </el-skeleton>
        </div>
      </div>

      <div v-else-if="question" class="question-container">
        <Transition name="question-change" mode="out-in">
          <div :key="idx" class="question-stage">
            <div class="meta-row">
              <div class="meta-tags">
                <el-tag class="meta-tag" effect="dark" type="primary">
                  {{ question.type }}
                </el-tag>
                <el-tag
                  v-if="question.meta?.['题目分类']"
                  class="meta-tag"
                  effect="plain"
                  type="success"
                >
                  {{ question.meta["题目分类"] }}
                </el-tag>
                <el-tag
                  v-if="question.meta?.['一级纲要']"
                  class="meta-tag"
                  effect="plain"
                  type="warning"
                >
                  {{ question.meta["一级纲要"] }}
                </el-tag>
              </div>

              <div class="bank-indicator">
                <span>{{ isMistakeMode ? "错题回顾" : "当前题库" }}</span>
                <strong>{{ currentBankLabel }}</strong>
              </div>
            </div>

            <div class="question-card">
              <div class="question-head">
                <div>
                  <div class="question-index">题目编号 {{ idx }}</div>
                  <h2>{{ question.question }}</h2>
                </div>
                <div class="question-hint">
                  <span>{{ answerHintText }}</span>
                  <strong>{{ questionMod ? "顺序推进" : "随机抽题" }}</strong>
                </div>
              </div>

              <el-input
                v-if="isShortAnswer"
                v-model="userAnswer"
                type="textarea"
                :rows="5"
                resize="none"
                class="answer-input"
                placeholder="输入你的答案，提交后查看结果与解析"
              />

              <el-checkbox-group
                v-else-if="isMultiChoice"
                v-model="userAnswer"
                class="option-group"
              >
                <el-checkbox
                  v-for="(opt, i) in question.options"
                  :key="i"
                  :label="String.fromCharCode(65 + i)"
                  class="option-card"
                >
                  <span class="option-prefix">{{ String.fromCharCode(65 + i) }}</span>
                  <span class="option-text">{{ opt }}</span>
                </el-checkbox>
              </el-checkbox-group>

              <el-radio-group v-else v-model="userAnswer" class="option-group">
                <el-radio
                  v-for="(opt, i) in question.options"
                  :key="i"
                  :label="isJudge ? opt : String.fromCharCode(65 + i)"
                  class="option-card"
                >
                  <span class="option-prefix">
                    {{ isJudge ? "判断" : String.fromCharCode(65 + i) }}
                  </span>
                  <span class="option-text">{{ opt }}</span>
                </el-radio>
              </el-radio-group>
            </div>

            <div class="action-bar">
              <div class="action-buttons">
                <el-button
                  class="submit-button"
                  type="primary"
                  size="large"
                  round
                  :icon="Check"
                  :disabled="!canSubmit || submitted || submitting"
                  :loading="submitting"
                  @click="submit"
                >
                  {{ submitting ? "正在判题..." : "提交答案" }}
                </el-button>
                <el-button
                  v-if="submitted && (resultType === 'error' || isMistakeMode)"
                  class="next-button"
                  size="large"
                  round
                  :icon="ArrowRight"
                  @click="next"
                >
                  下一题
                </el-button>
              </div>
              <div class="action-caption">
                {{
                  submitted
                    ? "结果已生成，可以查看解析或进入下一题。"
                    : actionTipText
                }}
              </div>
            </div>

            <div v-if="submitted" class="result-panel">
              <el-alert
                :title="resultTitle"
                :type="resultType"
                :closable="false"
                show-icon
              />

              <div v-if="explanation" class="explanation-panel">
                <div class="explanation-title">答案解析</div>
                <p>{{ explanation }}</p>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <div v-else class="empty-state">
        <el-empty :description="emptyDescription">
          <template #image>
            <div class="empty-illustration">
              <div class="empty-orb"></div>
              <div class="empty-card">
                <strong>{{ isMistakeMode ? "错题库已清空" : "等待开始" }}</strong>
                <span>
                  {{
                    isMistakeMode
                      ? "当前没有待复习错题，可以回到正常题库继续练习。"
                      : "从上方选择题库后即可开始答题。"
                  }}
                </span>
              </div>
            </div>
          </template>
        </el-empty>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { ArrowRight, Check } from "@element-plus/icons-vue";
import { getQuestion, submitAnswer } from "../api";
import BankSelector from "./BankSelector.vue";
import {
  MISTAKE_BOOK_ID,
  addQuestionToMistakeBook,
  getMistakeBook,
  removeQuestionFromMistakeBook,
} from "../utils/mistakeBook";

const bankSelectorRef = ref(null);
const questionMod = ref(true);

const question = ref(null);
const idx = ref(null);
const userAnswer = ref("");
const submitted = ref(false);
const resultTitle = ref("");
const resultType = ref("info");
const explanation = ref("");
const loading = ref(false);
const submitting = ref(false);
const currentBank = ref("");

const emit = defineEmits(["answer-submitted", "bank-changed"]);

const isJudge = computed(() => {
  if (!question.value?.options) return false;
  const opts = question.value.options.map((item) => item.trim());
  return (
    opts.length === 2 &&
    ((opts[0] === "正确" && opts[1] === "错误") ||
      (opts[0] === "对" && opts[1] === "错"))
  );
});

const isShortAnswer = computed(() => question.value?.type === "简答题");
const isMultiChoice = computed(() => question.value?.type === "多选题");
const isMistakeMode = computed(() => currentBank.value === MISTAKE_BOOK_ID);

const canSubmit = computed(() => {
  if (isMultiChoice.value) {
    return Array.isArray(userAnswer.value) && userAnswer.value.length > 0;
  }
  return Boolean(userAnswer.value);
});

const currentBankLabel = computed(() =>
  isMistakeMode.value ? "我的错题库" : currentBank.value
);

const answerHintText = computed(() => {
  if (isShortAnswer.value) return "开放作答，建议写出关键点";
  if (isMultiChoice.value) return "多选题，可选择多个答案";
  if (isJudge.value) return "判断题，点击一个选项即可";
  return "单选题，选择最符合题意的一项";
});

const actionTipText = computed(() => {
  if (isMistakeMode.value) {
    return "在错题模式下，答对后会自动从错题库移除。";
  }
  return "答对会自动跳转下一题，答错会保留结果与解析。";
});

const emptyDescription = computed(() => {
  if (isMistakeMode.value) {
    return "错题已经清空，继续保持。";
  }
  return "请选择一个题库开始练习。";
});

const resetQuestionState = () => {
  submitted.value = false;
  resultTitle.value = "";
  resultType.value = "info";
  explanation.value = "";
  question.value = null;
  idx.value = null;
  userAnswer.value = "";
};

const handleModeChange = (order) => {
  if (!currentBank.value) return;
  loadQuestion(order);
};

const loadQuestion = async (order) => {
  if (!currentBank.value) return;

  loading.value = true;
  resetQuestionState();

  if (isMistakeMode.value) {
    loadFromMistakeBook();
  } else {
    await loadFromApi(order);
  }

  if (question.value && isMultiChoice.value) {
    userAnswer.value = [];
  }

  loading.value = false;
};

const loadFromMistakeBook = () => {
  const book = getMistakeBook();
  if (!book.length) {
    question.value = null;
    ElMessage.success("错题库已清空");
    bankSelectorRef.value?.refreshBanks();
    return;
  }

  const randomIndex = Math.floor(Math.random() * book.length);
  const mistakeQuestion = book[randomIndex];
  question.value = mistakeQuestion;
  idx.value = mistakeQuestion.idx;
  userAnswer.value = mistakeQuestion.type === "多选题" ? [] : "";
};

const loadFromApi = async (order) => {
  try {
    const res = await getQuestion(currentBank.value, order);
    const apiData = res.data;
    idx.value = apiData.id;
    question.value = {
      ...apiData,
      idx: apiData.id,
    };
    userAnswer.value = apiData.type === "多选题" ? [] : "";
  } catch (error) {
    question.value = null;
    idx.value = null;
    userAnswer.value = "";
    ElMessage.error("加载题目失败，请稍后重试");
  }
};

const submit = async () => {
  if (!canSubmit.value || submitting.value) return;

  submitting.value = true;

  if (isMistakeMode.value) {
    submitInMistakeMode();
  } else {
    await submitToApi();
  }

  submitting.value = false;
};

const submitInMistakeMode = () => {
  const correctAnswer = question.value.answer;
  const isCorrect =
    formatAnswer(userAnswer.value) === formatAnswer(correctAnswer);

  const questionDataForEmit = {
    ...question.value,
    correctAnswer: formatAnswer(correctAnswer),
    userAnswer: formatAnswer(userAnswer.value),
    explanation: question.value.explanation,
  };

  submitted.value = true;
  explanation.value = question.value.explanation || "";

  if (isCorrect) {
    resultType.value = "success";
    resultTitle.value = "回答正确，这道题已从错题库移除";
    removeQuestionFromMistakeBook(question.value.idx);
    bankSelectorRef.value?.refreshBanks();
    ElMessage.success("回答正确");
    emit("answer-submitted", {
      isCorrect: true,
      questionData: questionDataForEmit,
    });
    return;
  }

  resultType.value = "error";
  resultTitle.value = `回答错误，正确答案：${formatAnswer(correctAnswer)}`;
  emit("answer-submitted", {
    isCorrect: false,
    questionData: questionDataForEmit,
  });
};

const submitToApi = async () => {
  try {
    const res = await submitAnswer(idx.value, userAnswer.value, currentBank.value);
    const { correct, answer, explanation: exp } = res.data;

    const questionDataForEmit = {
      ...question.value,
      correctAnswer: formatAnswer(answer),
      userAnswer: formatAnswer(userAnswer.value),
      explanation: exp,
      options: question.value.options,
    };

    if (correct) {
      emit("answer-submitted", {
        isCorrect: true,
        questionData: questionDataForEmit,
      });
      ElMessage({
        message: "回答正确",
        type: "success",
        duration: 1000,
      });
      setTimeout(() => {
        next();
      }, 1000);
      return;
    }

    submitted.value = true;
    resultTitle.value = `回答错误，正确答案：${formatAnswer(answer)}`;
    resultType.value = "error";
    explanation.value = exp;

    const fullQuestionData = { ...question.value, answer, explanation: exp };
    addQuestionToMistakeBook(fullQuestionData);
    bankSelectorRef.value?.refreshBanks();

    emit("answer-submitted", {
      isCorrect: false,
      questionData: questionDataForEmit,
    });
  } catch (error) {
    ElMessage.error("判题服务异常，请检查网络或服务状态");
  }
};

const formatAnswer = (answer) => {
  if (!answer) return "";

  let chars;
  if (Array.isArray(answer)) {
    chars = answer.map(String);
  } else {
    chars = String(answer).replace(/,/g, "").split("");
  }

  return chars.sort().join("");
};

const next = () => {
  submitting.value = false;
  loadQuestion(questionMod.value);
};

const resetQuestion = () => {
  loadQuestion(questionMod.value);
};

const onBankChange = (bank) => {
  currentBank.value = bank;
  emit("bank-changed", bank);
  if (bank) {
    loadQuestion(questionMod.value);
  } else {
    resetQuestionState();
  }
};

defineExpose({ resetQuestion });
</script>

<style scoped>
.quiz-shell {
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(18px);
}

.quiz-topbar {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 4px 4px 28px;
}

.topbar-copy h3 {
  margin: 14px 0 10px;
  font-size: 30px;
  letter-spacing: -0.02em;
}

.topbar-copy p {
  margin: 0;
  max-width: 580px;
  color: #62748f;
  line-height: 1.8;
}

.section-kicker {
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

.topbar-actions {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 240px;
}

.mode-panel {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 20px;
  border: 1px solid rgba(133, 158, 196, 0.15);
  background: linear-gradient(180deg, #f8fbff, #ffffff);
}

.mode-label {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: baseline;
}

.mode-label span {
  color: #70819c;
  font-size: 13px;
}

.mode-label strong {
  color: #16233c;
  font-size: 15px;
}

.mode-switch {
  justify-self: end;
}

.sync-tip {
  color: #70819c;
  font-size: 13px;
  text-align: right;
}

.main-content-area,
.question-container,
.loading-state,
.empty-state {
  min-height: 520px;
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-card {
  width: 100%;
  padding: 26px;
  border-radius: 28px;
  background: linear-gradient(180deg, #fbfdff 0%, #ffffff 100%);
  border: 1px solid rgba(133, 158, 196, 0.15);
}

.question-stage {
  display: grid;
  gap: 18px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.meta-tag {
  border-radius: 999px;
}

.bank-indicator {
  display: grid;
  justify-items: end;
  gap: 6px;
  padding: 14px 16px;
  min-width: 180px;
  border-radius: 20px;
  border: 1px solid rgba(133, 158, 196, 0.15);
  background: rgba(255, 255, 255, 0.86);
}

.bank-indicator span {
  color: #7c8ca6;
  font-size: 12px;
}

.bank-indicator strong {
  color: #17233c;
  font-size: 15px;
}

.question-card {
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(250, 252, 255, 0.98), #ffffff);
  border: 1px solid rgba(133, 158, 196, 0.15);
  box-shadow: 0 16px 34px rgba(24, 46, 84, 0.06);
}

.question-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
}

.question-index {
  display: inline-flex;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(33, 118, 255, 0.1);
  color: #1658c0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.question-head h2 {
  margin: 14px 0 0;
  font-size: clamp(24px, 3vw, 32px);
  line-height: 1.45;
  text-align: left;
  color: #17233c;
}

.question-hint {
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 188px;
  padding: 16px;
  border-radius: 20px;
  background: #f6f9ff;
  color: #64758f;
  font-size: 13px;
}

.question-hint strong {
  color: #17233c;
  font-size: 16px;
}

.answer-input :deep(.el-textarea__inner) {
  min-height: 140px;
  border-radius: 20px;
  padding: 18px 20px;
  font-size: 15px;
  line-height: 1.8;
  box-shadow: none;
}

.option-group {
  display: grid;
  gap: 14px;
}

.option-card {
  width: 100%;
  min-height: 72px;
  margin: 0 !important;
  padding: 0 18px;
  border: 1px solid rgba(133, 158, 196, 0.22);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.option-card:hover {
  transform: translateY(-2px);
  border-color: rgba(33, 118, 255, 0.34);
  box-shadow: 0 16px 22px rgba(33, 118, 255, 0.08);
}

.option-card :deep(.el-checkbox__input),
.option-card :deep(.el-radio__input) {
  display: none;
}

.option-card :deep(.el-checkbox__label),
.option-card :deep(.el-radio__label) {
  width: 100%;
  padding-left: 0;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  white-space: normal;
  color: #24324b;
}

.option-card.is-checked {
  border-color: #2176ff;
  background: rgba(33, 118, 255, 0.08);
  box-shadow: 0 16px 26px rgba(33, 118, 255, 0.12);
}

.option-card.is-checked :deep(.el-checkbox__label),
.option-card.is-checked :deep(.el-radio__label) {
  color: #1658c0;
}

.option-prefix {
  flex: 0 0 auto;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(24, 40, 72, 0.06);
  font-size: 13px;
  font-weight: 800;
  color: #17233c;
}

.option-card.is-checked .option-prefix {
  background: #2176ff;
  color: #ffffff;
}

.option-text {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  line-height: 1.75;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  padding: 18px 22px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.96), #ffffff);
  border: 1px solid rgba(133, 158, 196, 0.15);
}

.action-buttons {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.submit-button.el-button {
  min-width: 140px;
  min-height: 48px;
  border: none;
  background: linear-gradient(135deg, #2176ff 0%, #0ea5e9 100%);
  box-shadow: 0 16px 28px rgba(33, 118, 255, 0.2);
}

.submit-button.el-button:hover {
  transform: translateY(-1px);
}

.next-button.el-button {
  min-width: 124px;
  min-height: 48px;
  border-color: rgba(33, 118, 255, 0.22);
  color: #1658c0;
  background: rgba(33, 118, 255, 0.08);
}

.action-caption {
  color: #6e7f99;
  text-align: right;
  line-height: 1.7;
}

.result-panel {
  padding: 20px 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(133, 158, 196, 0.15);
}

.explanation-panel {
  margin-top: 16px;
  padding: 18px 20px;
  border-radius: 18px;
  background: #f8fbff;
}

.explanation-title {
  color: #17233c;
  font-weight: 700;
}

.explanation-panel p {
  margin: 10px 0 0;
  color: #5f6f89;
  line-height: 1.8;
}

.empty-illustration {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 240px;
  height: 180px;
}

.empty-orb {
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(33, 118, 255, 0.2), transparent 66%);
}

.empty-card {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  width: 200px;
  padding: 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(133, 158, 196, 0.16);
  box-shadow: 0 18px 36px rgba(27, 49, 89, 0.08);
}

.empty-card strong {
  color: #17233c;
  font-size: 16px;
}

.empty-card span {
  color: #667892;
  line-height: 1.7;
}

.question-change-enter-active,
.question-change-leave-active {
  transition: all 0.25s ease;
}

.question-change-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.question-change-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 980px) {
  .quiz-topbar,
  .question-head,
  .meta-row,
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .bank-indicator,
  .question-hint,
  .topbar-actions {
    min-width: 0;
  }

  .sync-tip,
  .action-caption {
    text-align: left;
  }

  .question-card {
    padding: 22px 18px;
  }
}
</style>
