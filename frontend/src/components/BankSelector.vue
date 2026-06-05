<template>
  <div class="flex flex-wrap items-center gap-2">
    <!-- 错题库 chip -->
    <button
      v-if="mistakeBank.hasMistakes"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 select-none whitespace-nowrap"
      :class="selectedBank === mistakeBank.id
        ? 'border-warning bg-warning/10 text-warning'
        : 'border-warning/30 text-muted-foreground hover:border-warning hover:text-warning hover:bg-warning/5'"
      @click="selectBank(mistakeBank.id)"
    >
      <span class="text-sm leading-none">📝</span>
      <span class="max-w-[100px] truncate">{{ mistakeBank.name }}</span>
      <span class="text-[10px] font-bold px-1.5 leading-4 min-w-4 text-center bg-warning/10 text-warning border border-warning/25">{{ mistakeBank.count }}</span>
      <span class="text-[10px] text-muted-foreground hover:text-destructive transition-colors ml-0.5 cursor-pointer" @click.stop="onDeleteWrong">清空</span>
    </button>

    <!-- 题库 chips -->
    <button
      v-for="bank in remoteBanks"
      :key="bank"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 select-none whitespace-nowrap"
      :class="selectedBank === bank
        ? 'border-primary bg-primary/5 text-primary'
        : 'border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5'"
      @click="selectBank(bank)"
    >
      <span class="text-sm leading-none">📚</span>
      <span class="max-w-[100px] truncate">{{ bank }}</span>
      <span class="inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-destructive text-sm leading-none ml-0.5" @click.stop="onDeleteBank(bank)">×</span>
    </button>

    <!-- 上传 -->
    <button
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 hover:border-solid transition-all duration-200 select-none whitespace-nowrap"
      @click="dialogVisible = true"
    >
      <span class="text-base font-light leading-none">+</span>
      <span>上传题库</span>
    </button>

    <!-- 上传弹窗 -->
    <Dialog :open="dialogVisible" @update:open="dialogVisible = $event" class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>上传题库</DialogTitle>
        <DialogDescription>支持 Excel/CSV，表头：题型、题干、选项、答案、解析</DialogDescription>
      </DialogHeader>
      <div
        class="flex flex-col items-center justify-center gap-4 py-8 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
        :class="dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
        @click="fileInput?.click()"
      >
        <Upload class="h-8 w-8 text-primary/60" />
        <p class="text-sm text-muted-foreground">拖入文件，或 <span class="text-primary font-medium">点击上传</span></p>
        <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onFileChange" />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="dialogVisible = false">取消</Button>
      </DialogFooter>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Upload } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import Dialog from './ui/Dialog.vue'
import DialogHeader from './ui/DialogHeader.vue'
import DialogTitle from './ui/DialogTitle.vue'
import DialogDescription from './ui/DialogDescription.vue'
import DialogFooter from './ui/DialogFooter.vue'
import Button from './ui/Button.vue'
import { getBanks, uploadFile, deleteBank } from '../api'
import { getMistakeBook, MISTAKE_BOOK_ID } from '../utils/mistakeBook'

const remoteBanks = ref([])
const selectedBank = ref('')
const dialogVisible = ref(false)
const dragOver = ref(false)
const fileInput = ref(null)
const emit = defineEmits(['bank-change'])

const mistakeBank = reactive({ id: MISTAKE_BOOK_ID, name: '错题库', hasMistakes: false, count: 0 })

const fetchAll = async () => {
  try { const r = await getBanks(); remoteBanks.value = r.data.banks } catch {}
  const b = getMistakeBook(); mistakeBank.count = b.length; mistakeBank.hasMistakes = b.length > 0
}

const selectBank = (id) => {
  if (selectedBank.value === id) { selectedBank.value = ''; emit('bank-change', '') }
  else { selectedBank.value = id; emit('bank-change', id) }
}

const onDrop = (e) => {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) doUpload(file)
}

const onFileChange = (e) => {
  const file = e.target?.files?.[0]
  if (file) doUpload(file)
}

const doUpload = async (file) => {
  try {
    await uploadFile(file)
    toast.success('上传成功')
    dialogVisible.value = false
    fetchAll()
  } catch (e) {
    toast.error(e.response?.data?.error || '上传失败')
  }
}

const onDeleteBank = async (name) => {
  try {
    await deleteBank(name)
    toast.success('已删除')
    fetchAll()
    if (selectedBank.value === name) { selectedBank.value = ''; emit('bank-change', '') }
  } catch { toast.error('删除失败') }
}

const onDeleteWrong = () => {
  mistakeBank.count = 0; mistakeBank.hasMistakes = false
  localStorage.removeItem(MISTAKE_BOOK_ID)
  toast.success('已清空')
  fetchAll()
}

onMounted(fetchAll)
defineExpose({ refreshBanks: fetchAll })
</script>
