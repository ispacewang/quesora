<!-- src/App.vue -->
<script setup>
import { ref, onMounted } from 'vue';
import Quiz from './components/Quiz.vue';
import StatsCard from './components/StatsCard.vue';
import WrongAnswerCard from './components/WrongAnswerCard.vue';
// import PatternAnalyzer from './components/AnswersPattern.vue'; // 1. 引入新组件

// --- 您原有的代码 ---
const quizRef = ref(null);
const quizStats = ref({ correct: 0, incorrect: 0 });
const wrongAnswers = ref([]);

// 2. 新增一个 ref 来存储当前题库名称
const currentBankName = ref('');

// const handleAnswerSubmitted = (result) => {
//   if (result.isCorrect) {
//     quizStats.value.correct++;
//   } else {
//     quizStats.value.incorrect++;
//     if (result.questionData && !wrongAnswers.value.some(item => item.questionData.id === result.questionData.id)) {
//       wrongAnswers.value.unshift(result);
//     }
//   }
// };

const handleAnswerSubmitted = (result) => {
if (result.isCorrect) {
  quizStats.value.correct++;
} else {
  quizStats.value.incorrect++;
  // 【核心修正】使用 `idx` 进行去重判断，而不是 `id`
  if (result.questionData && !wrongAnswers.value.some(item => item.questionData.idx === result.questionData.idx)) {
    // unshift 的是 result，它本身就包含了 isCorrect 和 questionData
    wrongAnswers.value.unshift(result);
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

</script>

<template>
  <el-container style="min-height:100vh;">
    <el-main>
      <div class="main-container">
        <div class="stats-container">
          <StatsCard :stats="quizStats" />
        </div>

        <div class="quiz-container">
          <!-- 4. 监听 Quiz 组件的 bank-changed 事件 -->
          <Quiz ref="quizRef" @answer-submitted="handleAnswerSubmitted" @bank-changed="handleBankChanged" />
        </div>

        <div class="right-panel">
          <WrongAnswerCard :wrong-answers="wrongAnswers" />
        </div>
      </div>

      <!-- 5. 将新组件放置在主容器下方 -->

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

.right-panel {
  width: 400px;
  flex-shrink: 0;
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
