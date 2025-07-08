<!-- src/App.vue -->
<script setup>
import { ref, onMounted } from 'vue';
import Quiz from './components/Quiz.vue';
import StatsCard from './components/StatsCard.vue';
import WrongAnswerCard from './components/WrongAnswerCard.vue';
import Exam from './components/Exam.vue';
import { ElMessage } from 'element-plus';

// --- 您原有的代码 ---
const quizRef = ref(null);
const quizStats = ref({ correct: 0, incorrect: 0 });
const wrongAnswers = ref([]);

// 2. 新增一个 ref 来存储当前题库名称
const currentBankName = ref('');

// 考试相关状态
const isExamMode = ref(false); // 是否处于考试模式
const examInfo = ref(null);   // 考试详情对象

const handleAnswerSubmitted = (result) => {
if (result.isCorrect) {
  quizStats.value.correct++;
} else {
  quizStats.value.incorrect++;
  // 【核心修正】使用 `idx` 进行去重判断，而不是 `id`
  if (result.questionData && !wrongAnswers.value.some(item => item.questionData.idx === result.questionData.idx)) {
    // unshift 的是 result，它本身就包含了 isCorrect 和 questionData
    wrongAnswers.value.unshift(result);
    console.log('错题本更新:', wrongAnswers.value);
  }
}

};

const onUploaded = (newBank) => { // 假设上传后会返回新的题库信息
  quizRef.value?.resetQuestion();
  quizStats.value = { correct: 0, incorrect: 0 };
  wrongAnswers.value = [];
  if (newBank && newBank.bankName) {
    currentBankName.value = newBank.bankName; // 上传后更新题库名
  }
};

// 3. 新增一个处理函数，用于接收从 Quiz 组件传来的题库变化事件
const handleBankChanged = (newBankName) => {
  currentBankName.value = newBankName;
  // 切换题库时，重置统计数据和错题本
  quizStats.value = { correct: 0, incorrect: 0 };
  wrongAnswers.value = [];
};

// 新建考试事件处理
const handleCreateExam = (info) => {
  // info 可为考试详情对象，或直接设为 true
  isExamMode.value = true;
  examInfo.value = info || {};
  // 进入考试时重置统计和错题
  quizStats.value = { correct: 0, incorrect: 0 };
  wrongAnswers.value = [];
};

// 退出考试事件处理
const handleExitExam = () => {
  isExamMode.value = false;
  examInfo.value = null;
};

// 新建考试弹窗相关
const showExamDialog = ref(false);
const examForm = ref({
  bank: '',
  duration: 60 // 默认60分钟
});
const availableBanks = ref([]); // 题库列表

// 获取题库列表（假设有API或可从Quiz组件/BankSelector获取）
const fetchBanks = async () => {
  // 这里假设有 getBanks API，实际可根据你的实现调整
  try {
    const res = await import('./api').then(m => m.getBanks());
    availableBanks.value = res.data.banks || [];
  } catch (e) {
    availableBanks.value = [];
  }
};

const openExamDialog = async () => {
  await fetchBanks();
  showExamDialog.value = true;
};

const startExam = () => {
  if (!examForm.value.bank) {
    ElMessage.error('请选择题库');
    return;
  }
  if (!examForm.value.duration || examForm.value.duration <= 0) {
    ElMessage.error('请输入有效的考试时长');
    return;
  }
  showExamDialog.value = false;
  handleCreateExam({
    bank: examForm.value.bank,
    duration: examForm.value.duration
  });
};

// 新增：引导弹窗相关
const showIntroDialog = ref(false);

onMounted(() => {
  if (!localStorage.getItem('ai-quiz-intro-shown')) {
    showIntroDialog.value = true;
    localStorage.setItem('ai-quiz-intro-shown', '1');
  }
});

</script>

<template>
  <el-container style="min-height:100vh;">
    <el-main>
      <!-- 新建考试按钮，仅在非考试模式下显示 -->
      <div v-if="!isExamMode" class="exam-bar">
        <el-button type="primary" style="color: #fff;" icon="Plus" @click="openExamDialog">新建考试</el-button>
      </div>
      <el-dialog title="新建考试" v-model="showExamDialog" width="400px">
        <el-form :model="examForm" label-width="80px">
          <el-form-item label="题库">
            <el-select v-model="examForm.bank" placeholder="请选择题库">
              <el-option v-for="bank in availableBanks" :key="bank" :label="bank" :value="bank" />
            </el-select>
          </el-form-item>
          <el-form-item label="时长(分钟)">
            <el-input-number v-model="examForm.duration" :min="1" :max="180" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showExamDialog = false">取消</el-button>
          <el-button type="primary" @click="startExam">开始考试</el-button>
        </template>
      </el-dialog>
      <!-- 新增：功能介绍弹窗 -->
      <el-dialog v-model="showIntroDialog" title="功能介绍" width="500px" :close-on-click-modal="false">
        <div style="font-size:17px;line-height:1.8;padding:8px 0;">
          <b>答题小助手</b> 是一款支持题库上传、选择、考试、批量判题和错题本的桌面应用。<br><br>
          <ul style="padding-left:20px;">
            <li>支持 <b>Excel/CSV</b> 题库一键上传，自动分类。（请按照固定格式表头的excel）</li>
            <li>支持刷题模式和考试模式切换</li>
            <li>考试模式：<b>100题答题卡</b>、倒计时、批量判题、分数答案展示。</li>
            <li>题库可删除，支持多题型（单选/多选/判断/简答）。</li>
          </ul>
          <div style="color:#909399;font-size:14px;margin-top:8px;">如有建议或问题，欢迎反馈！</div>
        </div>
        <template #footer>
          <el-button type="primary" @click="showIntroDialog=false">我知道了</el-button>
        </template>
      </el-dialog>
      <div class="main-container">
        <div class="stats-container" v-if="!isExamMode">
          <!-- 考试模式下显示考试详情，否则显示统计卡 -->
          <!-- <Exam v-if="isExamMode" :exam-info="examInfo" @exit-exam="handleExitExam" /> -->
          <StatsCard :stats="quizStats" />
        </div>

        <div :class="['quiz-container', { 'exam-mode': isExamMode }]">
          <!-- 考试模式下显示 Exam 组件，否则显示 Quiz 组件 -->
          <Exam v-if="isExamMode" :exam-info="examInfo" @exit-exam="handleExitExam" />
          <Quiz v-else ref="quizRef" @answer-submitted="handleAnswerSubmitted" @bank-changed="handleBankChanged" />
        </div>

        <div class="right-panel">
          <!-- 考试模式下不显示内容 -->
            <WrongAnswerCard :wrong-answers="wrongAnswers" v-if="!isExamMode" />
        </div>
      </div>
      <!-- 其它内容... -->
    </el-main>
  </el-container>
</template>

<style scoped>
/* 您原有的样式保持不变 */
.main-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 24px;
  padding: 24px;
  max-width: 100vw;
}

.stats-container {
  width: 350px;
}

.quiz-container {
  width: 600px;
}

.quiz-container.exam-mode {
  width: 1100px;
  transition: width 0.3s;
}

.right-panel {
  width: 400px;
  flex-shrink: 0;
  height: calc(100vh - 48px);
}

/* 6. 为分析器组件添加容器样式 */
.analyzer-container {
  padding: 0 24px 24px 24px;
  max-width: calc(350px + 600px + 400px + 48px);
  margin: 0 auto;
}

@media (max-width: 1400px) {
  .main-container {
    flex-wrap: wrap;
    justify-content: center;
  }

  .right-panel {
    margin-top: 24px;
    width: calc(350px + 600px + 24px);
    max-width: 100%;
  }

  .analyzer-container {
    max-width: 100%;
  }
}
</style>
