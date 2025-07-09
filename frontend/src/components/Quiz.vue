<template>
  <el-card class="quiz-card">
    <div class="card-header">
      <h3>答题区</h3>
      <el-switch
        v-model="questionMod"
        inline-prompt
        class="mode-switch"
        style="--el-switch-on-color: #13ce66; --el-switch-off-color: #409eff"
        active-text="顺序答题"
        inactive-text="随机答题"
        @change="handleModeChange"
      >
      </el-switch>
      <!-- 【新】添加 ref，以便在脚本中调用其方法 -->
      <BankSelector ref="bankSelectorRef" @bank-change="onBankChange" />
    </div>

    <!-- 条件渲染的根容器 -->
    <div class="main-content-area">
      <!-- 加载状态 -->
      <div v-if="loading" class="placeholder">
        <el-skeleton :rows="5" animated />
      </div>

      <!-- 题目显示区域 -->
      <div v-else-if="question" class="question-container">
        <Transition name="question-change" mode="out-in">
          <div :key="idx" class="question-wrapper">
            <!-- ... 您原来的题目显示部分，无需改动 ... -->
            <div style="margin-bottom: 16px">
              <el-tag type="primary" style="margin-right: 8px">{{
                question.type
              }}</el-tag>
              <el-tag
                v-if="question.meta?.['题目分类']"
                type="success"
                style="margin-right: 8px"
                >{{ question.meta["题目分类"] }}</el-tag
              >
              <el-tag v-if="question.meta?.['一级纲要']" type="warning">{{
                question.meta["一级纲要"]
              }}</el-tag>
            </div>
            <div
              style="
                margin-bottom: 24px;
                text-align: left;
                font-size: 1.1em;
                line-height: 1.6;
              "
            >
              {{ question.question }}
            </div>
            <el-input
              v-if="isShortAnswer"
              v-model="userAnswer"
              type="textarea"
              :rows="4"
              placeholder="请输入你的答案"
              style="margin-bottom: 16px"
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
                class="duoxuan"
              >
                {{ String.fromCharCode(65 + i) + ". " + opt }}
              </el-checkbox>
            </el-checkbox-group>
            <el-radio-group v-else v-model="userAnswer" class="option-group">
              <el-radio
                v-for="(opt, i) in question.options"
                :key="i"
                :label="isJudge ? opt : String.fromCharCode(65 + i)"
                class="danxuan"
              >
                {{ isJudge ? opt : String.fromCharCode(65 + i) + ". " + opt }}
              </el-radio>
            </el-radio-group>
            <!-- ... 您原来的题目显示部分结束 ... -->

            <div style="margin-top: 24px">
              <div class="button-group">
                <el-button
                  class="submit-button"
                  type="primary"
                  size="large"
                  round
                  :icon="Check"
                  @click="submit"
                  :disabled="
                    (isMultiChoice ? userAnswer.length === 0 : !userAnswer) ||
                    submitted ||
                    submitting
                  "
                  :loading="submitting"
                >
                  {{ submitting ? "判题中..." : "提交" }}
                </el-button>
                <!-- 【改】修改 v-if 条件，在错题库模式下答对或答错后都显示“下一题” -->
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
            </div>

            <!-- 【改】修改 v-if 条件，只要提交了就显示结果区域，而不仅是答错时 -->
            <div v-if="submitted" style="margin-top: 24px; text-align: left">
              <el-alert
                :title="resultTitle"
                :type="resultType"
                :closable="false"
                show-icon
              />
              <!-- 【改】增加 v-if，只有存在解析时才显示解析区域 -->
              <div
                v-if="explanation"
                style="
                  margin-top: 16px;
                  padding: 16px;
                  background-color: #f7f8fa;
                  border-radius: 8px;
                "
              >
                <strong style="color: #303133">【深度解析】</strong>
                <p style="margin: 8px 0 0 0; color: #606266; line-height: 1.7">
                  {{ explanation }}
                </p>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- 空状态 -->
      <div v-else class="placeholder">
        <!-- 【改】动态显示空状态的描述文本 -->
        <el-empty :description="emptyDescription" />
      </div>
    </div>
  </el-card>
</template>

<script setup>
// --- Script 部分，在您原有代码基础上进行修改 ---
import { ref, computed } from "vue";
import { getQuestion, submitAnswer } from "../api";
import BankSelector from "./BankSelector.vue";
import { Check, ArrowRight } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

// 【新】引入错题库工具和常量
import {
  MISTAKE_BOOK_ID,
  getMistakeBook,
  addQuestionToMistakeBook,
  removeQuestionFromMistakeBook,
} from "../utils/mistakeBook";

// 【新】创建对 BankSelector 组件的引用
const bankSelectorRef = ref(null);

const questionMod = ref(true); 

// --- 您的原有状态，保持不变 ---
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

// --- 您的原有计算属性，稍作补充 ---
const isJudge = computed(() => {
  if (!question.value?.options) return false;
  const opts = question.value.options.map((o) => o.trim());
  return (
    opts.length === 2 &&
    ((opts[0] === "正确" && opts[1] === "错误") ||
      (opts[0] === "对" && opts[1] === "错"))
  );
});
const isShortAnswer = computed(() => question.value?.type === "简答题");
const isMultiChoice = computed(() => question.value?.type === "多选题");

// 【新】增加一个计算属性，判断当前是否是错题库模式
const isMistakeMode = computed(() => currentBank.value === MISTAKE_BOOK_ID);

const emit = defineEmits(["answer-submitted", "bank-changed"]);

// 【新】动态计算空状态的描述
const emptyDescription = computed(() => {
  if (isMistakeMode.value) {
    return "恭喜！错题库已清空，继续加油！";
  }
  return "请先选择一个题库开始答题";
});

// 【新增】处理切换模式的事件

const handleModeChange = (e) => {
  console.log("切换模式:", e);
  // 切换模式后，我们应该从头开始获取题目，以避免逻辑混乱
  // 比如从随机模式切换到顺序模式，应该从第一题开始
  loadQuestion(e); 
};

// 【改】重构 loadQuestion 方法，以支持两种模式
// 在 Quiz.vue 中，修改 loadQuestion 函数
const loadQuestion = async (isReset) => {
  if (!currentBank.value) return;
  loading.value = true;

  // --- 在这里提前重置所有状态 ---
  submitted.value = false;
  resultTitle.value = "";
  explanation.value = "";
  question.value = null; // 先清空题目
  idx.value = null; // 【核心修正】提前重置 idx
  userAnswer.value = ""; // 提前重置答案
  // --------------------------------

  if (isMistakeMode.value) {
    loadFromMistakeBook();
  } else {
    await loadFromApi(isReset);
  }

  // 如果是多选题，在加载成功后再特殊处理 userAnswer
  if (question.value && isMultiChoice.value) {
    userAnswer.value = [];
  }

  loading.value = false;
};

// 【新】从本地错题库加载题目的逻辑
const loadFromMistakeBook = () => {
  const book = getMistakeBook();
  if (book.length > 0) {
    const randomIndex = Math.floor(Math.random() * book.length);
    const mistakeQuestion = book[randomIndex];
    question.value = mistakeQuestion;
    idx.value = mistakeQuestion.idx;
    userAnswer.value = isMultiChoice.value ? [] : "";
  } else {
    question.value = null; // 标志错题库已空
    ElMessage.success("太棒了！所有错题都已掌握！");
    bankSelectorRef.value?.refreshBanks(); // 刷新题库列表，让错题库卡片消失
  }
};

// 【新】从API加载题目的逻辑（从您原有的 loadQuestion 中提取）
// 在 Quiz.vue 中，修改 loadFromApi 函数

const loadFromApi = async (order) => {
  try {
    const res = await getQuestion(currentBank.value, order);
    const apiData = res.data; // 先将后端数据存入临时变量
    // 1. 设置独立的 idx 状态，这部分逻辑是正确的，保持不变
    idx.value = apiData.id;
    // 2. 创建 question.value 对象时，手动将 id 赋值给 idx 属性
    question.value = {
      ...apiData, // 展开所有从后端获取的属性 (question, options, type, id, meta等)
      idx: apiData.id, // 额外添加或覆盖一个 idx 属性，使其与 id 的值相同
    };
    // --- 修改结束 ---
    // 后续逻辑保持不变
    userAnswer.value = isMultiChoice.value ? [] : "";
    console.log("题目加载成功，ID (idx):", idx.value); // 日志可以改得更清晰
  } catch (e) {
    console.error("加载题目失败:", e);
    question.value = null;
    idx.value = null;
    userAnswer.value = "";
    ElMessage.error("加载题目失败！请检查网络或刷新页面。");
  }
};

// 【改】重构 submit 方法，以支持两种判题模式
const submit = async () => {
  // 在这里添加日志打印
  if (
    (isMultiChoice.value ? userAnswer.value.length === 0 : !userAnswer.value) ||
    submitting.value
  )
    return;
  submitting.value = true;

  if (isMistakeMode.value) {
    submitInMistakeMode();
  } else {
    await submitToApi();
  }

  submitting.value = false;
};

const submitInMistakeMode = () => {
  // 错题库中的题目对象必须包含 answer 和 explanation 字段
  const correctAnswer = question.value.answer;
  const isCorrect =
    formatAnswer(userAnswer.value) === formatAnswer(correctAnswer);
  // 【核心修正】无论对错，都先准备好要 emit 的完整数据
  const questionDataForEmit = {
    ...question.value, // 包含原始问题、选项、类型、idx等
    correctAnswer: formatAnswer(correctAnswer),
    userAnswer: formatAnswer(userAnswer.value),
    explanation: question.value.explanation,
  };
  submitted.value = true;
  if (isCorrect) {
    resultType.value = "success";
    resultTitle.value = "回答正确！该题已掌握";
    explanation.value = question.value.explanation;
    ElMessage.success("回答正确！已从错题库移除。");
    removeQuestionFromMistakeBook(question.value.idx);
    bankSelectorRef.value?.refreshBanks(); // 实时更新题库卡片
    // 【修改】发送结构统一的数据
    emit("answer-submitted", {
      isCorrect: true,
      questionData: questionDataForEmit,
    });
  } else {
    resultType.value = "error";
    resultTitle.value = `回答错误，正确答案：${formatAnswer(correctAnswer)}`;
    explanation.value = question.value.explanation;
    // 【修改】发送结构统一的数据
    emit("answer-submitted", {
      isCorrect: false,
      questionData: questionDataForEmit,
    });
  }
};

// 【新】提交到API进行判题（从您原有的 submit 中提取）
// 在 Quiz.vue 中
const submitToApi = async () => {
  // 【新增】安全检查：如果题目 ID 不存在，则阻止提交并提示

  try {
    const res = await submitAnswer(
      idx.value,
      userAnswer.value,
      currentBank.value
    );
    const { correct, answer, explanation: exp } = res.data;

    // 【核心修改】将 questionData 的构建逻辑提前，确保 emit 时总能使用
    const questionDataForEmit = {
      ...question.value,
      correctAnswer: formatAnswer(answer),
      userAnswer: formatAnswer(userAnswer.value),
      explanation: exp,
      options: question.value.options, // 保留选项信息
    };

    if (correct) {
      // 【修改】答对时，也发送完整的 questionData
      emit("answer-submitted", {
        isCorrect: true,
        questionData: questionDataForEmit,
      });

      ElMessage({ message: "回答正确！", type: "success", duration: 1000 });
      setTimeout(() => {
        next();
      }, 1000);
    } else {
      submitted.value = true;
      resultTitle.value = `回答错误，正确答案：${formatAnswer(answer)}`;
      resultType.value = "error";
      explanation.value = exp;

      // 【核心】将错题加入错题库
      const fullQuestionData = { ...question.value, answer, explanation: exp };
      addQuestionToMistakeBook(fullQuestionData);
      bankSelectorRef.value?.refreshBanks(); // 实时更新题库卡片

      // 【修改】现在这里的 emit 和答对时的结构完全一致
      emit("answer-submitted", {
        isCorrect: false,
        questionData: questionDataForEmit,
      });
    }
  } catch (e) {
    // 现在的 catch 块更有可能是真正的网络或服务器问题
    console.error("判题服务API调用失败:", e); // 在控制台打印详细错误，方便调试
    ElMessage.error("判题服务异常，请检查网络或联系管理员！");
  }
};

// 在 Quiz.vue 的 <script setup> 中，替换掉旧的 formatAnswer

const formatAnswer = (ans) => {
  if (!ans) return "";
  let chars;
  if (Array.isArray(ans)) {
    // 如果是数组 ['A', 'B', 'D']
    chars = ans.map(String);
  } else {
    // 如果是字符串 "ABD" 或 "A,B,D"，先去掉逗号再拆成字符数组
    chars = String(ans).replace(/,/g, "").split("");
  }
  // 统一排序并连接成字符串
  return chars.sort().join("");
};

const next = () => {
  // 【改】在切换下一题前重置提交状态，确保按钮可用
  submitting.value = false;
  loadQuestion();
};
const resetQuestion = () => {
  loadQuestion();
};
const onBankChange = (bank) => {
  currentBank.value = bank;
  emit("bank-changed", bank);
  if (bank) {
    loadQuestion();
  } else {
    question.value = null;
  }
};

defineExpose({ resetQuestion });
</script>

<style scoped>
/* 您的所有样式都无需改动 */
.quiz-card {
  /* width: 600px; */
  border-radius: 16px;
  padding: 16px 24px;
}

.main-content-area,
.placeholder,
.question-container {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.question-container {
  justify-content: flex-start;
}

.question-change-enter-active,
.question-change-leave-active {
  transition: all 0.25s ease-in-out;
}

.question-change-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.question-change-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.card-header {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.card-header h3 {
  margin: 0;
  color: #303133;
}

.option-group {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 12px;
}

.danxuan,
.duoxuan {
  width: 100%;
  min-height: 44px;
  padding: 12px 15px;
  margin: 0 !important;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background-color: #fff;
  box-sizing: border-box;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.danxuan:hover,
.duoxuan:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
}

.danxuan.is-checked,
.duoxuan.is-checked {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.danxuan :deep(.el-radio__input),
.duoxuan :deep(.el-checkbox__input) {
  display: none;
}

.danxuan :deep(.el-radio__label),
.duoxuan :deep(.el-checkbox__label) {
  padding-left: 0;
  font-size: 15px;
  color: #303133;
  white-space: normal;
  line-height: 1.5;
}

.danxuan.is-checked :deep(.el-radio__label),
.duoxuan.is-checked :deep(.el-checkbox__label) {
  color: #409eff;
  font-weight: bold;
}

.button-group {
  display: flex;
  gap: 16px;
}

/* ... 您的按钮样式 ... */
.submit-button.el-button {
  background: transparent;
  border: none;
  color: #fff;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08);
}

.submit-button.el-button::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, #6a82fb, #fc5c7d);
  background-size: 200% 200%;
  transition: background-position 0.5s ease;
  z-index: 0;
}

.submit-button.el-button :deep(.el-icon),
.submit-button.el-button :deep(span) {
  position: relative;
  z-index: 1;
}

.submit-button.el-button:not(.is-disabled):hover {
  transform: translateY(-3px);
  box-shadow: 0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
}

.submit-button.el-button:not(.is-disabled):hover::before {
  background-position: right center;
}

.submit-button.el-button.is-disabled {
  box-shadow: none;
  background-color: #f5f7fa;
  border-color: #e4e7ed;
  color: #c0c4cc;
}

.submit-button.el-button.is-disabled::before {
  background: none;
}

.next-button.el-button {
  background-color: #fff;
  color: #409eff;
  border: 1px solid #409eff;
  transition: all 0.3s ease;
}

.next-button.el-button:not(.is-disabled):hover {
  background-color: #409eff;
  color: #fff;
  transform: translateY(-2px);
}

.next-button.el-button.is-disabled {
  background-color: #f5f7fa;
  border-color: #e4e7ed;
  color: #c0c4cc;
}

.mode-switch{
  height: 72px;
}
</style>
