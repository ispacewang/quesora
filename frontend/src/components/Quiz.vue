/** @file Quiz.vue —
答题核心组件，支持单选/多选/判断/简答/填空，题型筛选、顺序/随机、速刷模式、AI判题
*/
<template>
    <div class="flex flex-col min-h-full">
        <div
            class="px-5 py-3 border-b border-border/50"
            data-tour="bank-selector"
        >
            <BankSelector ref="bankSelectorRef" @bank-change="onBankChange" />
        </div>

        <div
            v-if="!currentBank && !loading"
            class="flex-1 flex flex-col items-center justify-center py-20 px-5 text-muted-foreground"
        >
            <div
                class="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 opacity-40"
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                </svg>
            </div>
            <p class="text-sm">{{ emptyDescription }}</p>
        </div>

        <div
            v-else-if="loading"
            class="p-8 space-y-3 max-w-[800px] mx-auto w-full"
        >
            <div class="h-4 w-[30%] bg-muted animate-pulse" />
            <div class="h-4 w-full bg-muted animate-pulse" />
            <div class="h-4 w-[80%] bg-muted animate-pulse" />
            <div class="h-10 w-full bg-muted animate-pulse mt-4" />
        </div>

        <div v-else-if="question" class="flex-1 flex flex-col">
            <!-- 重要题目跑马灯边框 -->
            <div
                class="flex-1 flex flex-col mx-4 my-4 relative"
                :class="{ 'bao-ming-card': isBaoMing }"
            >
                <div class="px-4 py-5 max-w-[800px] mx-auto w-full flex-1">
                    <!-- 工具栏 -->
                    <div
                        class="flex items-center justify-between pb-3 mb-4 border-b border-border/40"
                    >
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="default">{{ question.type }}</Badge>
                            <Badge v-if="isBaoMing" variant="destructive"
                                >重要题目</Badge
                            >
                            <Badge
                                v-if="question.meta?.['题目分类']"
                                variant="secondary"
                                >{{ question.meta["题目分类"] }}</Badge
                            >
                        </div>
                        <div class="flex items-center gap-2" data-tour="modes">
                            <!-- 题型筛选（选中项上方显示该类题目总数，按住 Shift 全部显示） -->
                            <div class="flex items-center gap-0.5 mr-1">
                                <button
                                    v-for="t in typeFilters"
                                    :key="t.key"
                                    @click="toggleTypeFilter(t.key)"
                                    class="relative text-[10px] px-1.5 py-0.5 border transition-colors"
                                    :class="
                                        typeFilter.includes(t.key)
                                            ? 'border-primary/40 bg-primary/10 text-primary font-medium'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    "
                                >
                                    <span
                                        v-if="hasTypeCounts && showCountFor(t.key)"
                                        class="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] leading-none tabular-nums text-muted-foreground/70"
                                        >{{ typeCounts[t.key] ?? 0 }}</span
                                    >
                                    {{ t.label }}
                                </button>
                                <button
                                    @click="toggleTypeFilter('baoMing')"
                                    class="relative text-[10px] px-1.5 py-0.5 border transition-colors"
                                    :class="
                                        baoMingOnly
                                            ? 'border-destructive/60 bg-destructive/10 text-destructive font-medium'
                                            : 'border-transparent text-muted-foreground hover:text-destructive/70'
                                    "
                                >
                                    <span
                                        v-if="hasTypeCounts && showCountFor('baoMing')"
                                        class="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] leading-none tabular-nums text-destructive/70"
                                        >{{ typeCounts.baoMing ?? 0 }}</span
                                    >
                                    重要
                                </button>
                            </div>
                            <!-- 顺序/随机 -->
                            <Button
                                size="xs"
                                :variant="!orderMode ? 'default' : 'outline'"
                                @click="toggleOrderMode"
                            >
                                <Shuffle class="size-3.5" /> 随机
                            </Button>
                            <Button
                                size="xs"
                                :variant="quickMode ? 'default' : 'outline'"
                                @click="quickMode = !quickMode"
                                ><Zap class="size-3.5" /> 速刷</Button
                            >
                            <Button
                                size="xs"
                                :variant="shuffleMode ? 'default' : 'outline'"
                                @click="
                                    shuffleMode = !shuffleMode;
                                    loadQuestion();
                                "
                                ><Shuffle class="size-3.5" /> 打乱</Button
                            >
                        </div>
                    </div>

                    <!-- 题干 -->
                    <KatexRender
                        class="text-base font-semibold leading-relaxed mb-8 block"
                        :text="question.question"
                    />

                    <!-- 配图 -->
                    <DiagramBoard
                        v-if="diagramConfig || diagramSvg"
                        :config="diagramConfig"
                        :svg="diagramSvg"
                    />

                    <!-- 简答/填空 + 选项（右侧贴紧大插图） -->
                    <div class="flex items-center mb-6">
                        <div
                            v-if="isShortAnswer || isFillBlank"
                            class="flex-1 min-w-0 space-y-2"
                        >
                            <div class="flex items-center justify-between">
                                <span
                                    class="text-[10px] text-muted-foreground uppercase tracking-wider"
                                    >{{
                                        isShortAnswer ? "简答题" : "填空题"
                                    }}</span
                                >
                                <button
                                    type="button"
                                    @click="showPreview = !showPreview"
                                    class="text-[11px] px-2 py-0.5 border transition-colors"
                                    :class="
                                        showPreview
                                            ? 'border-primary/40 bg-primary/10 text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    "
                                >
                                    <Eye
                                        class="size-3.5 inline-block -mt-0.5"
                                    />
                                    预览
                                </button>
                            </div>
                            <Textarea
                                v-model="userAnswer"
                                :rows="4"
                                :placeholder="
                                    isShortAnswer
                                        ? '输入你的答案...'
                                        : '输入正确答案...'
                                "
                            />
                            <div
                                v-if="showPreview && userAnswer"
                                class="p-3 border border-border/50 bg-muted/30 min-h-[2em] text-sm leading-relaxed"
                            >
                                <KatexRender :text="userAnswer" />
                            </div>
                        </div>

                        <!-- 选项：重要题目时，死神以选项右边缘为轴，从选项后面旋转探出 -->
                        <div
                            v-else
                            class="bao-options-stage flex-1 min-w-0"
                            :class="{ 'bao-options-stage--active': isBaoMing }"
                        >
                            <div
                                v-if="isMultiChoice && question.options?.length && !showResult"
                                class="flex items-center justify-between mb-2 px-0.5"
                            >
                                <span class="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    多选题 · 可多选
                                </span>
                                <button
                                    type="button"
                                    @click="toggleAllMultiOptions"
                                    :aria-pressed="allOptionsSelected"
                                    class="text-[11px] px-2 py-0.5 border transition-colors"
                                    :class="allOptionsSelected
                                        ? 'border-primary/40 bg-primary/10 text-primary'
                                        : 'border-transparent text-muted-foreground hover:border-primary/40 hover:text-primary'"
                                >
                                    {{ allOptionsSelected ? "取消全选" : "一键全选" }}
                                </button>
                            </div>
                            <!-- 选项主体：层级高于死神，用自身背景把死神遮在后面 -->
                            <div
                                class="bao-options-panel flex flex-col gap-1.5"
                            >
                                <div
                                    v-for="(opt, i) in question.options"
                                    :key="i"
                                    @click="!showResult && selectOption(i)"
                                    class="flex items-start gap-3 px-3.5 py-3 border transition-colors duration-200 cursor-pointer select-none"
                                    :class="optionClass(i)"
                                >
                                    <span
                                        class="flex items-center justify-center w-6 h-6 border text-xs font-semibold flex-shrink-0 transition-colors"
                                        :class="optionLetterClass(i)"
                                        >{{ String.fromCharCode(65 + i) }}</span
                                    >
                                    <span class="text-sm leading-relaxed pt-0.5"
                                        ><KatexRender :text="stripOpt(opt)"
                                    /></span>
                                    <span
                                        v-if="showResult && isCorrectOption(i)"
                                        class="ml-auto text-success"
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2.5"
                                            stroke-linecap="round"
                                        >
                                            <path d="M20 6 9 17l-5-5" />
                                        </svg>
                                    </span>
                                    <span
                                        v-if="
                                            showResult && isWrongUserOption(i)
                                        "
                                        class="ml-auto text-destructive"
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2.5"
                                            stroke-linecap="round"
                                        >
                                            <path d="M18 6 6 18M6 6l12 12" />
                                        </svg>
                                    </span>
                                </div>
                            </div>

                            <!-- 重要题目死神：左下角钉在选项右边缘，始终处于选项主体后方 -->
                            <img
                                v-if="isBaoMing"
                                :key="question.id"
                                src="/zhongyao-q-96.png"
                                alt="重要题目"
                                title="重要题目"
                                class="bao-badge dark:invert"
                                :class="
                                    baoAnim === 'correct'
                                        ? 'bao-correct'
                                        : baoAnim === 'enter'
                                          ? 'bao-enter'
                                          : ''
                                "
                            />
                        </div>
                    </div>

                    <!-- 操作 -->
                    <div class="flex gap-2.5 pt-4 border-t border-border/40">
                        <Button
                            v-if="!showResult"
                            @click="submitAnswer"
                            :disabled="!canSubmit"
                            size="sm"
                        >
                            {{ quickMode ? "提交并继续 →" : "提交答案" }}
                        </Button>
                        <button
                            v-if="showAiJudgeButton"
                            @click="aiJudgeQuestion"
                            :disabled="!userAnswer || aiJudging"
                            class="liquid-btn inline-flex items-center px-3 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <span class="liquid-btn-inner px-2">
                                <Loader
                                    v-if="aiJudging"
                                    class="size-3.5 inline-block animate-spin"
                                />
                                <Sparkles
                                    v-else
                                    class="size-3.5 inline-block"
                                />
                                {{ aiJudging ? "判题中" : "AI 判题" }}
                            </span>
                        </button>
                        <Button
                            v-else-if="showResult"
                            size="sm"
                            @click="nextQuestion"
                            >下一题 →</Button
                        >
                        <div class="flex-1" />
                    </div>

                    <!-- 反馈 -->
                    <div v-if="showResult" class="mt-5 space-y-3">
                        <div
                            class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-l-[3px]"
                            :class="
                                lastResult?.correct
                                    ? 'bg-success/[0.06] dark:bg-success/[0.12] border-l-success text-success dark:text-success'
                                    : 'bg-destructive/[0.06] dark:bg-destructive/[0.10] border-l-destructive text-destructive dark:text-destructive'
                            "
                        >
                            <Check
                                v-if="lastResult?.correct"
                                class="size-4 inline-block -mt-0.5"
                            /><X v-else class="size-4 inline-block -mt-0.5" />
                            {{
                                lastResult?.correct ? "回答正确！" : "回答错误"
                            }}
                        </div>
                        <div
                            v-if="!lastResult?.correct"
                            class="flex gap-2 text-sm px-4"
                        >
                            <span class="text-muted-foreground flex-shrink-0"
                                >正确答案：</span
                            >
                            <KatexRender
                                class="font-semibold text-success"
                                :text="fmtAnswer"
                            />
                        </div>
                        <div
                            v-if="lastResult?.explanation"
                            class="p-4 bg-muted/50 text-sm leading-relaxed"
                        >
                            <span
                                class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
                                >解析</span
                            >
                            <KatexRender :text="lastResult.explanation" />
                        </div>
                        <div
                            v-if="!lastResult?.correct && !quickMode"
                            class="p-4 border border-border/60 bg-background space-y-2.5"
                        >
                            <div
                                class="flex items-center justify-between gap-2"
                            >
                                <span
                                    class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
                                    >我的备注</span
                                >
                                <span
                                    v-if="noteSaved"
                                    class="text-[10px] text-success"
                                    >已保存</span
                                >
                            </div>
                            <Textarea
                                v-model="mistakeNote"
                                class="min-h-[72px] rounded-none text-xs"
                                placeholder="写下这题为什么错、下次要注意什么…"
                                @update:model-value="noteSaved = false"
                            />
                            <div class="flex justify-end">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    class="rounded-none"
                                    @click="saveMistakeNote"
                                    >保存备注</Button
                                >
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div
            v-else
            class="flex-1 flex flex-col items-center justify-center py-20 px-5 text-muted-foreground"
        >
            <div
                class="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 opacity-40"
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                </svg>
            </div>
            <p class="text-sm">{{ emptyDescription }}</p>
        </div>

        <!-- 答完整个题库 -->
        <AlertDialog
            :open="showFinishDialog"
            title="你已答完整个题库"
            description="所有题目都已刷完，再来一遍或退出刷题？"
            confirm-text="再来一遍"
            cancel-text="退出"
            @update:open="showFinishDialog = $event"
            @confirm="restartCycle"
            @cancel="exitPractice"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import axios from "axios";
import { toast } from "vue-sonner";
import Badge from "./ui/Badge.vue";
import Button from "./ui/Button.vue";
import Textarea from "./ui/Textarea.vue";
import AlertDialog from "./ui/AlertDialog.vue";
import BankSelector from "./BankSelector.vue";
import KatexRender from "./KatexRender.vue";
import DiagramBoard from "./DiagramBoard.vue";
import {
    Zap,
    Eye,
    Loader,
    Sparkles,
    Check,
    X,
    Shuffle,
} from "lucide-vue-next";
import * as api from "../api";
import {
    getMistakeBook,
    removeQuestionFromMistakeBook,
    updateMistakeNote,
    MISTAKE_BOOK_ID,
} from "../utils/mistakeBook";
import { useAiMode } from "../composables/useAiMode";
import { applyShuffle, toOriginalLetter, toDisplayAnswer } from "../lib/utils";
import { judgeAnswer } from "../utils/answerJudge";
import { getOptionLetters, toggleAllOptions } from "../utils/multiSelect";
import { shouldShowAiJudgeButton } from "../utils/quizUi";

const { isAiMode, selectedModel } = useAiMode();

const bankSelectorRef = ref(null);
const currentBank = ref("");
const question = ref(null);
const userAnswer = ref("");
const orderMode = ref(true);
const quickMode = ref(false);
const shuffleMode = ref(true);
const showPreview = ref(false);
const loading = ref(false);
const showResult = ref(false);
const lastResult = ref(null);
const lastMistakeIdx = ref(0);
const mistakeNote = ref("");
const noteSaved = ref(false);
const aiJudging = ref(false);
const showFinishDialog = ref(false);
let loadRequestId = 0;
// 重要题目插图动画状态：'' | 'enter'(冒出) | 'correct'(答对消失)
const baoAnim = ref("");

// 错题库随机模式：本地打乱索引队列，避免重复出题（与后端随机队列同思路）
let mistakeRandomQueue = [];
let mistakeRandomPoolLen = 0;

// 题型筛选 — "全部" 等同于不过滤
const ALL_TYPES = ["单选题", "多选题", "判断题", "简答题", "填空题"];
const typeFilters = computed(() => {
    const base = [{ key: "all", label: "全部" }];
    for (const t of ALL_TYPES) {
        base.push({ key: t, label: t === "简答题" ? "简答" : t === "填空题" ? "填空" : t });
    }
    return base;
});
const typeFilter = ref(["all"]);
const baoMingOnly = ref(false);

// 题型计数：选中项在其按钮上方显示该类题目总数，按住 Shift 全部显示
const typeCounts = ref({});
const showAllCounts = ref(false);
const hasTypeCounts = computed(() => Object.keys(typeCounts.value).length > 0);
const showCountFor = (key) => {
    if (showAllCounts.value) return true;
    if (key === "baoMing") return baoMingOnly.value;
    if (key === "all") return typeFilter.value.includes("all");
    return (
        !typeFilter.value.includes("all") && typeFilter.value.includes(key)
    );
};
/** 拉取当前题库各题型数量（错题库按本地数据统计） */
const refreshTypeCounts = async () => {
    if (!currentBank.value) {
        typeCounts.value = {};
        return;
    }
    if (isMistakeBook.value) {
        const counts = { all: 0, baoMing: 0 };
        for (const q of getMistakeBook()) {
            counts.all++;
            const type = q.type || "单选题";
            counts[type] = (counts[type] || 0) + 1;
            if (q.meta?.isBaoMing === true) counts.baoMing++;
        }
        typeCounts.value = counts;
        return;
    }
    try {
        const res = await api.getQuestionCounts(currentBank.value);
        typeCounts.value = res.data || {};
    } catch {
        typeCounts.value = {};
    }
};

const hasActiveFilters = () =>
    !typeFilter.value.includes("all") || baoMingOnly.value;
const resetRandomQueue = () => {
    mistakeRandomQueue = [];
    mistakeRandomPoolLen = 0;
};
const resetFilters = () => {
    typeFilter.value = ["all"];
    baoMingOnly.value = false;
    resetRandomQueue();
};
const resetQuestionState = () => {
    userAnswer.value = "";
    showResult.value = false;
    lastResult.value = null;
    mistakeNote.value = "";
    noteSaved.value = false;
};

function toggleTypeFilter(key) {
    if (key === "all") {
        typeFilter.value = ["all"];
        baoMingOnly.value = false;
    } else if (key === "baoMing") {
        baoMingOnly.value = !baoMingOnly.value;
        typeFilter.value = ["all"];
    } else {
        baoMingOnly.value = false;
        const cur = [...typeFilter.value];
        const allIdx = cur.indexOf("all");
        if (allIdx >= 0) cur.splice(allIdx, 1);
        const idx = cur.indexOf(key);
        if (idx >= 0) cur.splice(idx, 1);
        else cur.push(key);
        if (cur.length === 0) typeFilter.value = ["all"];
        else typeFilter.value = cur;
    }
    resetRandomQueue();
    loadQuestion();
}

const emit = defineEmits(["answer-submitted", "bank-changed"]);

const canSubmit = computed(() => {
    const hasAnswer = Array.isArray(userAnswer.value)
        ? userAnswer.value.length > 0
        : String(userAnswer.value || "").trim().length > 0;
    return hasAnswer && !showResult.value;
});
const isShortAnswer = computed(() => question.value?.type === "简答题"); // 简答题需文本框输入
const isFillBlank = computed(() => question.value?.type === "填空题"); // 填空题需文本框输入
const isMultiChoice = computed(() => question.value?.type === "多选题"); // 多选题支持多选字母
const isMistakeBook = computed(() => currentBank.value === MISTAKE_BOOK_ID);
const isBaoMing = computed(() => question.value?.meta?.isBaoMing === true);
const showAiJudgeButton = computed(() => shouldShowAiJudgeButton({
    aiMode: isAiMode.value,
    shortAnswer: isShortAnswer.value,
    fillBlank: isFillBlank.value,
    showResult: showResult.value,
}));
const allOptionsSelected = computed(() => {
    if (!isMultiChoice.value || !Array.isArray(userAnswer.value)) return false;
    const letters = getOptionLetters(question.value);
    return letters.length > 0 && letters.every((letter) => userAnswer.value.includes(letter));
});

const stripOpt = (s) =>
    (s || "").replace(/^(?:[A-Za-z]\s*[.、)）：:．（）—–\-]\s*)+/, "");
const emptyDescription = computed(() => {
    if (!currentBank.value) return "选择一个题库开始答题";
    if (isMistakeBook.value) return "错题库为空";
    return "题库为空";
});

const correctAnswer = computed(
    () =>
        lastResult.value?.correctAnswer ||
        question.value?.correctAnswer ||
        question.value?.answer ||
        "",
);
const fmtAnswer = computed(() =>
    toDisplayAnswer(question.value, correctAnswer.value),
);

const diagramConfig = computed(() => question.value?.meta?.diagram || null);
const diagramSvg = computed(() => question.value?.meta?.diagramSvg || "");

const isCorrectOption = (i) =>
    showResult.value &&
    correctAnswer.value.includes(toOriginalLetter(question.value, i));
const isWrongUserOption = (i) => {
    if (!showResult.value || lastResult.value?.correct) return false;
    const originalLetter = toOriginalLetter(question.value, i);
    const ua = userAnswer.value;
    return isMultiChoice.value && Array.isArray(ua)
        ? ua.includes(originalLetter)
        : ua === originalLetter;
};

const optionClass = (i) => {
    if (!showResult.value) {
        const origLetter = toOriginalLetter(question.value, i);
        const sel = isMultiChoice.value
            ? Array.isArray(userAnswer.value) &&
              userAnswer.value.includes(origLetter)
            : userAnswer.value === origLetter;
        return sel
            ? "border-primary bg-primary/5"
            : "border-border/50 hover:border-primary/40 hover:bg-primary/[0.02]";
    }
    if (isCorrectOption(i))
        return "border-success/30 bg-success/[0.06] dark:bg-success/[0.12] dark:border-success/25";
    if (isWrongUserOption(i))
        return "border-destructive/30 bg-destructive/[0.05] dark:bg-destructive/[0.10] dark:border-destructive/25";
    return "border-border/20 opacity-60";
};
const optionLetterClass = (i) => {
    if (!showResult.value) {
        const origLetter = toOriginalLetter(question.value, i);
        const sel = isMultiChoice.value
            ? Array.isArray(userAnswer.value) &&
              userAnswer.value.includes(origLetter)
            : userAnswer.value === origLetter;
        return sel
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/25 text-muted-foreground";
    }
    if (isCorrectOption(i))
        return "bg-success border-success text-success-foreground";
    if (isWrongUserOption(i))
        return "bg-destructive border-destructive text-destructive-foreground";
    return "border-muted-foreground/15 text-muted-foreground";
};

const onBankChange = async (bankId) => {
    currentBank.value = bankId;
    emit("bank-changed");
    resetFilters();
    resetQuestionState();
    refreshTypeCounts();
    if (!bankId) {
        loadRequestId++;
        question.value = null;
        loading.value = false;
        return;
    }
    lastMistakeIdx.value = 0;
    await loadQuestion();
};

/**
 * 加载题目：错题库取本地数据，普通题库调远端接口。支持题型过滤与顺序/随机模式
 * @returns {Promise<void>}
 */
const loadQuestion = async () => {
    if (!currentBank.value) return;
    const requestId = ++loadRequestId;
    loading.value = true;
    try {
        if (isMistakeBook.value) {
            const book = getMistakeBook();
            let filtered = book;
            if (!typeFilter.value.includes("all")) {
                filtered = book.filter((q) =>
                    typeFilter.value.includes(q.type || "单选题"),
                );
            }
            if (baoMingOnly.value) {
                filtered = filtered.filter((q) => q.meta?.isBaoMing === true);
            }
            if (requestId !== loadRequestId) return;
            if (filtered.length === 0) {
                if (hasActiveFilters()) {
                    toast.error("当前筛选没有题目，已恢复全部题型");
                    resetFilters();
                    await loadQuestion();
                    return;
                }
                question.value = null;
                return;
            }
            let q,
                qFinished = false;
            if (orderMode.value) {
                if (lastMistakeIdx.value >= filtered.length)
                    lastMistakeIdx.value = 0;
                q = filtered[lastMistakeIdx.value];
                qFinished = lastMistakeIdx.value === filtered.length - 1;
                lastMistakeIdx.value++;
            } else {
                // 复用/重建本地打乱队列：队列耗尽或池子数量变化时重新打乱（poolLen 记录构建时的池子大小）
                if (
                    mistakeRandomQueue.length === 0 ||
                    mistakeRandomPoolLen !== filtered.length
                ) {
                    mistakeRandomQueue = filtered.map((_, i) => i);
                    mistakeRandomPoolLen = filtered.length;
                    for (let i = mistakeRandomQueue.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [mistakeRandomQueue[i], mistakeRandomQueue[j]] = [
                            mistakeRandomQueue[j],
                            mistakeRandomQueue[i],
                        ];
                    }
                }
                const idx = mistakeRandomQueue.pop();
                q = filtered[idx];
                qFinished = mistakeRandomQueue.length === 0;
            }
            question.value = { ...q, id: q.questionId, finished: qFinished };
            if (shuffleMode.value) applyShuffle(question.value);
        } else {
            const res = await api.getQuestion(
                currentBank.value,
                orderMode.value,
                typeFilter.value.includes("all") ? null : [...typeFilter.value],
                baoMingOnly.value,
            );
            if (requestId !== loadRequestId) return;
            question.value = res.data;
            if (shuffleMode.value) applyShuffle(question.value);
        }
        // 重要题目：每次加载题目时触发角标冒出动画
        baoAnim.value = isBaoMing.value ? "enter" : "";
        resetQuestionState();
    } catch (e) {
        if (requestId !== loadRequestId) return;
        if (hasActiveFilters() && [400, 404].includes(e.response?.status)) {
            toast.error("当前筛选没有题目，已恢复全部题型");
            resetFilters();
            await loadQuestion();
            return;
        }
        toast.error(e.response?.data?.error || "加载失败");
        question.value = null;
    } finally {
        if (requestId === loadRequestId) loading.value = false;
    }
};

const toggleOrderMode = () => {
    orderMode.value = !orderMode.value;
    loadQuestion();
};

/**
 * 选择/取消选项。多选时维护字母数组，单选时直接设字母
 * @param {number} i - 选项索引 (0=A, 1=B, ...)
 */
const selectOption = (i) => {
    const l = toOriginalLetter(question.value, i);
    if (isMultiChoice.value) {
        if (!Array.isArray(userAnswer.value)) userAnswer.value = [];
        const a = [...userAnswer.value];
        const p = a.indexOf(l);
        p === -1 ? a.push(l) : a.splice(p, 1);
        userAnswer.value = a;
    } else {
        userAnswer.value = l;
    }
};

const toggleAllMultiOptions = () => {
    if (!isMultiChoice.value || showResult.value) return;
    userAnswer.value = toggleAllOptions(question.value, userAnswer.value);
};

/**
 * 本地判题（错题库用），支持选择题和简答/填空题答案比对
 * @param {Object} q - 题目对象
 * @param {string|string[]} ua - 用户答案
 * @returns {boolean} 是否正确
 */
const checkLocalAnswer = (q, ua) => {
    return judgeAnswer({
        type: q.type,
        standardAnswer: q.correctAnswer || q.answer || "",
        userAnswer: ua,
    });
};

/**
 * 重要题目答对后插图向左旋转消失；答错不做处理
 * @param {boolean} correct - 是否答对
 * @returns {void}
 */
const applyBaoResultAnim = (correct) => {
    if (!isBaoMing.value) return;
    if (correct) baoAnim.value = "correct";
};

/**
 * 提交答案：错题库本地判题，普通题库调远端接口。速刷模式自动跳下一题
 * @returns {Promise<void>}
 */
const submitAnswer = async () => {
    if (!canSubmit.value) return;
    const q = question.value;
    try {
        let correct, answer, explanation;
        if (isMistakeBook.value) {
            correct = checkLocalAnswer(q, userAnswer.value);
            answer = q.correctAnswer || q.answer;
            explanation = q.explanation;
        } else {
            const res = await api.submitAnswer(
                q.id,
                userAnswer.value,
                currentBank.value,
            );
            correct = res.data?.correct;
            answer = res.data?.answer;
            explanation = res.data?.explanation;
        }
        lastResult.value = {
            correct,
            explanation,
            correctAnswer: answer,
            questionData: {
                ...q,
                questionId: q.questionId || q.id,
                userAnswer: userAnswer.value,
                correctAnswer: answer,
                explanation,
                note: q.note || "",
            },
        };
        mistakeNote.value = lastResult.value.questionData.note || "";
        showResult.value = true;
        emit("answer-submitted", {
            isCorrect: correct,
            questionData: lastResult.value.questionData,
        });
        applyBaoResultAnim(correct);
        if (isMistakeBook.value && correct) {
            removeQuestionFromMistakeBook(q.questionId);
            bankSelectorRef.value?.refreshBanks();
            refreshTypeCounts();
        }

        // 速刷模式：自动跳下一题
        if (quickMode.value) setTimeout(() => advanceOrFinish(), 600);
    } catch {
        toast.error("提交失败");
    }
};

const saveMistakeNote = () => {
    if (!lastResult.value || lastResult.value.correct || quickMode.value)
        return;
    const qd = lastResult.value.questionData;
    qd.note = mistakeNote.value.trim();
    const updated = updateMistakeNote(qd.questionId, qd.note);
    if (updated) {
        lastResult.value.questionData = { ...qd, note: updated.note || "" };
        noteSaved.value = true;
        toast.success("备注已保存到错题本");
    } else {
        toast.error("请先确认该题已加入错题本");
    }
};

const nextQuestion = () => {
    advanceOrFinish();
};

/**
 * 前进逻辑：当前题是筛选池最后一道（finished）时弹“已答完”对话框，否则加载下一题
 * @returns {void}
 */
const advanceOrFinish = () => {
    if (question.value?.finished) {
        showFinishDialog.value = true;
        return;
    }
    loadQuestion();
};

/** 再来一遍：关闭弹窗，重新开始一轮（后端/本地队列会自动重新打乱） */
const restartCycle = () => {
    showFinishDialog.value = false;
    loadQuestion();
};

/** 退出刷题：关闭弹窗并取消题库选择，回到“选择一个题库开始答题” */
const exitPractice = () => {
    showFinishDialog.value = false;
    bankSelectorRef.value?.clearSelection?.();
};

/**
 * AI 判题：调用本地 AI 服务对简答/填空题评分，返回正确性与解析
 * @returns {Promise<void>}
 */
const aiJudgeQuestion = async () => {
    if (!question.value || !userAnswer.value || aiJudging.value) return;
    aiJudging.value = true;
    try {
        const res = await axios.post("http://localhost:13002/api/ai/judge", {
            questionId: question.value.id,
            userAnswer: userAnswer.value,
            model: selectedModel.value || undefined,
        });
        const { correct, explanation, answer: stdAnswer } = res.data;
        lastResult.value = {
            correct: !!correct,
            explanation: explanation || "AI 无法判题",
            correctAnswer:
                stdAnswer || question.value?.answer || "(AI 判题模式)",
            aiJudged: true,
            questionData: {
                ...question.value,
                questionId: question.value.questionId || question.value.id,
                userAnswer: userAnswer.value,
                correctAnswer: stdAnswer || "",
                explanation: explanation || "",
                aiJudged: true,
            },
        };
        showResult.value = true;
        emit("answer-submitted", {
            isCorrect: !!correct,
            questionData: lastResult.value.questionData,
        });
        applyBaoResultAnim(!!correct);
    } catch (e) {
        const msg = e.response?.data?.error || "AI 判题失败，请检查 API Key";
        toast.error(msg);
    } finally {
        aiJudging.value = false;
    }
};

/** 速刷模式快捷键 */
const onQuizKeydown = (e) => {
    if (!quickMode.value || !question.value || !currentBank.value) return;
    // 不在输入框内才响应
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const key = e.key.toUpperCase();
    const isChoice =
        question.value.type !== "简答题" && question.value.type !== "填空题";

    // 已显示结果 → 空格 = 下一题
    if (showResult.value) {
        if (e.code === "Space") {
            e.preventDefault();
            advanceOrFinish();
        }
        return;
    }

    // 选择题：A-Z 选选项
    if (isChoice && /^[A-Z]$/.test(key)) {
        const max = (question.value.options?.length || 0) - 1;
        const idx = key.charCodeAt(0) - 65;
        if (idx >= 0 && idx <= max) {
            e.preventDefault();
            selectOption(idx);
        }
        return;
    }

    // 空格 = 提交
    if (e.code === "Space" && canSubmit.value) {
        e.preventDefault();
        submitAnswer();
    }
};

// Shift 按住 = 题型计数全显（松开恢复只显示选中项）
const onShiftKeyDown = (e) => {
    if (e.key === "Shift") showAllCounts.value = true;
};
const onShiftKeyUp = (e) => {
    if (e.key === "Shift") showAllCounts.value = false;
};

onMounted(() => {
    document.addEventListener("keydown", onQuizKeydown);
    window.addEventListener("keydown", onShiftKeyDown);
    window.addEventListener("keyup", onShiftKeyUp);
    window.addEventListener("blur", () => (showAllCounts.value = false));
});
onUnmounted(() => {
    document.removeEventListener("keydown", onQuizKeydown);
    window.removeEventListener("keydown", onShiftKeyDown);
    window.removeEventListener("keyup", onShiftKeyUp);
});

defineExpose({ refreshBanks: () => bankSelectorRef.value?.refreshBanks() });
</script>

<style>
/*.bao-ming-card {
    border: 2px solid transparent;
    background-origin: border-box;
    background-clip: padding-box, border-box;
    background-image:
        linear-gradient(
            var(--color-background, #fff),
            var(--color-background, #fff)
        ),
        linear-gradient(90deg, #c2655a, #b8954a, #5d9b6a, #4a7dbf, #c2655a);
    background-size:
        100% 100%,
        300% 100%;
    background-position:
        0 0,
        0 0;
    animation: bao-ming-marquee 4s linear infinite;
}*/
@keyframes bao-ming-marquee {
    0% {
        background-position:
            0 0,
            0% 0;
    }
    100% {
        background-position:
            0 0,
            300% 0;
    }
}

/* ===== 重要题目死神：抓住选项右边缘，从选项背后旋转探出 ===== */

/*
 * 舞台：选项主体和死神必须处在同一个层叠上下文里。
 * overflow 保持 visible，避免探出的身体被裁掉。
 */
.bao-options-stage {
    position: relative;
    isolation: isolate;
    overflow: visible;
}

/*
 * 重要题目时给右侧插图留出空间。
 * 这个值同时决定选项右边缘的位置，需和 .bao-badge 的 left 计算保持一致。
 */
.bao-options-stage--active .bao-options-panel {
    margin-right: 118px;
}

/*
 * 选项主体永远压在死神上面。
 * background 必须是不透明的，否则下面的死神仍然会透出来。
 */
.bao-options-panel {
    position: relative;
    z-index: 2;
    background: var(--color-background, #fff);
}

/* 选项右边缘：作为死神“抓住”的竖线 */
.bao-options-panel::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 1px;
    background: var(--color-border, rgba(128, 128, 128, 0.28));
    z-index: 3;
    pointer-events: none;
}

/*
 * 死神：脱离 flex 布局，左边严格贴住选项右边缘。
 * 旋转轴固定在图片左下角，因此看起来像抓着竖线转出来。
 */
.bao-badge {
    position: absolute;
    left: calc(100% - 150px);
    bottom: 16px;

    width: 160px;
    height: 160px;
    object-fit: contain;

    pointer-events: none;
    z-index: 1;

    transform-origin: 0% 100%;
    will-change: transform, opacity;
}

/* 出现：左下角固定，-90° → 0°，透明度 0 → 1 */
.bao-enter {
    animation: bao-emerge 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes bao-emerge {
    0% {
        opacity: 0;
        transform: rotate(-90deg);
    }
    35% {
        opacity: 0.45;
    }
    100% {
        opacity: 1;
        transform: rotate(0deg);
    }
}

/* 答对：沿原路缩回选项背后 */
.bao-correct {
    animation: bao-hide 0.58s cubic-bezier(0.64, 0, 0.78, 0) both;
}

@keyframes bao-hide {
    0% {
        opacity: 1;
        transform: rotate(0deg);
    }
    65% {
        opacity: 0.45;
    }
    100% {
        opacity: 0;
        transform: rotate(-90deg);
    }
}
</style>
