<!-- components/StatsCard.vue -->
<template>
    <el-card class="stats-card">
        <template #header>
            <div class="card-header">
                <span>答题情况</span>
            </div>
        </template>

        <!-- 上半部分：数据显示 -->
        <div class="stats-display">
            <div class="stat-item correct">
                <span class="stat-value">{{ stats.correct }}</span>
                <span class="stat-label">正确</span>
            </div>
            <div class="stat-item incorrect">
                <span class="stat-value">{{ stats.incorrect }}</span>
                <span class="stat-label">错误</span>
            </div>
        </div>

        <!-- 下半部分：图表 -->
        <div class="chart-container">
            <Doughnut v-if="hasData" :data="chartData" :options="chartOptions" />
            <el-empty v-else description="暂无答题数据" :image-size="80" />
        </div>
    </el-card>
</template>

<script setup>
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { ElCard, ElEmpty } from 'element-plus';

// 注册 Chart.js 模块
ChartJS.register(ArcElement, Tooltip, Legend);

// 接收从父组件传来的统计数据
const props = defineProps({
    stats: {
        type: Object,
        required: true,
        default: () => ({ correct: 0, incorrect: 0 })
    }
});

// 判断是否有数据用于显示图表
const hasData = computed(() => props.stats.correct > 0 || props.stats.incorrect > 0);

// 根据 props 动态计算图表数据
const chartData = computed(() => ({
    labels: ['正确', '错误'],
    datasets: [
        {
            backgroundColor: ['#67C23A', '#F56C6C'], // 成功和错误的颜色
            data: [props.stats.correct, props.stats.incorrect]
        }
    ]
}));

// 图表配置项
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom', // 图例放在底部
        }
    }
};
</script>

<style scoped>
.stats-card {
    width: 100%;
    border-radius: 16px;
}

.card-header span {
    font-weight: bold;
    font-size: 18px;
}

.stats-display {
    display: flex;
    justify-content: space-around;
    text-align: center;
    margin-bottom: 24px;
}

.stat-item .stat-value {
    display: block;
    font-size: 32px;
    font-weight: bold;
    line-height: 1.2;
}

.stat-item .stat-label {
    font-size: 14px;
    color: #606266;
}

.stat-item.correct .stat-value {
    color: #67C23A;
}

.stat-item.incorrect .stat-value {
    color: #F56C6C;
}

.chart-container {
    position: relative;
    height: 250px;
    /* 给图表一个固定的高度 */
}
</style>