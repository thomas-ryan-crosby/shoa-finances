let financialData = null;
let charts = {};

async function initializeYearView(year) {
    try {
        const response = await fetch('data.json');
        financialData = await response.json();
        loadYearData(year);
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').innerHTML = 'Error loading data. Please ensure data.json exists.';
    }
}

function loadYearData(year) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    updateYearStats(year);
    createMonthlyChart(year);
    createExpensesChart(year);
    createVendorsChart(year);
    createExpensesTable(year);
}

function updateYearStats(year) {
    const statsContainer = document.getElementById('yearStats');
    const yearData = financialData.pnl_data[year.toString()];
    
    if (!yearData) {
        statsContainer.innerHTML = '<p>No data available for this year.</p>';
        return;
    }
    
    const totalIncome = Object.values(yearData.income || {}).reduce((a, b) => a + b, 0);
    const totalExpenses = Object.values(yearData.expenses || {}).reduce((a, b) => a + b, 0);
    const netIncome = totalIncome - totalExpenses;
    
    // Calculate previous year for comparison
    const prevYear = year - 1;
    let incomeChange = null;
    let expensesChange = null;
    
    if (financialData.pnl_data[prevYear.toString()]) {
        const prevIncome = Object.values(financialData.pnl_data[prevYear.toString()].income || {}).reduce((a, b) => a + b, 0);
        const prevExpenses = Object.values(financialData.pnl_data[prevYear.toString()].expenses || {}).reduce((a, b) => a + b, 0);
        
        if (prevIncome > 0) {
            incomeChange = ((totalIncome - prevIncome) / prevIncome * 100).toFixed(1);
        }
        if (prevExpenses > 0) {
            expensesChange = ((totalExpenses - prevExpenses) / prevExpenses * 100).toFixed(1);
        }
    }
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <h3>Total Income</h3>
            <div class="value">$${formatCurrency(totalIncome)}</div>
            ${incomeChange ? `<div class="change ${incomeChange >= 0 ? 'positive' : 'negative'}">${incomeChange >= 0 ? '+' : ''}${incomeChange}% vs ${prevYear}</div>` : ''}
        </div>
        <div class="stat-card">
            <h3>Total Expenses</h3>
            <div class="value">$${formatCurrency(totalExpenses)}</div>
            ${expensesChange ? `<div class="change ${expensesChange >= 0 ? 'negative' : 'positive'}">${expensesChange >= 0 ? '+' : ''}${expensesChange}% vs ${prevYear}</div>` : ''}
        </div>
        <div class="stat-card">
            <h3>Net Income</h3>
            <div class="value" style="color: ${netIncome >= 0 ? '#28a745' : '#dc3545'}">$${formatCurrency(netIncome)}</div>
        </div>
    `;
}

function createMonthlyChart(year) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = new Array(12).fill(0);
    
    financialData.transactions
        .filter(t => t.year === year && t.amount > 0)
        .forEach(t => {
            monthlyData[t.month - 1] += t.amount;
        });
    
    if (charts.monthly) {
        charts.monthly.destroy();
    }
    
    charts.monthly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: `${year} Monthly Spending`,
                data: monthlyData,
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
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

function createExpensesChart(year) {
    const ctx = document.getElementById('expensesChart').getContext('2d');
    
    const expenses = financialData.pnl_data[year.toString()]?.expenses || {};
    const expenseEntries = Object.entries(expenses)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
    
    if (charts.expenses) {
        charts.expenses.destroy();
    }
    
    charts.expenses = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: expenseEntries.map(e => e[0].substring(0, 30)),
            datasets: [{
                label: 'Expenses',
                data: expenseEntries.map(e => e[1]),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + formatCurrency(context.parsed.x);
                        }
                    }
                }
            },
            scales: {
                x: {
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

function createVendorsChart(year) {
    const ctx = document.getElementById('vendorsChart').getContext('2d');
    const tbody = document.querySelector('#vendorsTable tbody');
    
    // Aggregate by vendor for this year
    const vendorData = {};
    
    financialData.transactions
        .filter(t => t.year === year && t.amount > 0 && t.vendor && t.vendor !== 'Unknown')
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
    
    if (topVendors.length > 0) {
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
}

function createExpensesTable(year) {
    const tbody = document.querySelector('#expensesTable tbody');
    const expenses = financialData.pnl_data[year.toString()]?.expenses || {};
    
    const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
    
    const expenseEntries = Object.entries(expenses)
        .sort((a, b) => b[1] - a[1]);
    
    tbody.innerHTML = expenseEntries.map(([category, amount]) => {
        const percentage = ((amount / totalExpenses) * 100).toFixed(1);
        return `
            <tr>
                <td>${category}</td>
                <td>$${formatCurrency(amount)}</td>
                <td>${percentage}%</td>
            </tr>
        `;
    }).join('');
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

