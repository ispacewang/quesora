<template>
  <el-card class="exam-card">
    <div class="exam-body">
      <!-- 左侧：答题卡 -->
      <div class="left-panel">
        <div class="card-grid">
          <div
            v-for="(ans, idx) in answers"
            :key="idx"
            class="card-item"
            :class="{
              current: idx === currentIdx,
              answered: ans !== null,
              marked: markedSet.has(idx), // 新增：标记样式
              correct: submitted && correctSet.has(idx),
              wrong: submitted && wrongSet.has(idx),
            }"
            @click="goTo(idx)"
          >
            {{ idx + 1 }}
            <!-- 新增：标记小图标 -->
            <span v-if="markedSet.has(idx)" class="mark-indicator">🚩</span>
          </div>
        </div>
      </div>
      <!-- 中间：题目内容和答题区 -->
      <div class="main-panel">
        <div class="exam-info">
          <b>题库：</b>{{ examInfo.bank }}
          <span style="margin-left: 24px"
            ><b>时长：</b>{{ examInfo.duration }}分钟</span
          >
          <span style="margin-left: 24px"
            ><b>当前题：</b>{{ currentIdx + 1 }}/{{ questions.length }}</span
          >
          <span v-if="examStarted" style="margin-left: 24px; color: #f56c6c"
            ><b>剩余时间：</b>{{ timeStr }}</span
          >
          <el-button
            v-if="examStarted && !submitted"
            type="warning"
            size="small"
            style="float: right"
            @click="onExitExam"
            >退出考试</el-button
          >
        </div>
        <div v-if="examStarted && questions.length">
          <div class="question-panel">
            <!-- START: 修改题目头部，增加标记按钮 -->
            <div class="question-title">
              <div>
                <span class="q-idx">第{{ currentIdx + 1 }}题</span>
                <span class="q-type">（{{ questions[currentIdx].type }}）</span>
              </div>
              <el-button
                :type="markedSet.has(currentIdx) ? 'warning' : 'default'"
                plain
                size="small"
                @click="toggleMark"
              >
                {{ markedSet.has(currentIdx) ? '取消标记' : '标记此题' }}
              </el-button>
            </div>
            <!-- END: 修改题目头部 -->
            <div style="margin-bottom: 16px">
              <el-tag type="primary" style="margin-right: 8px">{{
                questions[currentIdx].type
              }}</el-tag>
              <el-tag
                v-if="
                  questions[currentIdx].meta &&
                  questions[currentIdx].meta['题目分类']
                "
                type="success"
                style="margin-right: 8px"
                >{{ questions[currentIdx].meta["题目分类"] }}</el-tag
              >
              <el-tag
                v-if="
                  questions[currentIdx].meta &&
                  questions[currentIdx].meta['一级纲要']
                "
                type="warning"
                >{{ questions[currentIdx].meta["一级纲要"] }}</el-tag
              >
            </div>
            <div
              style="
                margin-bottom: 24px;
                text-align: left;
                font-size: 1.1em;
                line-height: 1.6;
              "
            >
              {{ questions[currentIdx].question }}
            </div>
            <el-input
              v-if="questions[currentIdx].type === '简答题'"
              v-model="answers[currentIdx]"
              type="textarea"
              :rows="4"
              placeholder="请输入你的答案"
              style="margin-bottom: 16px"
            />
            <div
              v-else-if="questions[currentIdx].type === '多选题'"
              class="option-group row-options"
            >
              <div
                v-for="(opt, i) in questions[currentIdx].options"
                :key="i"
                class="row-option-item"
                :class="{
                  'is-checked':
                    answers[currentIdx] &&
                    answers[currentIdx].includes(String.fromCharCode(65 + i)),
                }"
                @click="toggleMultiOption(i)"
              >
                <span class="option-label"
                  >{{ String.fromCharCode(65 + i) }}.</span
                >
                {{ opt }}
              </div>
            </div>
            <el-radio-group
              v-else
              v-model="answers[currentIdx]"
              class="option-group row-options"
            >
              <el-radio
                v-for="(opt, i) in questions[currentIdx].options"
                :key="i"
                :label="String.fromCharCode(65 + i)"
                class="danxuan column-option-item"
              >
                <span class="option-label"
                  >{{ String.fromCharCode(65 + i) }}.</span
                >
                {{ opt }}
              </el-radio>
            </el-radio-group>
            <div class="question-actions" style="margin-top: 24px">
              <el-button @click="prev" :disabled="currentIdx === 0"
                >上一题</el-button
              >
              <el-button
                @click="next"
                :disabled="currentIdx === questions.length - 1"
                >下一题</el-button
              >
              <el-button
                type="danger"
                @click="onSubmitExam"
                :disabled="submitted"
                >交卷</el-button
              >
            </div>
            <div v-if="submitted" style="margin-top: 24px; text-align: left">
              <el-alert
                :title="'请查看得分与错题'"
                type="info"
                :closable="false"
                show-icon
              />
            </div>
          </div>
        </div>
        <div v-else-if="submitted">
          <el-result icon="success" title="考试结束">
            <template #sub-title>
              <div
                style="
                  font-size: 38px;
                  font-weight: bold;
                  color: #409eff;
                  letter-spacing: 2px;
                  text-shadow: 2px 4px 12px #b3d8ff;
                  margin-bottom: 10px;
                "
              >
                得分：{{ score }} / {{ questions.length }}
              </div>
            </template>
            <template #extra>
              <div v-if="wrongSet.size">
                <div
                  v-for="idx in Array.from(wrongSet)"
                  :key="idx"
                  class="wrong-detail"
                >
                  <div style="margin-bottom: 2px">
                    <b style="color: #f56c6c">第{{ idx + 1 }}题：</b
                    >{{ questions[idx].question }}
                  </div>
                  <div style="margin-bottom: 2px">
                    <ul class="wrong-options">
                      <li
                        v-for="(opt, i) in questions[idx].options"
                        :key="i"
                        :class="{
                          'correct-answer': wrongDetails[idx]
                            ? wrongDetails[idx].answer.includes(
                                String.fromCharCode(65 + i)
                              )
                            : false,
                        }"
                      >
                        {{ String.fromCharCode(65 + i) }}. {{ opt }}
                      </li>
                    </ul>
                  </div>
                  <div style="margin-bottom: 2px">
                    <span style="color: #909399">你的答案：</span>
                    <span style="color: #f56c6c; font-weight: bold">{{
                      formatUserAnswer(answers[idx], questions[idx])
                    }}</span>
                  </div>
                  <div style="margin-bottom: 2px">
                    <span style="color: #67c23a">正确答案：</span>
                    <span style="color: #67c23a; font-weight: bold">{{
                      wrongDetails[idx] ? wrongDetails[idx].answer : '未知'
                    }}</span>
                  </div>
                  <div
                    v-if="wrongDetails[idx] && wrongDetails[idx].explanation"
                    style="color: #409eff; margin-bottom: 8px; text-align: left"
                  >
                    解析：{{ wrongDetails[idx].explanation }}
                  </div>
                  <el-divider style="margin: 8px 0" />
                </div>
              </div>
              <div v-else>全部答对！</div>
              <el-button
                type="primary"
                size="large"
                style="margin-top: 28px; font-size: 20px"
                @click="onExitExam"
                >退出考试</el-button
              >
            </template>
          </el-result>
        </div>
        <div v-else style="text-align: center">正在生成试卷...</div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import * as api from '../api';
import axios from 'axios';

const props = defineProps({
  examInfo: { type: Object, required: true },
});

const questions = ref([]);
const answers = ref([]); // 每题的答案，未答为null
const markedSet = ref(new Set()); // 新增：用于存储标记的题目索引
const currentIdx = ref(0);
const timer = ref(null);
const timeLeft = ref(0);
const examStarted = ref(false);
const submitted = ref(false);
const score = ref(0);
const wrongSet = ref(new Set());
const correctSet = ref(new Set());
const wrongDetails = ref({});

const timeStr = computed(() => {
  const m = Math.floor(timeLeft.value / 60)
    .toString()
    .padStart(2, '0');
  const s = (timeLeft.value % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
});

// 生成试卷
const generatePaper = async () => {
  const res = await axios.get('/generate-paper', {
    params: { bankName: props.examInfo.bank },
  });
  questions.value = res.data;
  answers.value = Array(questions.value.length).fill(null);
  markedSet.value = new Set(); // 新增：重置标记集合
  currentIdx.value = 0;
  timeLeft.value = (props.examInfo.duration || 60) * 60;
  examStarted.value = true;
  submitted.value = false;
  score.value = 0;
  wrongSet.value = new Set();
  correctSet.value = new Set();
  if (timer.value) clearInterval(timer.value);
  timer.value = setInterval(() => {
    timeLeft.value--;
    if (timeLeft.value <= 0) {
      clearInterval(timer.value);
      submitExam();
    }
  }, 1000);
};

watch(
  () => props.examInfo,
  (val) => {
    if (val && val.bank) {
      generatePaper();
    }
  },
  { immediate: true }
);

const goTo = (idx) => {
  if (!examStarted.value) return;
  currentIdx.value = idx;
};
const prev = () => {
  if (currentIdx.value > 0) currentIdx.value--;
};
const next = () => {
  if (currentIdx.value < questions.value.length - 1) currentIdx.value++;
};

// 新增：标记/取消标记题目
const toggleMark = () => {
  if (markedSet.value.has(currentIdx.value)) {
    markedSet.value.delete(currentIdx.value);
  } else {
    markedSet.value.add(currentIdx.value);
  }
};

// 多选题选项切换
function toggleMultiOption(i) {
  const label = String.fromCharCode(65 + i);
  if (!Array.isArray(answers.value[currentIdx.value])) {
    answers.value[currentIdx.value] = [];
  }
  const arr = answers.value[currentIdx.value];
  const idx = arr.indexOf(label);
  if (idx === -1) {
    arr.push(label);
  } else {
    arr.splice(idx, 1);
  }
  // 触发响应式
  answers.value[currentIdx.value] = [...arr];
}

// 退出考试
const emit = defineEmits(['exit-exam']);
const onExitExam = () => {
  ElMessageBox.confirm(
    '确定要退出考试吗？退出后本次答题将不会保存。',
    '退出确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    emit('exit-exam');
  });
};

// 交卷二次确认+未答题校验
const onSubmitExam = async () => {
  if (submitted.value) return;
  // 检查是否有未答题
  const unanswered = answers.value.findIndex((ans, idx) => {
    if (questions.value[idx].type === '多选题')
      return !Array.isArray(ans) || ans.length === 0;
    return ans == null || ans === '';
  });
  if (unanswered !== -1) {
    ElMessage.warning(`第${unanswered + 1}题未作答，请全部作答后再交卷！`);
    return;
  }
  ElMessageBox.confirm('确定要交卷吗？交卷后将立即判分。', '交卷确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    await submitExam();
  });
};

function formatUserAnswer(ans, q) {
  if (q.type === '多选题' && Array.isArray(ans)) return ans.join(', ');
  return ans;
}

// 判题逻辑，调用api.js接口
const submitExam = async () => {
  if (submitted.value) return;
  clearInterval(timer.value);
  submitted.value = true;
  examStarted.value = false; // 交卷后关闭考试状态，显示结果页
  let correctCount = 0;
  const wrong = new Set();
  const correct = new Set();
  const wrongDetailObj = {};
  for (let i = 0; i < questions.value.length; i++) {
    const q = questions.value[i];
    const ans = answers.value[i];
    let resp;
    try {
      resp = await api.submitAnswer(q.id, ans, props.examInfo.bank);
    } catch (e) {
      wrong.add(i);
      continue;
    }
    if (resp.data && resp.data.correct) {
      correctCount++;
      correct.add(i);
    } else {
      wrong.add(i);
      if (resp.data) {
        wrongDetailObj[i] = {
          answer: resp.data.answer,
          explanation: resp.data.explanation,
        };
      }
    }
  }
  score.value = correctCount;
  wrongSet.value = wrong;
  correctSet.value = correct;
  wrongDetails.value = wrongDetailObj;
};

onUnmounted(() => {
  if (timer.value) clearInterval(timer.value);
});
</script>

<style scoped>
.exam-card {
  width: 1100px;
  min-height: 700px;
  margin: 30px auto;
  border-radius: 16px;
}
.exam-body {
  display: flex;
  flex-direction: row;
}
.left-panel {
  width: 180px;
  margin-right: 30px;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.card-item {
  width: 30px;
  height: 30px;
  background: #f2f2f2;
  border-radius: 4px;
  text-align: center;
  line-height: 30px;
  font-size: 14px;
  cursor: pointer;
  border: 1.5px solid #dcdfe6;
  transition: all 0.2s;
  position: relative; /* 新增：为角标定位 */
}
.card-item.current {
  border: 2px solid #409eff;
  background: #e6f7ff;
  font-weight: bold;
}
.card-item.answered {
  background: #e1f3d8;
  border-color: #67c23a;
}

/* START: 新增标记样式 */
.card-item.marked {
  border-color: #e6a23c;
}
.mark-indicator {
  position: absolute;
  top: -8px;
  right: -5px;
  font-size: 14px;
}
/* END: 新增标记样式 */

.card-item.correct {
  border: 2px solid #67c23a;
}
.card-item.wrong {
  border: 2px solid #f56c6c;
}
.main-panel {
  flex: 1;
  min-width: 0;
}
.exam-info {
  margin-bottom: 18px;
  font-size: 16px;
}
.question-panel {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 24px 32px 18px 32px;
  margin-bottom: 18px;
}
/* 修改：使用flex布局对齐标题和按钮 */
.question-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}
.q-idx {
  color: #409eff;
}
.q-type {
  color: #909399;
  margin-left: 8px;
}
.question-content {
  font-size: 17px;
  margin-bottom: 18px;
  line-height: 1.7;
}
.options-panel {
  margin-bottom: 18px;
}
.option-label {
  font-weight: bold;
  margin-right: 4px;
}
.question-actions {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}
.row-options {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 18px;
  margin-bottom: 18px;
}
.row-option-item {
  width: 100%;
  min-height: 44px;
  padding: 12px 15px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background-color: #fff;
  box-sizing: border-box;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  font-size: 16px;
  cursor: pointer;
  margin: 0 !important;
}
/* 隐藏原生checkbox/radio圆圈 */
.row-option-item :deep(.el-checkbox__input),
.column-option-item :deep(.el-radio__input) {
  display: none !important;
}
/* 选中高亮 */
.row-option-item.is-checked,
.column-option-item.is-checked {
  border-color: #409eff;
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: bold;
}
.column-options {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 18px;
}
.column-option-item {
  width: 100%;
  min-height: 44px;
  padding: 12px 15px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background-color: #fff;
  box-sizing: border-box;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 30px;
  font-size: 16px;
  flex-direction: row;
}
.column-option-item:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
}
.column-option-item.is-checked {
  border-color: #409eff;
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: bold;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.wrong-options li {
  margin-bottom: 6px;
  color: #606266;
  text-align: left;
  text-decoration: none;
}

.wrong-options .correct-answer {
  color: #67c23a;
  font-weight: bold;
}
</style>
