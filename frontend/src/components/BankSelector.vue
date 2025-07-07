<template>
  <div class="bank-list">
    <!-- 错题库卡片：条件渲染 -->
    <el-card
      v-if="mistakeBank.hasMistakes"
      :key="mistakeBank.id"
      class="bank-card mistake-card"
      :class="{ active: mistakeBank.id === selectedBank }"
      @click="selectBank(mistakeBank.id)"
      shadow="hover"
    >
      <div style="display: flex; flex-direction: column; align-items: center;">
        <el-icon style="font-size:32px;"><Memo /></el-icon>
      </div>
      <div class="bank-name">{{ mistakeBank.name }}</div>
      <el-badge :value="mistakeBank.count" class="mistake-badge" type="warning" />
    </el-card>

    <!-- 远程题库卡片 -->
    <el-card
      v-for="bank in remoteBanks"
      :key="bank"
      class="bank-card"
      :class="{ active: bank === selectedBank }"
      @click="selectBank(bank)"
      shadow="hover"
    >
      <div style="display: flex; flex-direction: column; align-items: center;">
        <el-icon style="font-size:32px;"><Collection /></el-icon>
      </div>
      <div class="bank-name">{{ bank }}</div>
    </el-card>

    <!-- 上传卡片 -->
    <el-card
      class="bank-card upload-card"
      shadow="hover"
      @click.stop="openUpload"
    >
      <div style="display: flex; flex-direction: column; align-items: center;">
        <el-icon class="upload-mini-icon"><UploadFilled /></el-icon>
      </div>
      <div class="bank-name">上传文件</div>
    </el-card>

    <!-- 上传弹窗 -->
    <el-dialog v-model="dialogVisible" title="上传题库文件" width="400px">
      <el-upload
        class="upload-demo"
        drag
        :action="null"
        :http-request="customRequest"
        :show-file-list="false"
        accept=".xlsx,.xls,.csv"
      >
        <el-icon style="font-size:24px;"><UploadFilled /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <div class="el-upload__tip" slot="tip">支持Excel或CSV，表头需包含：题目、A、B、C、D、答案、解读</div>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Collection, UploadFilled, Memo } from '@element-plus/icons-vue';
import { getBanks, uploadFile } from '../api'; // 假设你的api文件导出了 getBanks
import { getMistakeBook, MISTAKE_BOOK_ID } from '../utils/mistakeBook';
import { ElMessage } from 'element-plus';

// --- State ---
const remoteBanks = ref([]); // 只存储从API获取的题库
const selectedBank = ref('');
const dialogVisible = ref(false);
const emit = defineEmits(['bank-change']);

// 使用 reactive 来管理错题库的状态，更直观
const mistakeBank = reactive({
  id: MISTAKE_BOOK_ID,
  name: '我的错题库',
  hasMistakes: false,
  count: 0
});

// --- Methods ---

// 核心方法：刷新所有题库列表（包括远程和本地错题库）
const fetchAllBanks = async () => {
  // 1. 获取远程题库
  try {
    const res = await getBanks(); // 使用你项目中的 getBanks API
    remoteBanks.value = res.data.banks;
  } catch(e) {
    console.error("获取远程题库失败:", e);
    ElMessage.error("获取远程题库列表失败！");
  }

  // 2. 检查并更新本地错题库状态
  checkMistakeBook();
};

// 检查本地错题库状态
const checkMistakeBook = () => {
    const book = getMistakeBook();
    mistakeBank.count = book.length;
    mistakeBank.hasMistakes = book.length > 0;
};

// 选择题库的逻辑
const selectBank = (bankId) => {
  // 如果点击的是当前已选中的，则取消选择
  if (selectedBank.value === bankId) {
    selectedBank.value = '';
    emit('bank-change', '');
  } else {
    selectedBank.value = bankId;
    emit('bank-change', bankId);
  }
};

// 打开上传弹窗
const openUpload = () => {
  dialogVisible.value = true;
};

// 自定义上传请求
const customRequest = async ({ file, onSuccess, onError }) => {
  try {
    const res = await uploadFile(file);
    onSuccess(res.data, file);
    ElMessage.success('上传成功！');
    dialogVisible.value = false;
    fetchAllBanks(); // 上传后刷新题库列表
  } catch (e) {
    onError(e);
    ElMessage.error('上传失败，请检查文件格式或联系管理员。');
  }
};

// --- Lifecycle ---
onMounted(fetchAllBanks);

// --- Expose ---
// 暴露一个方法给父组件(QuizCard)调用，以便在增删错题后能实时刷新这里的UI
defineExpose({
  refreshBanks: fetchAllBanks
});
</script>

<style scoped>
.bank-list {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  justify-content: center;
  align-items: stretch; /* 让卡片等高 */
}
.bank-card {
  width: 120px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative; /* 为了徽章定位 */
}
.bank-card.active {
  border-color: #409EFF;
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}
.bank-name {
  margin-top: 8px;
  font-size: 16px;
  font-weight: bold;
}
.upload-mini-icon {
  font-size: 30px;
  cursor: pointer;
  margin-top: 4px;
}
.upload-demo {
  width: 100%;
}

.upload-card{
  color: #0b9edd;
  border-radius: 12px;
  border: 2px dashed #0b9edd; /* 使用虚线更像一个操作按钮 */
}
.upload-card:hover {
    border-color: #409EFF;
    color: #409EFF;
}

/* 错题库卡片专属样式 */
.mistake-card {
    border-color: #E6A23C;
    color: #E6A23C;
}
.mistake-card.active {
    border-color: #E6A23C;
    background-color: #fdf6ec;
    transform: translateY(-5px);
    box-shadow: 0 4px 12px rgba(230, 162, 60, 0.2);
}

/* 错题数量徽章 */
.mistake-badge {
    position: absolute;
    top: 8px;
    right: 8px;
}

</style>
