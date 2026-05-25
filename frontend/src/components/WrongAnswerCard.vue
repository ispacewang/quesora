<template>
  <el-card class="wrong-answer-card" shadow="never">
    <div class="card-header">
      <div class="header-main">
        <div class="header-kicker">Review Queue</div>
        <h3>错题复盘</h3>
        <p>自动收集答错题目，支持随时导出整理。</p>
      </div>

      <div class="header-actions">
        <el-badge :value="wrongAnswers.length" type="danger" class="count-badge" />
        <el-dropdown
          class="export-dropdown"
          @command="handleExport"
          :disabled="!wrongAnswers.length"
        >
          <el-button type="primary" plain :icon="Download">
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
    </div>

    <el-scrollbar height="calc(100vh - 260px)">
      <div v-if="wrongAnswers.length" class="wrong-list">
        <article
          v-for="(item, index) in wrongAnswers"
          :key="getQuestionKey(item, index)"
          class="wrong-item"
        >
          <div class="wrong-item-top">
            <span class="wrong-order">#{{ index + 1 }}</span>
            <span class="wrong-title">{{ item.questionData.question }}</span>
          </div>

          <div v-if="item.questionData.options?.length" class="wrong-options">
            <div
              v-for="(opt, i) in item.questionData.options"
              :key="i"
              class="wrong-option"
              :class="{
                correct: item.questionData.correctAnswer.includes(
                  String.fromCharCode(65 + i)
                ),
              }"
            >
              <span class="option-code">{{ String.fromCharCode(65 + i) }}</span>
              <span>{{ opt }}</span>
            </div>
          </div>

          <div class="answer-row">
            <span>你的答案</span>
            <el-tag type="danger" effect="light" round>
              {{ formatDisplayAnswer(item.questionData.userAnswer) || "未作答" }}
            </el-tag>
          </div>

          <div class="answer-row">
            <span>正确答案</span>
            <el-tag type="success" effect="light" round>
              {{ formatDisplayAnswer(item.questionData.correctAnswer) }}
            </el-tag>
          </div>

          <el-alert
            v-if="item.questionData.explanation"
            class="explanation-alert"
            title="答案解析"
            type="info"
            :description="item.questionData.explanation"
            :closable="false"
          />
        </article>
      </div>

      <div v-else class="empty-wrap">
        <el-empty description="当前还没有错题，继续保持。">
          <template #image>
            <div class="empty-badge">
              <el-icon><CollectionTag /></el-icon>
            </div>
          </template>
        </el-empty>
      </div>
    </el-scrollbar>
  </el-card>
</template>

<script setup>
import { CollectionTag, Download } from "@element-plus/icons-vue";
import { saveAs } from "file-saver";

const props = defineProps({
  wrongAnswers: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const getQuestionKey = (item, index) =>
  item.questionData?.idx ?? item.questionData?.id ?? index;

const formatDisplayAnswer = (answer) => {
  if (Array.isArray(answer)) {
    return answer.join(", ");
  }
  return answer;
};

const handleExport = (format) => {
  if (!props.wrongAnswers.length) return;

  const content = generateExportContent(format);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  saveAs(blob, `错题本-${timestamp}.${format}`);
};

const generateExportContent = (format) => {
  const isMarkdown = format === "md";
  let content = isMarkdown ? "# 我的错题本\n\n" : "我的错题本\n\n";

  props.wrongAnswers.forEach((item, index) => {
    const question = item.questionData;
    const userAnswer = formatDisplayAnswer(question.userAnswer) || "未作答";
    const correctAnswer = formatDisplayAnswer(question.correctAnswer);

    if (isMarkdown) {
      content += `## ${index + 1}. ${question.question}\n\n`;
      if (question.options?.length) {
        question.options.forEach((opt, optionIndex) => {
          content += `- ${String.fromCharCode(65 + optionIndex)}. ${opt}\n`;
        });
        content += "\n";
      }
      content += `**你的答案：** \`${userAnswer}\`\n\n`;
      content += `**正确答案：** \`${correctAnswer}\`\n\n`;
      if (question.explanation) {
        content += `> 解析：${question.explanation}\n\n`;
      }
      content += "---\n\n";
      return;
    }

    content += `${index + 1}. ${question.question}\n`;
    if (question.options?.length) {
      question.options.forEach((opt, optionIndex) => {
        content += `   ${String.fromCharCode(65 + optionIndex)}. ${opt}\n`;
      });
    }
    content += `你的答案：${userAnswer}\n`;
    content += `正确答案：${correctAnswer}\n`;
    if (question.explanation) {
      content += `解析：${question.explanation}\n`;
    }
    content += "\n========================================\n\n";
  });

  return content;
};
</script>

<style scoped>
.wrong-answer-card {
  border-radius: 28px;
  height: calc(100vh - 180px);
  position: sticky;
  top: 32px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(18px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: start;
  margin-bottom: 18px;
}

.header-kicker {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(227, 84, 84, 0.1);
  color: #c13f3f;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.header-main h3 {
  margin: 12px 0 8px;
  font-size: 26px;
  color: #17233c;
}

.header-main p {
  margin: 0;
  color: #657792;
  line-height: 1.7;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.count-badge :deep(.el-badge__content) {
  transform: none;
}

.wrong-list {
  display: grid;
  gap: 16px;
}

.wrong-item {
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(251, 253, 255, 0.98), #ffffff);
  border: 1px solid rgba(133, 158, 196, 0.14);
}

.wrong-item-top {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.wrong-order {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 40px;
  height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(227, 84, 84, 0.1);
  color: #c13f3f;
  font-weight: 700;
}

.wrong-title {
  color: #17233c;
  font-weight: 700;
  line-height: 1.7;
}

.wrong-options {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.wrong-option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 16px;
  background: #f7faff;
  color: #596b86;
}

.wrong-option.correct {
  background: rgba(31, 157, 104, 0.1);
  color: #1f9d68;
}

.option-code {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: rgba(24, 40, 72, 0.06);
  font-size: 12px;
  font-weight: 800;
  color: #17233c;
}

.answer-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-top: 14px;
  color: #677993;
}

.explanation-alert {
  margin-top: 16px;
}

.empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

.empty-badge {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 88px;
  height: 88px;
  border-radius: 26px;
  background: rgba(33, 118, 255, 0.1);
  color: #1658c0;
  font-size: 36px;
}

@media (max-width: 1360px) {
  .wrong-answer-card {
    position: static;
    height: auto;
  }
}

@media (max-width: 980px) {
  .card-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
