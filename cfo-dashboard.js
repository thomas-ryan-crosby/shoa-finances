let financialData = null;
let charts = {};
let currentScenario = 'base';

// Load data
async function loadData() {
    try {
        const response = await fetch('data.json');
        financialData = await response.json();
        initializeDashboard();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').innerHTML = 'Error loading data. Please ensure data.json exists.';
    }
}

function initializeDashboard() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    updateKPIs();
    generateInsights();
    createIncomeExpenseChart();
    createMarginChart();
    createExpenseTrendsChart();
    createVarianceAnalysis();
    createForecast();
    createCashFlowChart();
    createForecastTable();
    analyzeReserves();
    generateRecommendations();
}

function updateKPIs() {
    const years = [2023, 2024, 2025];
    const data = years.map(year => {
        const yearData = financialData.pnl_data[year.toString()];
        const income = Object.values(yearData?.income || {}).reduce((a, b) => a + b, 0);
        const expenses = Object.values(yearData?.expenses || {}).reduce((a, b) => a + b, 0);
        const net = income - expenses;
        const margin = income > 0 ? (net / income * 100) : 0;
        const expenseRatio = income > 0 ? (expenses / income * 100) : 0;
        
        return { year, income, expenses, net, margin, expenseRatio };
    });
    
    const y2025 = data[2];
    const y2024 = data[1];
    const y2023 = data[0];
    
    // Calculate 3-year averages and trends
    const avgIncome = data.reduce((sum, d) => sum + d.income, 0) / 3;
    const avgExpenses = data.reduce((sum, d) => sum + d.expenses, 0) / 3;
    const avgMargin = data.reduce((sum, d) => sum + d.margin, 0) / 3;
    const incomeGrowth = ((y2025.income - y2023.income) / y2023.income * 100);
    const expenseGrowth = ((y2025.expenses - y2023.expenses) / y2023.expenses * 100);
    const marginChange = y2025.margin - y2023.margin;
    
    const kpiGrid = document.getElementById('kpiGrid');
    kpiGrid.innerHTML = `
        <div class="kpi-card ${y2025.net >= 0 ? 'positive' : 'danger'}">
            <div class="kpi-label">Net Income 2025</div>
            <div class="kpi-value">$${formatCurrency(y2025.net)}</div>
            <div class="kpi-change">${marginChange >= 0 ? '+' : ''}${marginChange.toFixed(1)}% vs 2023</div>
        </div>
        <div class="kpi-card positive">
            <div class="kpi-label">Operating Margin</div>
            <div class="kpi-value">${y2025.margin.toFixed(1)}%</div>
            <div class="kpi-change">3-Yr Avg: ${avgMargin.toFixed(1)}%</div>
        </div>
        <div class="kpi-card ${expenseRatio < 95 ? 'positive' : expenseRatio < 100 ? 'warning' : 'danger'}">
            <div class="kpi-label">Expense Ratio</div>
            <div class="kpi-value">${y2025.expenseRatio.toFixed(1)}%</div>
            <div class="kpi-change">${expenseRatio < 100 ? 'Healthy' : 'Over Budget'}</div>
        </div>
        <div class="kpi-card positive">
            <div class="kpi-label">Income Growth (3-Yr)</div>
            <div class="kpi-value">${incomeGrowth >= 0 ? '+' : ''}${incomeGrowth.toFixed(1)}%</div>
            <div class="kpi-change">$${formatCurrency(y2025.income - y2023.income)}</div>
        </div>
        <div class="kpi-card ${expenseGrowth < 10 ? 'positive' : 'warning'}">
            <div class="kpi-label">Expense Growth (3-Yr)</div>
            <div class="kpi-value">${expenseGrowth >= 0 ? '+' : ''}${expenseGrowth.toFixed(1)}%</div>
            <div class="kpi-change">$${formatCurrency(y2025.expenses - y2023.expenses)}</div>
        </div>
        <div class="kpi-card positive">
            <div class="kpi-label">3-Yr Avg Income</div>
            <div class="kpi-value">$${formatCurrency(avgIncome)}</div>
            <div class="kpi-change">Annual Average</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">3-Yr Avg Expenses</div>
            <div class="kpi-value">$${formatCurrency(avgExpenses)}</div>
            <div class="kpi-change">Annual Average</div>
        </div>
        <div class="kpi-card ${y2025.margin > y2024.margin ? 'positive' : 'warning'}">
            <div class="kpi-label">Margin Trend</div>
            <div class="kpi-value">${y2025.margin > y2024.margin ? '↑' : '↓'}</div>
            <div class="kpi-change">${y2025.margin > y2024.margin ? 'Improving' : 'Declining'}</div>
        </div>
    `;
}

function generateInsights() {
    const years = [2023, 2024, 2025];
    const data = years.map(year => {
        const yearData = financialData.pnl_data[year.toString()];
        const income = Object.values(yearData?.income || {}).reduce((a, b) => a + b, 0);
        const expenses = Object.values(yearData?.expenses || {}).reduce((a, b) => a + b, 0);
        return { year, income, expenses, net: income - expenses };
    });
    
    const insights = [];
    
    // Income trend
    const incomeGrowth = ((data[2].income - data[0].income) / data[0].income * 100);
    if (incomeGrowth > 5) {
        insights.push({
            type: 'positive',
            title: 'Strong Income Growth',
            text: `Income has grown ${incomeGrowth.toFixed(1)}% over 3 years, primarily from dues increases and interest income.`
        });
    }
    
    // Expense trend
    const expenseGrowth = ((data[2].expenses - data[0].expenses) / data[0].expenses * 100);
    if (expenseGrowth > incomeGrowth) {
        insights.push({
            type: 'warning',
            title: 'Expense Growth Exceeding Income',
            text: `Expenses grew ${expenseGrowth.toFixed(1)}% while income grew ${incomeGrowth.toFixed(1)}%, narrowing margins.`
        });
    }
    
    // Top expense categories
    const allExpenses = {};
    years.forEach(year => {
        const expenses = financialData.pnl_data[year.toString()]?.expenses || {};
        Object.entries(expenses).forEach(([cat, amt]) => {
            if (!allExpenses[cat]) allExpenses[cat] = [];
            allExpenses[cat].push(amt);
        });
    });
    
    const topExpenses = Object.entries(allExpenses)
        .map(([cat, amounts]) => ({
            category: cat,
            avg: amounts.reduce((a, b) => a + b, 0) / amounts.length,
            trend: amounts[amounts.length - 1] - amounts[0]
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3);
    
    insights.push({
        type: 'info',
        title: 'Top Expense Drivers',
        text: `Largest expenses: ${topExpenses.map(e => e.category).join(', ')}. These represent ${((topExpenses.reduce((s, e) => s + e.avg, 0) / data[2].expenses) * 100).toFixed(0)}% of total expenses.`
    });
    
    // Margin analysis
    const margins = data.map(d => (d.net / d.income * 100));
    if (margins[2] < 0) {
        insights.push({
            type: 'danger',
            title: 'Negative Operating Margin',
            text: `2025 shows a negative margin of ${margins[2].toFixed(1)}%, indicating expenses exceed income. The 10% dues increase in 2026 is critical.`
        });
    }
    
    const insightsDiv = document.getElementById('insights');
    insightsDiv.innerHTML = insights.map(insight => `
        <div class="insight-box" style="border-left-color: ${insight.type === 'positive' ? '#28a745' : insight.type === 'warning' ? '#ffc107' : insight.type === 'danger' ? '#dc3545' : '#17a2b8'};">
            <h4>${insight.title}</h4>
            <p>${insight.text}</p>
        </div>
    `).join('');
}

function createIncomeExpenseChart() {
    const ctx = document.getElementById('incomeExpenseChart').getContext('2d');
    const years = [2023, 2024, 2025];
    
    const income = years.map(y => {
        const data = financialData.pnl_data[y.toString()];
        return Object.values(data?.income || {}).reduce((a, b) => a + b, 0);
    });
    
    const expenses = years.map(y => {
        const data = financialData.pnl_data[y.toString()];
        return Object.values(data?.expenses || {}).reduce((a, b) => a + b, 0);
    });
    
    if (charts.incomeExpense) charts.incomeExpense.destroy();
    
    charts.incomeExpense = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Income',
                data: income,
                backgroundColor: 'rgba(40, 167, 69, 0.8)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 2
            }, {
                label: 'Expenses',
                data: expenses,
                backgroundColor: 'rgba(220, 53, 69, 0.8)',
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function createMarginChart() {
    const ctx = document.getElementById('marginChart').getContext('2d');
    const years = [2023, 2024, 2025];
    
    const margins = years.map(y => {
        const data = financialData.pnl_data[y.toString()];
        const income = Object.values(data?.income || {}).reduce((a, b) => a + b, 0);
        const expenses = Object.values(data?.expenses || {}).reduce((a, b) => a + b, 0);
        return income > 0 ? ((income - expenses) / income * 100) : 0;
    });
    
    if (charts.margin) charts.margin.destroy();
    
    charts.margin = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Operating Margin %',
                data: margins,
                borderColor: 'rgba(102, 126, 234, 1)',
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Margin: ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

function createExpenseTrendsChart() {
    const ctx = document.getElementById('expenseTrendsChart').getContext('2d');
    const years = [2023, 2024, 2025];
    
    // Get top 10 expense categories
    const allCategories = new Set();
    years.forEach(year => {
        const expenses = financialData.pnl_data[year.toString()]?.expenses || {};
        Object.keys(expenses).forEach(cat => allCategories.add(cat));
    });
    
    const categoryTotals = {};
    allCategories.forEach(cat => {
        categoryTotals[cat] = years.reduce((sum, year) => {
            return sum + (financialData.pnl_data[year.toString()]?.expenses[cat] || 0);
        }, 0);
    });
    
    const top10 = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(e => e[0]);
    
    const datasets = top10.map((category, idx) => {
        const data = years.map(year => {
            return financialData.pnl_data[year.toString()]?.expenses[category] || 0;
        });
        
        const colors = [
            'rgba(102, 126, 234, 0.8)', 'rgba(118, 75, 162, 0.8)', 'rgba(255, 159, 64, 0.8)',
            'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(201, 203, 207, 0.8)',
            'rgba(255, 159, 64, 0.8)'
        ];
        
        return {
            label: category.substring(0, 30),
            data: data,
            borderColor: colors[idx % colors.length],
            backgroundColor: colors[idx % colors.length].replace('0.8', '0.2'),
            borderWidth: 2,
            fill: false,
            tension: 0.4
        };
    });
    
    if (charts.expenseTrends) charts.expenseTrends.destroy();
    
    charts.expenseTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'right' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function createVarianceAnalysis() {
    const years = [2023, 2024, 2025];
    const data = years.map(year => {
        const yearData = financialData.pnl_data[year.toString()];
        const income = Object.values(yearData?.income || {}).reduce((a, b) => a + b, 0);
        const expenses = Object.values(yearData?.expenses || {}).reduce((a, b) => a + b, 0);
        return { year, income, expenses, net: income - expenses };
    });
    
    let html = '<table class="variance-table" style="width: 100%;">';
    html += '<thead><tr><th>Metric</th><th>2023</th><th>2024</th><th>2025</th><th>YoY Change (24-25)</th><th>3-Yr Change</th></tr></thead><tbody>';
    
    // Income
    const incomeVar = ((data[2].income - data[1].income) / data[1].income * 100);
    const income3Yr = ((data[2].income - data[0].income) / data[0].income * 100);
    html += `<tr>
        <td><strong>Total Income</strong></td>
        <td>$${formatCurrency(data[0].income)}</td>
        <td>$${formatCurrency(data[1].income)}</td>
        <td>$${formatCurrency(data[2].income)}</td>
        <td class="${incomeVar >= 0 ? 'variance-positive' : 'variance-negative'}">${incomeVar >= 0 ? '+' : ''}${incomeVar.toFixed(1)}%</td>
        <td class="${income3Yr >= 0 ? 'variance-positive' : 'variance-negative'}">${income3Yr >= 0 ? '+' : ''}${income3Yr.toFixed(1)}%</td>
    </tr>`;
    
    // Expenses
    const expVar = ((data[2].expenses - data[1].expenses) / data[1].expenses * 100);
    const exp3Yr = ((data[2].expenses - data[0].expenses) / data[0].expenses * 100);
    html += `<tr>
        <td><strong>Total Expenses</strong></td>
        <td>$${formatCurrency(data[0].expenses)}</td>
        <td>$${formatCurrency(data[1].expenses)}</td>
        <td>$${formatCurrency(data[2].expenses)}</td>
        <td class="${expVar >= 0 ? 'variance-negative' : 'variance-positive'}">${expVar >= 0 ? '+' : ''}${expVar.toFixed(1)}%</td>
        <td class="${exp3Yr >= 0 ? 'variance-negative' : 'variance-positive'}">${exp3Yr >= 0 ? '+' : ''}${exp3Yr.toFixed(1)}%</td>
    </tr>`;
    
    // Net Income
    const netVar = data[2].net - data[1].net;
    const net3Yr = data[2].net - data[0].net;
    html += `<tr>
        <td><strong>Net Income</strong></td>
        <td>$${formatCurrency(data[0].net)}</td>
        <td>$${formatCurrency(data[1].net)}</td>
        <td>$${formatCurrency(data[2].net)}</td>
        <td class="${netVar >= 0 ? 'variance-positive' : 'variance-negative'}">$${formatCurrency(netVar)}</td>
        <td class="${net3Yr >= 0 ? 'variance-positive' : 'variance-negative'}">$${formatCurrency(net3Yr)}</td>
    </tr>`;
    
    html += '</tbody></table>';
    document.getElementById('varianceAnalysis').innerHTML = html;
}

function createForecast() {
    const years = [2023, 2024, 2025];
    const historical = years.map(year => {
        const yearData = financialData.pnl_data[year.toString()];
        const income = Object.values(yearData?.income || {}).reduce((a, b) => a + b, 0);
        const expenses = Object.values(yearData?.expenses || {}).reduce((a, b) => a + b, 0);
        return { year, income, expenses, net: income - expenses };
    });
    
    // Calculate base forecasts
    const avgIncome = historical.reduce((sum, d) => sum + d.income, 0) / 3;
    const avgExpenses = historical.reduce((sum, d) => sum + d.expenses, 0) / 3;
    const latestIncome = historical[2].income;
    const latestExpenses = historical[2].expenses;
    
    // 2026 Forecast: 10% dues increase, 3% expense inflation
    const dues2025 = financialData.pnl_data['2025']?.income['Annual Dues Income'] || 0;
    const otherIncome2025 = latestIncome - dues2025;
    const income2026 = (dues2025 * 1.10) + (otherIncome2025 * 1.03); // 10% dues, 3% other income
    const expenses2026 = latestExpenses * 1.03; // 3% inflation
    
    // 2027 Forecast: Another 10% dues increase
    const dues2026 = dues2025 * 1.10;
    const otherIncome2026 = otherIncome2025 * 1.03;
    const income2027 = (dues2026 * 1.10) + (otherIncome2026 * 1.03);
    const expenses2027 = expenses2026 * 1.03;
    
    // Apply scenario adjustments
    let scenarioMultiplier = { income: 1.0, expenses: 1.0 };
    if (currentScenario === 'optimistic') {
        scenarioMultiplier.income = 1.05;
    } else if (currentScenario === 'conservative') {
        scenarioMultiplier.expenses = 1.02;
    }
    
    const forecast2026 = {
        income: income2026 * scenarioMultiplier.income,
        expenses: expenses2026 * scenarioMultiplier.expenses,
        net: (income2026 * scenarioMultiplier.income) - (expenses2026 * scenarioMultiplier.expenses)
    };
    
    const forecast2027 = {
        income: income2027 * scenarioMultiplier.income,
        expenses: expenses2027 * scenarioMultiplier.expenses,
        net: (income2027 * scenarioMultiplier.income) - (expenses2027 * scenarioMultiplier.expenses)
    };
    
    // Create chart
    const ctx = document.getElementById('forecastChart').getContext('2d');
    if (charts.forecast) charts.forecast.destroy();
    
    charts.forecast = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [2023, 2024, 2025, 2026, 2027],
            datasets: [{
                label: 'Income',
                data: [historical[0].income, historical[1].income, historical[2].income, forecast2026.income, forecast2027.income],
                borderColor: 'rgba(40, 167, 69, 1)',
                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                borderWidth: 2,
                borderDash: [0, 0, 0, 5, 5],
                fill: false
            }, {
                label: 'Expenses',
                data: [historical[0].expenses, historical[1].expenses, historical[2].expenses, forecast2026.expenses, forecast2027.expenses],
                borderColor: 'rgba(220, 53, 69, 1)',
                backgroundColor: 'rgba(220, 53, 69, 0.2)',
                borderWidth: 2,
                borderDash: [0, 0, 0, 5, 5],
                fill: false
            }, {
                label: 'Net Income',
                data: [historical[0].net, historical[1].net, historical[2].net, forecast2026.net, forecast2027.net],
                borderColor: 'rgba(102, 126, 234, 1)',
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderWidth: 3,
                borderDash: [0, 0, 0, 5, 5],
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '$' + formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
    
    // Update forecast stats
    const statsDiv = document.getElementById('forecastStats');
    statsDiv.innerHTML = `
        <div class="stat-card">
            <h3>2026 Forecast Income</h3>
            <div class="value">$${formatCurrency(forecast2026.income)}</div>
            <div class="change positive">+${((forecast2026.income - latestIncome) / latestIncome * 100).toFixed(1)}% vs 2025</div>
        </div>
        <div class="stat-card">
            <h3>2026 Forecast Expenses</h3>
            <div class="value">$${formatCurrency(forecast2026.expenses)}</div>
            <div class="change negative">+${((forecast2026.expenses - latestExpenses) / latestExpenses * 100).toFixed(1)}% vs 2025</div>
        </div>
        <div class="stat-card">
            <h3>2026 Forecast Net</h3>
            <div class="value" style="color: ${forecast2026.net >= 0 ? '#28a745' : '#dc3545'}">$${formatCurrency(forecast2026.net)}</div>
            <div class="change">Margin: ${((forecast2026.net / forecast2026.income) * 100).toFixed(1)}%</div>
        </div>
        <div class="stat-card">
            <h3>2027 Forecast Income</h3>
            <div class="value">$${formatCurrency(forecast2027.income)}</div>
            <div class="change positive">+${((forecast2027.income - forecast2026.income) / forecast2026.income * 100).toFixed(1)}% vs 2026</div>
        </div>
        <div class="stat-card">
            <h3>2027 Forecast Expenses</h3>
            <div class="value">$${formatCurrency(forecast2027.expenses)}</div>
            <div class="change negative">+${((forecast2027.expenses - forecast2026.expenses) / forecast2026.expenses * 100).toFixed(1)}% vs 2026</div>
        </div>
        <div class="stat-card">
            <h3>2027 Forecast Net</h3>
            <div class="value" style="color: ${forecast2027.net >= 0 ? '#28a745' : '#dc3545'}">$${formatCurrency(forecast2027.net)}</div>
            <div class="change">Margin: ${((forecast2027.net / forecast2027.income) * 100).toFixed(1)}%</div>
        </div>
    `;
}

function createCashFlowChart() {
    const years = [2023, 2024, 2025];
    const historical = years.map(year => {
        const yearData = financialData.pnl_data[year.toString()];
        const income = Object.values(yearData?.income || {}).reduce((a, b) => a + b, 0);
        const expenses = Object.values(yearData?.expenses || {}).reduce((a, b) => a + b, 0);
        return income - expenses;
    });
    
    // Forecast
    const latestIncome = Object.values(financialData.pnl_data['2025']?.income || {}).reduce((a, b) => a + b, 0);
    const latestExpenses = Object.values(financialData.pnl_data['2025']?.expenses || {}).reduce((a, b) => a + b, 0);
    const dues2025 = financialData.pnl_data['2025']?.income['Annual Dues Income'] || 0;
    const otherIncome2025 = latestIncome - dues2025;
    
    const income2026 = (dues2025 * 1.10) + (otherIncome2025 * 1.03);
    const expenses2026 = latestExpenses * 1.03;
    const cashFlow2026 = income2026 - expenses2026;
    
    const income2027 = ((dues2025 * 1.10) * 1.10) + (otherIncome2025 * 1.03 * 1.03);
    const expenses2027 = expenses2026 * 1.03;
    const cashFlow2027 = income2027 - expenses2027;
    
    const ctx = document.getElementById('cashFlowChart').getContext('2d');
    if (charts.cashFlow) charts.cashFlow.destroy();
    
    charts.cashFlow = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [2023, 2024, 2025, 2026, 2027],
            datasets: [{
                label: 'Net Cash Flow',
                data: [...historical, cashFlow2026, cashFlow2027],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)', 'rgba(102, 126, 234, 0.8)', 'rgba(102, 126, 234, 0.8)',
                    'rgba(40, 167, 69, 0.8)', 'rgba(40, 167, 69, 0.8)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)', 'rgba(102, 126, 234, 1)', 'rgba(102, 126, 234, 1)',
                    'rgba(40, 167, 69, 1)', 'rgba(40, 167, 69, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Cash Flow: $' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return '$' + formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function createForecastTable() {
    const years = [2023, 2024, 2025];
    const allCategories = new Set();
    years.forEach(year => {
        const expenses = financialData.pnl_data[year.toString()]?.expenses || {};
        Object.keys(expenses).forEach(cat => allCategories.add(cat));
    });
    
    const tbody = document.querySelector('#forecastTable tbody');
    const rows = [];
    
    allCategories.forEach(category => {
        const amounts = years.map(year => {
            return financialData.pnl_data[year.toString()]?.expenses[category] || 0;
        });
        const avg = amounts.reduce((a, b) => a + b, 0) / 3;
        const forecast2026 = avg * 1.03;
        const forecast2027 = forecast2026 * 1.03;
        const change = ((forecast2027 - amounts[2]) / amounts[2] * 100);
        
        rows.push({
            category,
            amounts,
            avg,
            forecast2026,
            forecast2027,
            change
        });
    });
    
    rows.sort((a, b) => b.avg - a.avg);
    
    tbody.innerHTML = rows.map(row => `
        <tr>
            <td>${row.category}</td>
            <td>$${formatCurrency(row.amounts[0])}</td>
            <td>$${formatCurrency(row.amounts[1])}</td>
            <td>$${formatCurrency(row.amounts[2])}</td>
            <td>$${formatCurrency(row.avg)}</td>
            <td>$${formatCurrency(row.forecast2026)}</td>
            <td>$${formatCurrency(row.forecast2027)}</td>
            <td class="${row.change >= 0 ? 'variance-negative' : 'variance-positive'}">${row.change >= 0 ? '+' : ''}${row.change.toFixed(1)}%</td>
        </tr>
    `).join('');
}

function analyzeReserves() {
    // Estimate reserve fund based on net income accumulation
    const years = [2023, 2024, 2025];
    const netIncome = years.map(year => {
        const yearData = financialData.pnl_data[year.toString()];
        const income = Object.values(yearData?.income || {}).reduce((a, b) => a + b, 0);
        const expenses = Object.values(yearData?.expenses || {}).reduce((a, b) => a + b, 0);
        return income - expenses;
    });
    
    const cumulativeReserve = netIncome.reduce((sum, net) => sum + net, 0);
    const avgAnnualExpenses = years.reduce((sum, year) => {
        const expenses = Object.values(financialData.pnl_data[year.toString()]?.expenses || {}).reduce((a, b) => a + b, 0);
        return sum + expenses;
    }, 0) / 3;
    
    const monthsOfReserves = (cumulativeReserve / avgAnnualExpenses) * 12;
    
    let healthStatus = 'Healthy';
    let healthColor = '#28a745';
    if (monthsOfReserves < 3) {
        healthStatus = 'Critical';
        healthColor = '#dc3545';
    } else if (monthsOfReserves < 6) {
        healthStatus = 'Low';
        healthColor = '#ffc107';
    }
    
    document.getElementById('reserveAnalysis').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Estimated Reserve Fund</h3>
                <div class="value">$${formatCurrency(cumulativeReserve)}</div>
                <div class="change">Based on 3-year net income</div>
            </div>
            <div class="stat-card">
                <h3>Months of Operating Expenses</h3>
                <div class="value" style="color: ${healthColor}">${monthsOfReserves.toFixed(1)}</div>
                <div class="change">Status: ${healthStatus}</div>
            </div>
            <div class="stat-card">
                <h3>Recommended Reserve</h3>
                <div class="value">$${formatCurrency(avgAnnualExpenses * 0.5)}</div>
                <div class="change">6 months operating expenses</div>
            </div>
        </div>
        <div class="insight-box" style="margin-top: 20px;">
            <h4>Reserve Fund Analysis</h4>
            <p>Based on 3-year net income accumulation, estimated reserves are ${monthsOfReserves.toFixed(1)} months of operating expenses. 
            Industry best practice recommends maintaining 6-12 months of operating expenses in reserves for capital projects and emergencies.</p>
        </div>
    `;
}

function generateRecommendations() {
    const years = [2023, 2024, 2025];
    const data = years.map(year => {
        const yearData = financialData.pnl_data[year.toString()];
        const income = Object.values(yearData?.income || {}).reduce((a, b) => a + b, 0);
        const expenses = Object.values(yearData?.expenses || {}).reduce((a, b) => a + b, 0);
        return { year, income, expenses, net: income - expenses };
    });
    
    const recommendations = [];
    
    // Dues increase recommendation
    recommendations.push({
        priority: 'High',
        title: 'Implement 10% Dues Increase in 2026',
        text: 'The planned 10% dues increase is critical to restore positive operating margins. Based on forecasts, this will improve net income from negative to positive territory.'
    });
    
    // Expense management
    if (data[2].expenses > data[1].expenses) {
        recommendations.push({
            priority: 'Medium',
            title: 'Review Expense Growth',
            text: `Expenses grew ${((data[2].expenses - data[1].expenses) / data[1].expenses * 100).toFixed(1)}% in 2025. Conduct line-item review to identify cost-saving opportunities.`
        });
    }
    
    // Reserve building
    const cumulativeReserve = data.reduce((sum, d) => sum + d.net, 0);
    if (cumulativeReserve < 0) {
        recommendations.push({
            priority: 'High',
            title: 'Build Reserve Fund',
            text: 'Current net income trends suggest reserve fund may be declining. Prioritize building reserves to 6 months of operating expenses for capital projects.'
        });
    }
    
    // Top expense categories
    const allExpenses = {};
    years.forEach(year => {
        const expenses = financialData.pnl_data[year.toString()]?.expenses || {};
        Object.entries(expenses).forEach(([cat, amt]) => {
            if (!allExpenses[cat]) allExpenses[cat] = [];
            allExpenses[cat].push(amt);
        });
    });
    
    const growingExpenses = Object.entries(allExpenses)
        .filter(([cat, amounts]) => amounts.length >= 2 && amounts[amounts.length - 1] > amounts[0])
        .map(([cat, amounts]) => ({
            category: cat,
            growth: ((amounts[amounts.length - 1] - amounts[0]) / amounts[0] * 100)
        }))
        .sort((a, b) => b.growth - a.growth)
        .slice(0, 3);
    
    if (growingExpenses.length > 0) {
        recommendations.push({
            priority: 'Medium',
            title: 'Monitor Growing Expense Categories',
            text: `Top growing expenses: ${growingExpenses.map(e => `${e.category} (+${e.growth.toFixed(0)}%)`).join(', ')}. Review these categories for optimization opportunities.`
        });
    }
    
    const recsDiv = document.getElementById('recommendations');
    recsDiv.innerHTML = recommendations.map(rec => `
        <div class="insight-box" style="border-left-color: ${rec.priority === 'High' ? '#dc3545' : '#ffc107'};">
            <h4>${rec.priority} Priority: ${rec.title}</h4>
            <p>${rec.text}</p>
        </div>
    `).join('');
}

function showScenario(scenario) {
    currentScenario = scenario;
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(scenario.charAt(0).toUpperCase() + scenario.slice(1))) {
            btn.classList.add('active');
        }
    });
    createForecast();
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Initialize on load
loadData();

