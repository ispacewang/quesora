<template>
  <section class="bank-selector">
    <div class="selector-header">
      <div>
        <div class="selector-kicker">Question Banks</div>
        <h4>选择题库</h4>
      </div>
      <div class="selector-caption">
        点击题库立即开始练习，再次点击可取消当前选择。
      </div>
    </div>

    <div class="bank-list">
      <el-card
        v-if="mistakeBank.hasMistakes"
        :key="mistakeBank.id"
        class="bank-card mistake-card"
        :class="{ active: mistakeBank.id === selectedBank }"
        shadow="never"
        @click="selectBank(mistakeBank.id)"
      >
        <div class="card-top">
          <div class="icon-wrap warning">
            <el-icon><Memo /></el-icon>
          </div>
          <el-tag type="warning" round effect="light">
            {{ mistakeBank.count }} 题
          </el-tag>
        </div>
        <div class="card-title">我的错题库</div>
        <div class="card-subtitle">适合回顾最近答错的题目</div>
        <div class="card-footer">
          <span>点击进入复习</span>
          <el-button link type="warning" @click.stop="onDeleteWrong">
            清空
          </el-button>
        </div>
      </el-card>

      <el-card
        v-for="bank in remoteBanks"
        :key="bank"
        class="bank-card"
        :class="{ active: bank === selectedBank }"
        shadow="never"
        @click="selectBank(bank)"
        @mouseenter="hoverBank = bank"
        @mouseleave="hoverBank = ''"
      >
        <div class="card-top">
          <div class="icon-wrap">
            <el-icon><Collection /></el-icon>
          </div>
          <el-button
            v-if="hoverBank === bank"
            class="delete-button"
            text
            type="danger"
            @click.stop="onDeleteBank(bank)"
          >
            删除
          </el-button>
        </div>
        <div class="card-title">{{ bank }}</div>
        <div class="card-subtitle">点击开始练习或切换到当前题库</div>
        <div class="card-footer">
          <span>{{ selectedBank === bank ? "当前已选中" : "进入练习" }}</span>
        </div>
      </el-card>

      <el-card
        class="bank-card upload-card"
        shadow="never"
        @click.stop="openUpload"
      >
        <div class="card-top">
          <div class="icon-wrap accent">
            <el-icon><UploadFilled /></el-icon>
          </div>
        </div>
        <div class="card-title">上传新题库</div>
        <div class="card-subtitle">支持 Excel / CSV，导入后会自动刷新</div>
        <div class="card-footer">
          <span>添加题库</span>
        </div>
      </el-card>

      <div v-if="!remoteBanks.length && !mistakeBank.hasMistakes" class="inline-empty">
        <el-empty description="还没有可用题库，先上传一个文件开始使用。" />
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      class="upload-dialog"
      title="上传题库文件"
      width="440px"
    >
      <div class="upload-intro">
        支持 `.xlsx`、`.xls`、`.csv`，请保证表头包含题目、选项、答案和解析字段。
      </div>
      <el-upload
        class="upload-demo"
        drag
        :action="null"
        :http-request="customRequest"
        :show-file-list="false"
        accept=".xlsx,.xls,.csv"
      >
        <el-icon class="upload-large-icon"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将文件拖到这里，或 <em>点击上传</em>
        </div>
      </el-upload>
    </el-dialog>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { Collection, Memo, UploadFilled } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { deleteBank, getBanks, uploadFile } from "../api";
import { getMistakeBook, MISTAKE_BOOK_ID } from "../utils/mistakeBook";

const remoteBanks = ref([]);
const selectedBank = ref("");
const dialogVisible = ref(false);
const hoverBank = ref("");

const emit = defineEmits(["bank-change", "create-exam"]);

const mistakeBank = reactive({
  id: MISTAKE_BOOK_ID,
  name: "我的错题库",
  hasMistakes: false,
  count: 0,
});

const checkMistakeBook = () => {
  const book = getMistakeBook();
  mistakeBank.count = book.length;
  mistakeBank.hasMistakes = book.length > 0;
};

const fetchAllBanks = async () => {
  try {
    const res = await getBanks();
    remoteBanks.value = res.data.banks || [];
  } catch (error) {
    remoteBanks.value = [];
    ElMessage.error("获取题库列表失败");
  }

  checkMistakeBook();
};

const selectBank = (bankId) => {
  if (selectedBank.value === bankId) {
    selectedBank.value = "";
    emit("bank-change", "");
    return;
  }

  selectedBank.value = bankId;
  emit("bank-change", bankId);
};

const openUpload = () => {
  dialogVisible.value = true;
};

const customRequest = async ({ file, onSuccess, onError }) => {
  try {
    const res = await uploadFile(file);
    onSuccess(res.data, file);
    dialogVisible.value = false;
    ElMessage.success("上传成功");
    fetchAllBanks();
  } catch (error) {
    onError(error);
    ElMessage.error("上传失败，请检查文件格式");
  }
};

const onDeleteBank = async (bankName) => {
  try {
    await ElMessageBox.confirm(
      `确认删除题库“${bankName}”吗？该操作不可撤销。`,
      "删除题库",
      {
        type: "warning",
        confirmButtonText: "删除",
        cancelButtonText: "取消",
      }
    );
  } catch {
    return;
  }

  try {
    await deleteBank(bankName);
    ElMessage.success("删除成功");
    if (selectedBank.value === bankName) {
      selectedBank.value = "";
      emit("bank-change", "");
    }
    fetchAllBanks();
  } catch (error) {
    ElMessage.error("删除失败");
  }
};

const onDeleteWrong = async () => {
  try {
    await ElMessageBox.confirm(
      "确认清空错题库吗？已沉淀的错题会被全部移除。",
      "清空错题库",
      {
        type: "warning",
        confirmButtonText: "清空",
        cancelButtonText: "取消",
      }
    );
  } catch {
    return;
  }

  localStorage.removeItem(MISTAKE_BOOK_ID);
  mistakeBank.count = 0;
  mistakeBank.hasMistakes = false;

  if (selectedBank.value === MISTAKE_BOOK_ID) {
    selectedBank.value = "";
    emit("bank-change", "");
  }

  ElMessage.success("错题库已清空");
  fetchAllBanks();
};

onMounted(fetchAllBanks);

defineExpose({
  refreshBanks: fetchAllBanks,
});
</script>

<style scoped>
.bank-selector {
  display: grid;
  gap: 18px;
  margin-bottom: 24px;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: end;
}

.selector-kicker {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 122, 26, 0.12);
  color: #d76412;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.selector-header h4 {
  margin: 12px 0 0;
  font-size: 22px;
  color: #17233c;
}

.selector-caption {
  color: #6f809a;
  line-height: 1.7;
  text-align: right;
}

.bank-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.bank-card {
  border-radius: 24px;
  border: 1px solid rgba(133, 158, 196, 0.15);
  background: linear-gradient(180deg, rgba(251, 253, 255, 0.98), #ffffff);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  cursor: pointer;
}

.bank-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 34px rgba(24, 46, 84, 0.08);
  border-color: rgba(33, 118, 255, 0.2);
}

.bank-card.active {
  border-color: #2176ff;
  box-shadow: 0 20px 32px rgba(33, 118, 255, 0.16);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 10px;
}

.icon-wrap {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: rgba(33, 118, 255, 0.12);
  color: #1658c0;
  font-size: 22px;
}

.icon-wrap.warning {
  background: rgba(255, 176, 32, 0.16);
  color: #d97706;
}

.icon-wrap.accent {
  background: rgba(255, 122, 26, 0.14);
  color: #db650f;
}

.card-title {
  margin-top: 18px;
  font-size: 18px;
  font-weight: 800;
  color: #17233c;
}

.card-subtitle {
  margin-top: 8px;
  min-height: 48px;
  color: #6b7d97;
  line-height: 1.7;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  color: #7b8ca6;
  font-size: 13px;
}

.delete-button {
  opacity: 0.9;
}

.upload-card {
  border-style: dashed;
}

.mistake-card {
  background: linear-gradient(180deg, rgba(255, 249, 239, 0.96), #ffffff);
}

.inline-empty {
  grid-column: 1 / -1;
  border-radius: 24px;
  border: 1px dashed rgba(133, 158, 196, 0.28);
  background: rgba(255, 255, 255, 0.65);
  padding: 10px;
}

.upload-intro {
  margin-bottom: 16px;
  color: #667892;
  line-height: 1.7;
}

.upload-large-icon {
  font-size: 28px;
  color: #2176ff;
}

:deep(.upload-demo .el-upload-dragger) {
  border-radius: 22px;
  border-color: rgba(33, 118, 255, 0.25);
  background: #f8fbff;
}

:deep(.upload-dialog .el-dialog) {
  border-radius: 24px;
}

@media (max-width: 980px) {
  .selector-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .selector-caption {
    text-align: left;
  }
}
</style>
