<!-- /src/components/WrongAnswerCard.vue -->
<template>
  <div v-if="wrongAnswers.length > 0" class="wrong-answer-card-container">
    <el-card class="wrong-answer-card">
      <template #header>
        <div class="card-header">
          <el-icon>
            <CollectionTag />
          </el-icon>
          <span>我的错题本</span>
          <el-badge :value="wrongAnswers.length" type="danger" class="count-badge" />

          <!-- 【新增】导出按钮，使用 el-dropdown 提供格式选择 -->
          <el-dropdown @command="handleExport" class="export-dropdown">
            <el-button type="primary" :icon="Download" link>
              导出
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="md">导出为 Markdown</el-dropdown-item>
                <el-dropdown-item command="txt">导出为 TXT</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </template>

      <el-scrollbar height="calc(100vh - 200px)">
        <div v-for="(item, index) in wrongAnswers" :key="item.questionData.id" class="wrong-item">
          <!-- ... 您原有的内容保持不变 ... -->
          <p class="wrong-question-title">
            {{ index + 1 }}. {{ item.questionData.question }}
          </p>
          <div class="answer-display">
            <span>你的答案:</span>
            <el-tag type="danger" effect="light" round>{{ formatDisplayAnswer(item.questionData.userAnswer) }}</el-tag>
          </div>
          <div class="answer-display">
            <span>正确答案:</span>
            <el-tag type="success" effect="light" round>{{ formatDisplayAnswer(item.questionData.correctAnswer)
              }}</el-tag>
          </div>
          <el-alert v-if="item.questionData.explanation" class="explanation-alert" title="答案解析" type="info"
            :description="item.questionData.explanation" :closable="false" />
        </div>
      </el-scrollbar>
    </el-card>
  </div>
</template>

<script setup>
import { CollectionTag, Download } from "@element-plus/icons-vue";
// 【新增】引入 file-saver
import { saveAs } from 'file-saver';

const props = defineProps({
  wrongAnswers: {
    type: Array,
    required: true,
    default: () => [],
  },
});

// 【新增】格式化答案显示，将数组转为字符串
const formatDisplayAnswer = (answer) => {
  if (Array.isArray(answer)) {
    return answer.join(', ');
  }
  return answer;
};

// 【新增】导出逻辑
const handleExport = (format) => {
  const content = generateExportContent(format);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `错题本_${timestamp}.${format}`);
};

// 【新增】生成导出内容的函数
const generateExportContent = (format) => {
  let content = '';
  const isMd = format === 'md';

  // 文件标题
  content += isMd ? '# 我的错题本\n\n' : '--- 我的错题本 ---\n\n';

  props.wrongAnswers.forEach((item, index) => {
    const q = item.questionData;
    const userAns = formatDisplayAnswer(q.userAnswer);
    const correctAns = formatDisplayAnswer(q.correctAnswer);

    if (isMd) {
      // Markdown 格式
      content += `## ${index + 1}. ${q.question}\n\n`;
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt, i) => {
          content += `- ${String.fromCharCode(65 + i)}. ${opt}\n`;
        });
        content += '\n';
      }
      content += `**你的答案：** \`${userAns}\`\n\n`;
      content += `**正确答案：** \`${correctAns}\`\n\n`;
      if (q.explanation) {
        content += `> **【解析】**\n> ${q.explanation}\n\n`;
      }
      content += '---\n\n';
    } else {
      // TXT 格式
      content += `${index + 1}. ${q.question}\n`;
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt, i) => {
          content += `   ${String.fromCharCode(65 + i)}. ${opt}\n`;
        });
      }
      content += `\n`;
      content += `你的答案：${userAns}\n`;
      content += `正确答案：${correctAns}\n`;
      if (q.explanation) {
        content += `【解析】：${q.explanation}\n`;
      }
      content += `\n========================================\n\n`;
    }
  });

  return content;
};
</script>

<style scoped>
.wrong-answer-card-container {
  width: 100%;
}

.wrong-answer-card {
  border-radius: 16px;
  height: calc(100vh - 120px);
  position: sticky;
  top: 84px;
}

.card-header {
  display: flex;
  align-items: center;
  font-weight: bold;
  font-size: 18px;
}

.card-header .el-icon {
  margin-right: 8px;
  font-size: 20px;
}

.count-badge {
  margin-left: 16px;
}

/* 【新增】导出按钮的样式 */
.export-dropdown {
  margin-left: auto;
}

.wrong-item {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px dashed #e4e7ed;
}

.wrong-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.wrong-question-title {
  font-weight: 500;
  margin: 0 0 12px 0;
  color: #303133;
  line-height: 1.6;
}

.answer-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 14px;
}

.answer-display span {
  color: #606266;
}

.explanation-alert {
  margin-top: 16px;
}
</style>
