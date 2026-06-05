import { ref, watchEffect, nextTick } from 'vue'

const isDark = ref(localStorage.getItem('theme') === 'dark')

// 初始化
watchEffect(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
})

export function useTheme() {
  const toggle = async (event) => {
    // 支持 View Transition API（Chromium 111+ / Electron）
    if (document.startViewTransition) {
      const x = event?.clientX ?? window.innerWidth / 2
      const y = event?.clientY ?? window.innerHeight / 2
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      )

      const transition = document.startViewTransition(() => {
        isDark.value = !isDark.value
      })

      await transition.ready

      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ]

      // 新主题始终从按钮位置圆形扩散
      document.documentElement.animate(
        { clipPath },
        {
          duration: 500,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    } else {
      // 回退：直接切换
      isDark.value = !isDark.value
    }
  }

  return { isDark, toggle }
}
