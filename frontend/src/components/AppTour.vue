<script setup>
import { ref, onMounted } from 'vue'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const steps = [
  {
    element: '[data-tour="stats"]',
    popover: {
      title: '答题统计',
      description: '这里显示你的答题正确率和各题型分布。环形图中间是正确率，下方柱形图按单选/多选/判断分类统计。',
      side: 'right',
    },
  },
  {
    element: '[data-tour="quiz"]',
    popover: {
      title: '答题区',
      description: '选择题库后在这里答题。选好答案点击"提交答案"看对错，"下一题"继续。打开 ⚡ 速刷模式可以一键提交并跳转。',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="wrong"]',
    popover: {
      title: '错题本',
      description: '答错的题目会自动收集到这里，可以回顾正确答案和解析。底部按钮可以导出为 Markdown 或纯文本。',
      side: 'left',
    },
  },
  {
    element: '[data-tour="exam-btn"]',
    popover: {
      title: '考试模式',
      description: '点击这里进入考试模式。选择题库和时长后，系统会生成一张包含单选/多选/判断的完整试卷，计时作答。',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="theme-btn"]',
    popover: {
      title: '深色模式',
      description: '点击 🌙/☀ 可以在浅色和深色模式之间切换，动画很丝滑。',
      side: 'bottom',
    },
  },
]

const driverObj = driver({
  showProgress: true,
  steps,
  popoverClass: 'driver-popover',
  animate: true,
  overlayColor: 'rgba(0, 0, 0, 0.4)',
  smoothScroll: true,
  allowClose: true,
  stagePadding: 4,
  prevBtnText: '上一步',
  nextBtnText: '下一步',
  doneBtnText: '知道了',
  progressText: '{{current}} / {{total}}',
})

const runTour = () => {
  driverObj.drive()
}

// 首次访问自动引导
onMounted(() => {
  if (!localStorage.getItem('tour-shown')) {
    setTimeout(() => {
      driverObj.drive()
      localStorage.setItem('tour-shown', '1')
    }, 800)
  }
})

defineExpose({ runTour })
</script>

<template>
  <button
    class="inline-flex items-center justify-center w-7 h-7 rounded-none text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-colors"
    title="功能引导"
    @click="runTour"
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
    </svg>
  </button>
</template>

<style>
/* Driver.js Bento 风格覆盖 */
.driver-popover.driverjs-theme {
  border-radius: 0 !important;
  border: 1px solid var(--color-border) !important;
  box-shadow: 0 8px 40px rgba(0,0,0,0.15) !important;
  background: var(--color-card) !important;
  color: var(--color-foreground) !important;
}
.driver-popover .driver-popover-title {
  font-family: var(--font-sans) !important;
  font-size: 15px !important;
  font-weight: 650 !important;
  color: var(--color-foreground) !important;
  border-bottom: 1px solid var(--color-border) !important;
  padding-bottom: 10px !important;
  margin-bottom: 8px !important;
}
.driver-popover .driver-popover-description {
  font-size: 13px !important;
  color: var(--color-muted-foreground) !important;
  line-height: 1.6 !important;
}
.driver-popover .driver-popover-footer button {
  border-radius: 0 !important;
  font-family: var(--font-sans) !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  text-shadow: none !important;
}
.driver-popover .driver-popover-next-btn {
  background: var(--color-primary) !important;
  color: var(--color-primary-foreground) !important;
  border: none !important;
}
.driver-popover .driver-popover-prev-btn {
  background: transparent !important;
  color: var(--color-muted-foreground) !important;
  border: 1px solid var(--color-border) !important;
}
.driver-popover .driver-popover-close-btn {
  color: var(--color-muted-foreground) !important;
}
.driver-popover .driver-popover-progress-text {
  font-size: 11px !important;
  color: var(--color-muted-foreground) !important;
}
</style>
