<template>
  <el-card class="stats-card" shadow="never">
    <div class="stats-header">
      <div>
        <div class="stats-kicker">Overview</div>
        <h3>练习统计</h3>
        <p>{{ currentBankName || "选择题库后开始统计本轮练习表现" }}</p>
      </div>
      <div class="status-chip" :class="{ active: hasData }">
        {{ hasData ? "实时更新" : "等待数据" }}
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-tile">
        <span>已答题数</span>
        <strong>{{ total }}</strong>
      </div>
      <div class="stat-tile success">
        <span>答对</span>
        <strong>{{ stats.correct }}</strong>
      </div>
      <div class="stat-tile danger">
        <span>答错</span>
        <strong>{{ stats.incorrect }}</strong>
      </div>
    </div>

    <div class="accuracy-panel">
      <div class="accuracy-head">
        <span>当前正确率</span>
        <strong>{{ accuracy }}%</strong>
      </div>
      <el-progress
        :percentage="accuracy"
        :stroke-width="10"
        :show-text="false"
        color="#2176ff"
      />
    </div>

    <div class="chart-panel">
      <Doughnut v-if="hasData" :data="chartData" :options="chartOptions" />
      <div v-else class="chart-empty">
        <el-empty description="开始答题后这里会显示结果分布" :image-size="84" />
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from "vue";
import { Doughnut } from "vue-chartjs";
import { Chart as ChartJS, ArcElement, Legend, Tooltip } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps({
  stats: {
    type: Object,
    required: true,
    default: () => ({ correct: 0, incorrect: 0 }),
  },
  currentBankName: {
    type: String,
    default: "",
  },
});

const total = computed(() => props.stats.correct + props.stats.incorrect);
const hasData = computed(() => total.value > 0);
const accuracy = computed(() => {
  if (!total.value) return 0;
  return Math.round((props.stats.correct / total.value) * 100);
});

const chartData = computed(() => ({
  labels: ["答对", "答错"],
  datasets: [
    {
      backgroundColor: ["#1f9d68", "#e35454"],
      borderWidth: 0,
      hoverOffset: 6,
      data: [props.stats.correct, props.stats.incorrect],
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "68%",
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        usePointStyle: true,
        boxWidth: 10,
        color: "#5f6f89",
        padding: 18,
        font: {
          family: "Outfit, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif",
          size: 12,
        },
      },
    },
  },
};
</script>

<style scoped>
.stats-card {
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(18px);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
}

.stats-kicker {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(33, 118, 255, 0.1);
  color: #1658c0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stats-header h3 {
  margin: 12px 0 8px;
  font-size: 26px;
  color: #17233c;
}

.stats-header p {
  margin: 0;
  color: #657792;
  line-height: 1.7;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(133, 158, 196, 0.14);
  color: #73839d;
  font-size: 12px;
  font-weight: 700;
}

.status-chip.active {
  background: rgba(31, 157, 104, 0.12);
  color: #1f9d68;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 22px;
}

.stat-tile {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 20px;
  background: #f8fbff;
  border: 1px solid rgba(133, 158, 196, 0.12);
}

.stat-tile span {
  color: #70819b;
  font-size: 13px;
}

.stat-tile strong {
  color: #17233c;
  font-size: 28px;
  line-height: 1;
}

.stat-tile.success {
  background: rgba(31, 157, 104, 0.08);
}

.stat-tile.success strong {
  color: #1f9d68;
}

.stat-tile.danger {
  background: rgba(227, 84, 84, 0.08);
}

.stat-tile.danger strong {
  color: #d54646;
}

.accuracy-panel {
  margin-top: 18px;
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.96), #ffffff);
  border: 1px solid rgba(133, 158, 196, 0.14);
}

.accuracy-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: #64758f;
}

.accuracy-head strong {
  color: #17233c;
  font-size: 20px;
}

.chart-panel {
  position: relative;
  height: 290px;
  margin-top: 18px;
  padding: 12px 4px 0;
}

.chart-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 980px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stats-header {
    flex-direction: column;
  }
}
</style>
