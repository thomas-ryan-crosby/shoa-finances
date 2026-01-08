let financialData = null;
let currentYearFilter = 'all';
let charts = {};

// Load data
async function loadData() {
    try {
        const response = await fetch('data.json');
        financialData = await response.json();
        initializeApp();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').innerHTML = 'Error loading data. Please ensure data.json exists.';
    }
}

function initializeApp() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    updateYearStats();
    createMonthlyChart();
    createTrendsChart();
    initializeBudgetPlanning();
}

function updateYearStats() {
    const statsContainer = document.getElementById('yearStats');
    const years = [2023, 2024, 2025];
    const stats = [];
    
    years.forEach(year => {
        const yearData = financialData.pnl_data[year.toString()];
        if (yearData) {
            const totalIncome = Object.values(yearData.income || {}).reduce((a, b) => a + b, 0);
            const totalExpenses = Object.values(yearData.expenses || {}).reduce((a, b) => a + b, 0);
            const netIncome = totalIncome - totalExpenses;
            
            stats.push({
                year,
                income: totalIncome,
                expenses: totalExpenses,
                net: netIncome
            });
        }
    });
    
    // Calculate changes
    stats.forEach((stat, idx) => {
        if (idx > 0) {
            stat.incomeChange = ((stat.income - stats[idx-1].income) / stats[idx-1].income * 100).toFixed(1);
            stat.expensesChange = ((stat.expenses - stats[idx-1].expenses) / stats[idx-1].expenses * 100).toFixed(1);
        }
    });
    
    statsContainer.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <h3>${stat.year} Total Income</h3>
            <div class="value">$${formatCurrency(stat.income)}</div>
            ${stat.incomeChange ? `<div class="change ${stat.incomeChange >= 0 ? 'positive' : 'negative'}">${stat.incomeChange >= 0 ? '+' : ''}${stat.incomeChange}%</div>` : ''}
        </div>
        <div class="stat-card">
            <h3>${stat.year} Total Expenses</h3>
            <div class="value">$${formatCurrency(stat.expenses)}</div>
            ${stat.expensesChange ? `<div class="change ${stat.expensesChange >= 0 ? 'negative' : 'positive'}">${stat.expensesChange >= 0 ? '+' : ''}${stat.expensesChange}%</div>` : ''}
        </div>
        <div class="stat-card">
            <h3>${stat.year} Net Income</h3>
            <div class="value" style="color: ${stat.net >= 0 ? '#28a745' : '#dc3545'}">$${formatCurrency(stat.net)}</div>
        </div>
    `).join('');
}

function createMonthlyChart() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = [2023, 2024, 2025];
    
    // Get all P&L expense categories across all years
    const allCategories = new Set();
    years.forEach(year => {
        const expenses = financialData.pnl_data[year.toString()]?.expenses || {};
        Object.keys(expenses).forEach(cat => allCategories.add(cat));
    });
    
    // Get top categories by total across all years
    const categoryTotals = {};
    allCategories.forEach(cat => {
        categoryTotals[cat] = years.reduce((sum, year) => {
            return sum + (financialData.pnl_data[year.toString()]?.expenses[cat] || 0);
        }, 0);
    });
    
    const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(e => e[0]);
    
    // Mapping function (same as year-view.js)
    function mapToPnlCategory(text) {
        const textLower = (text || '').toLowerCase();
        
        for (const pnlCat of topCategories) {
            const pnlCatLower = pnlCat.toLowerCase();
            if (textLower.includes(pnlCatLower) || pnlCatLower.includes(textLower)) {
                return pnlCat;
            }
        }
        
        const keywordMap = {
            'guard': 'Guard Service',
            'insurance': 'Insurance',
            'legal': 'Legal Fees',
            'lifeguard': 'Lifeguards',
            'management': 'Management Expenses',
            'office': 'Office Supplies',
            'police': 'Police Detail',
            'social': 'Social Functions',
            'website': 'Website',
            'accounting': 'Accounting & Software',
            'bank': 'Bank Service Charges',
            'janitorial': 'Janitorial Expenses',
            'pool': 'Swimming Pool',
            'landscap': 'Grass Cutting & Landscaping',
            'tree': 'Tree Removal',
            'gate': 'Gate Maintenance & Repair',
            'electric': 'Electric',
            'water': 'Water',
            'telephone': 'Telephone',
            'gas': 'Gas'
        };
        
        for (const [keyword, category] of Object.entries(keywordMap)) {
            if (textLower.includes(keyword) && topCategories.includes(category)) {
                return category;
            }
        }
        
        return null;
    }
    
    // Create datasets for each year with category breakdown
    const datasets = [];
    const yearColors = [
        ['rgba(102, 126, 234, 0.8)', 'rgba(102, 126, 234, 0.5)'],
        ['rgba(118, 75, 162, 0.8)', 'rgba(118, 75, 162, 0.5)'],
        ['rgba(255, 159, 64, 0.8)', 'rgba(255, 159, 64, 0.5)']
    ];
    
    years.forEach((year, yearIdx) => {
        // Aggregate by month and category for this year
        const monthlyByCategory = {};
        topCategories.forEach(cat => {
            monthlyByCategory[cat] = new Array(12).fill(0);
        });
        
        financialData.transactions
            .filter(t => t.year === year && t.amount > 0)
            .forEach(t => {
                let matchedCategory = mapToPnlCategory(t.category);
                if (!matchedCategory && t.vendor) matchedCategory = mapToPnlCategory(t.vendor);
                if (!matchedCategory && t.memo) matchedCategory = mapToPnlCategory(t.memo);
                
                if (matchedCategory && monthlyByCategory[matchedCategory]) {
                    monthlyByCategory[matchedCategory][t.month - 1] += t.amount;
                }
            });
        
        // Create a dataset for each category for this year
        topCategories.forEach((category, catIdx) => {
            const total = monthlyByCategory[category].reduce((a, b) => a + b, 0);
            if (total > 0) {
                datasets.push({
                    label: `${year} - ${category.substring(0, 20)}`,
                    data: monthlyByCategory[category],
                    backgroundColor: yearColors[yearIdx][0],
                    borderColor: yearColors[yearIdx][1],
                    borderWidth: 1,
                    stack: year.toString()
                });
            }
        });
    });
    
    if (charts.monthly) {
        charts.monthly.destroy();
    }
    
    charts.monthly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 5,
                        font: {
                            size: 10
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + formatCurrency(context.parsed.y);
                        },
                        footer: function(tooltipItems) {
                            let total = 0;
                            tooltipItems.forEach(item => {
                                total += item.parsed.y;
                            });
                            return 'Total: $' + formatCurrency(total);
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
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

function createExpensesChart() {
    const ctx = document.getElementById('expensesChart').getContext('2d');
    
    // Aggregate expenses by category from P&L data across all years
    const categoryTotals = {};
    
    [2023, 2024, 2025].forEach(year => {
        const expenses = financialData.pnl_data[year.toString()]?.expenses || {};
        Object.entries(expenses).forEach(([category, amount]) => {
            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }
            categoryTotals[category] += amount;
        });
    });
    
    // Get top 15 categories
    const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
    
    if (charts.expenses) {
        charts.expenses.destroy();
    }
    
    charts.expenses = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topCategories.map(c => c[0].substring(0, 30)),
            datasets: [{
                label: 'Total Expenses',
                data: topCategories.map(c => c[1]),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + formatCurrency(context.parsed.y);
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

function createVendorsChart() {
    const ctx = document.getElementById('vendorsChart').getContext('2d');
    const tbody = document.querySelector('#vendorsTable tbody');
    
    // Aggregate by vendor
    const vendorData = {};
    
    financialData.transactions
        .filter(t => t.amount > 0 && t.vendor && t.vendor !== 'Unknown')
        .forEach(t => {
            if (!vendorData[t.vendor]) {
                vendorData[t.vendor] = {
                    total: 0,
                    count: 0
                };
            }
            vendorData[t.vendor].total += t.amount;
            vendorData[t.vendor].count += 1;
        });
    
    // Get top 10 vendors
    const topVendors = Object.entries(vendorData)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10);
    
    // Update table
    tbody.innerHTML = topVendors.map(([vendor, data]) => `
        <tr>
            <td>${vendor}</td>
            <td>$${formatCurrency(data.total)}</td>
            <td>${data.count}</td>
            <td>$${formatCurrency(data.total / data.count)}</td>
        </tr>
    `).join('');
    
    if (charts.vendors) {
        charts.vendors.destroy();
    }
    
    charts.vendors = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: topVendors.map(v => v[0].substring(0, 25)),
            datasets: [{
                data: topVendors.map(v => v[1].total),
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(201, 203, 207, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return label + ': $' + formatCurrency(value) + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

function createTrendsChart() {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    
    // Get all unique expense categories from P&L data
    const allCategories = new Set();
    [2023, 2024, 2025].forEach(year => {
        const expenses = financialData.pnl_data[year.toString()]?.expenses || {};
        Object.keys(expenses).forEach(cat => allCategories.add(cat));
    });
    
    // Get top categories by total across all years
    const categoryTotals = {};
    allCategories.forEach(cat => {
        categoryTotals[cat] = [2023, 2024, 2025].reduce((sum, year) => {
            return sum + (financialData.pnl_data[year.toString()]?.expenses[cat] || 0);
        }, 0);
    });
    
    const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(c => c[0]);
    
    const datasets = topCategories.map((category, idx) => {
        const data = [2023, 2024, 2025].map(year => {
            return financialData.pnl_data[year.toString()]?.expenses[category] || 0;
        });
        
        const colors = [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)'
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
    
    if (charts.trends) {
        charts.trends.destroy();
    }
    
    charts.trends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['2023', '2024', '2025'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
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

function initializeBudgetPlanning() {
    const container = document.getElementById('budgetInputs');
    
    // Get all unique categories from P&L data
    const allCategories = new Set();
    [2023, 2024, 2025].forEach(year => {
        const expenses = financialData.pnl_data[year.toString()]?.expenses || {};
        Object.keys(expenses).forEach(cat => allCategories.add(cat));
    });
    
    // Calculate 3-year average and 2025 actual for each category
    const budgetData = Array.from(allCategories).map(category => {
        const values = [2023, 2024, 2025].map(year => {
            return financialData.pnl_data[year.toString()]?.expenses[category] || 0;
        });
        const avg = values.reduce((a, b) => a + b, 0) / 3;
        const y2025 = values[2];
        
        return {
            category,
            avg,
            y2025,
            suggested: Math.round(avg * 1.03) // 3% increase
        };
    }).sort((a, b) => b.avg - a.avg);
    
    container.innerHTML = budgetData.map(item => `
        <div class="budget-input">
            <div>
                <strong>${item.category}</strong><br>
                <small style="color: rgba(255,255,255,0.8);">
                    3-Yr Avg: $${formatCurrency(item.avg)} | 2025: $${formatCurrency(item.y2025)}
                </small>
            </div>
            <input type="number" 
                   id="budget_${item.category.replace(/[^a-zA-Z0-9]/g, '_')}" 
                   value="${item.suggested}" 
                   step="100"
                   onchange="updateBudgetSummary()">
            <button onclick="setSuggested('${item.category.replace(/[^a-zA-Z0-9]/g, '_')}', ${item.suggested})">Use Suggested</button>
        </div>
    `).join('');
    
    updateBudgetSummary();
}

function setSuggested(id, value) {
    document.getElementById('budget_' + id).value = value;
    updateBudgetSummary();
}

function updateBudgetSummary() {
    const allCategories = new Set();
    [2023, 2024, 2025].forEach(year => {
        const expenses = financialData.pnl_data[year.toString()]?.expenses || {};
        Object.keys(expenses).forEach(cat => allCategories.add(cat));
    });
    
    let totalBudget = 0;
    allCategories.forEach(category => {
        const input = document.getElementById('budget_' + category.replace(/[^a-zA-Z0-9]/g, '_'));
        if (input) {
            totalBudget += parseFloat(input.value) || 0;
        }
    });
    
    const y2025Total = Object.values(financialData.pnl_data['2025']?.expenses || {}).reduce((a, b) => a + b, 0);
    const threeYearAvg = [2023, 2024, 2025].reduce((sum, year) => {
        return sum + Object.values(financialData.pnl_data[year.toString()]?.expenses || {}).reduce((a, b) => a + b, 0);
    }, 0) / 3;
    
    document.getElementById('totalBudget').textContent = '$' + formatCurrency(totalBudget);
    document.getElementById('budgetVs2025').textContent = '$' + formatCurrency(totalBudget - y2025Total);
    document.getElementById('threeYearAvg').textContent = '$' + formatCurrency(threeYearAvg);
}

function showYear(year) {
    currentYearFilter = year;
    
    // Update button states
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.classList.remove('active');
        if ((year === 'all' && btn.textContent === 'All Years') ||
            (year !== 'all' && btn.textContent === year.toString())) {
            btn.classList.add('active');
        }
    });
    
    // Recreate charts with filter
    // For now, we'll show all years in most charts, but you can filter if needed
    createMonthlyChart();
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Initialize on load
loadData();

