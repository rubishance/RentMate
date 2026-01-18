/**
 * Dashboard Charts Controller
 * Manages all Chart.js visualizations on the dashboard
 */

class DashboardCharts {
    constructor() {
        this.charts = {};
        this.dataCache = null;
        this.colors = {
            primary: '#0066ff',
            success: '#4CAF50',
            danger: '#ff3b30',
            warning: '#ff9500',
            info: '#2196F3',
            gray: '#E0E0E0'
        };

        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        // Configure Chart.js defaults
        Chart.defaults.font.family = "'Heebo', sans-serif";
        Chart.defaults.color = '#666';
    }

    async init() {
        try {
            // Load and cache data from database
            this.dataCache = await this.loadChartData();

            // Create charts with default ranges
            this.createIncomeExpenseChart(this.dataCache, 12);
            this.createOccupancyChart(this.dataCache.occupancyData);
            this.createPaymentTrendsChart(this.dataCache, 6);

            this.initEventListeners();
            console.log('Dashboard charts initialized');
        } catch (error) {
            console.error('Error initializing charts:', error);
        }
    }

    initEventListeners() {
        // Income/Expense Range Selector
        const incomeRange = document.getElementById('incomeExpenseRange');
        if (incomeRange) {
            incomeRange.addEventListener('change', (e) => {
                const months = parseInt(e.target.value);
                this.updateIncomeExpenseChart(months);
            });
        }

        // Payment Trends Range Selector
        const trendsRange = document.getElementById('paymentTrendsRange');
        if (trendsRange) {
            trendsRange.addEventListener('change', (e) => {
                const months = parseInt(e.target.value);
                this.updatePaymentTrendsChart(months);
            });
        }
    }

    async loadChartData() {
        try {
            // Get raw data from database
            const contracts = await window.rentMateDB.getAll('contracts') || [];
            const payments = await window.rentMateDB.getAll('payments') || [];
            const properties = await window.rentMateDB.getAll('properties') || [];

            const occupancyData = this.calculateOccupancy(properties);

            return { contracts, payments, properties, occupancyData };
        } catch (error) {
            console.error('Failed to load chart data:', error);
            // Return empty data to prevent crash
            return { contracts: [], payments: [], properties: [], occupancyData: this.calculateOccupancy([]) };
        }
    }

    calculateIncomeExpense(data, monthsToView) {
        const contracts = data.contracts;
        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
            'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

        const now = new Date();
        const labels = [];
        const incomeData = [];
        const expenseData = [];

        for (let i = monthsToView - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(months[date.getMonth()]);

            // Calculate income
            const monthIncome = contracts
                .filter(c => {
                    const start = new Date(c.startDate);
                    const end = new Date(c.endDate);
                    return start <= date && end >= date;
                })
                .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

            incomeData.push(monthIncome);
            // Mock expense data
            expenseData.push(Math.floor(monthIncome * (0.15 + Math.random() * 0.1)));
        }

        return { labels, incomeData, expenseData };
    }

    calculateOccupancy(properties) {
        const total = properties.length;
        const occupied = properties.filter(p => p.status === 'מושכר').length;
        const vacant = total - occupied;

        return {
            labels: ['מושכר', 'פנוי'],
            data: [occupied, vacant],
            percentage: total > 0 ? Math.round((occupied / total) * 100) : 0
        };
    }

    calculatePaymentTrends(data, monthsToView) {
        const payments = data.payments;
        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
            'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

        const now = new Date();
        const labels = [];
        const chartData = [];

        for (let i = monthsToView - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(months[date.getMonth()]);

            const monthPayments = payments
                .filter(p => {
                    const paymentDate = new Date(p.dueDate);
                    return paymentDate.getMonth() === date.getMonth() &&
                        paymentDate.getFullYear() === date.getFullYear() &&
                        p.status === 'שולם';
                })
                .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

            chartData.push(monthPayments);
        }

        return { labels, data: chartData };
    }

    createIncomeExpenseChart(rawData, months) {
        const ctx = document.getElementById('incomeExpenseChart');
        if (!ctx) return;

        const data = this.calculateIncomeExpense(rawData, months);

        this.charts.incomeExpense = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'הכנסות',
                        data: data.incomeData,
                        backgroundColor: this.colors.success,
                        borderRadius: 6,
                        barThickness: 20
                    },
                    {
                        label: 'הוצאות',
                        data: data.expenseData,
                        backgroundColor: this.colors.danger,
                        borderRadius: 6,
                        barThickness: 20
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        rtl: true,
                        labels: { usePointStyle: true, padding: 15, font: { size: 12 } }
                    },
                    tooltip: {
                        rtl: true,
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ₪' + context.parsed.y.toLocaleString('he-IL');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: function (value) { return '₪' + value.toLocaleString('he-IL'); } },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    updateIncomeExpenseChart(months) {
        if (!this.charts.incomeExpense || !this.dataCache) return;
        const data = this.calculateIncomeExpense(this.dataCache, months);

        this.charts.incomeExpense.data.labels = data.labels;
        this.charts.incomeExpense.data.datasets[0].data = data.incomeData;
        this.charts.incomeExpense.data.datasets[1].data = data.expenseData;
        this.charts.incomeExpense.update();
    }

    createOccupancyChart(data) {
        const ctx = document.getElementById('occupancyChart');
        if (!ctx) return;

        this.charts.occupancy = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.data,
                    backgroundColor: [this.colors.success, this.colors.gray],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        rtl: true,
                        labels: { usePointStyle: true, padding: 15, font: { size: 12 } }
                    },
                    tooltip: {
                        rtl: true,
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                                return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                            }
                        }
                    }
                },
                // Add center text plugin
                plugins: [{
                    id: 'centerText',
                    beforeDraw: function (chart) {
                        const width = chart.width;
                        const height = chart.height;
                        const ctx = chart.ctx;
                        ctx.restore();
                        const fontSize = (height / 114).toFixed(2);
                        ctx.font = fontSize + "em Heebo";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = "#333";
                        const text = data.percentage + "%";
                        const textX = Math.round((width - ctx.measureText(text).width) / 2);
                        const textY = height / 2;
                        ctx.fillText(text, textX, textY);
                        ctx.save();
                    }
                }]
            }
        });
    }

    createPaymentTrendsChart(rawData, months) {
        const ctx = document.getElementById('paymentTrendsChart');
        if (!ctx) return;

        const data = this.calculatePaymentTrends(rawData, months);

        this.charts.paymentTrends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'תשלומים שנגבו',
                    data: data.data,
                    borderColor: this.colors.primary,
                    backgroundColor: 'rgba(0, 102, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: this.colors.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        rtl: true,
                        callbacks: {
                            label: function (context) {
                                return 'סכום: ₪' + context.parsed.y.toLocaleString('he-IL');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: function (value) { return '₪' + value.toLocaleString('he-IL'); } },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    updatePaymentTrendsChart(months) {
        if (!this.charts.paymentTrends || !this.dataCache) return;
        const data = this.calculatePaymentTrends(this.dataCache, months);

        this.charts.paymentTrends.data.labels = data.labels;
        this.charts.paymentTrends.data.datasets[0].data = data.data;
        this.charts.paymentTrends.update();
    }

    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }

    updateCharts() {
        this.destroy();
        this.init();
    }
}

// Initialize charts when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof Chart !== 'undefined') {
            window.dashboardCharts = new DashboardCharts();
            // Wait for database to be ready
            setTimeout(() => window.dashboardCharts.init(), 1000);
        }
    });
} else {
    if (typeof Chart !== 'undefined') {
        window.dashboardCharts = new DashboardCharts();
        setTimeout(() => window.dashboardCharts.init(), 1000);
    }
}
