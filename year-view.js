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
    
    // Get P&L expense categories for this year
    const pnlExpenses = financialData.pnl_data[year.toString()]?.expenses || {};
    const expenseCategories = Object.keys(pnlExpenses);
    
    // Get top categories by total amount
    const topCategories = Object.entries(pnlExpenses)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12) // Top 12 categories to avoid too many colors
        .map(e => e[0]);
    
    // Create a mapping function to match transaction categories to P&L categories
    function mapToPnlCategory(transactionCategory) {
        const transCatLower = (transactionCategory || '').toLowerCase();
        
        // Try to find a matching P&L category
        for (const pnlCat of topCategories) {
            const pnlCatLower = pnlCat.toLowerCase();
            // Check if transaction category contains P&L category or vice versa
            if (transCatLower.includes(pnlCatLower) || pnlCatLower.includes(transCatLower)) {
                return pnlCat;
            }
        }
        
        // Try fuzzy matching with common keywords
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
            if (transCatLower.includes(keyword) && topCategories.includes(category)) {
                return category;
            }
        }
        
        return null; // Will be categorized as "Other"
    }
    
    // Aggregate transactions by month and category
    const monthlyByCategory = {};
    topCategories.forEach(cat => {
        monthlyByCategory[cat] = new Array(12).fill(0);
    });
    monthlyByCategory['Other'] = new Array(12).fill(0);
    
    // Store transaction details for tooltip
    const monthlyTransactions = {};
    for (let i = 0; i < 12; i++) {
        monthlyTransactions[i] = [];
    }
    
    financialData.transactions
        .filter(t => t.year === year && t.amount > 0)
        .forEach(t => {
            // Try to match using category, vendor, or memo
            let matchedCategory = mapToPnlCategory(t.category);
            if (!matchedCategory && t.vendor) {
                matchedCategory = mapToPnlCategory(t.vendor);
            }
            if (!matchedCategory && t.memo) {
                matchedCategory = mapToPnlCategory(t.memo);
            }
            
            const category = matchedCategory || 'Other';
            if (monthlyByCategory[category]) {
                monthlyByCategory[category][t.month - 1] += t.amount;
            } else {
                monthlyByCategory['Other'][t.month - 1] += t.amount;
            }
            
            // Store transaction for tooltip
            monthlyTransactions[t.month - 1].push({
                category: category,
                amount: t.amount,
                date: t.date,
                vendor: t.vendor,
                memo: t.memo
            });
        });
    
    // Generate color palette
    const colorPalette = [
        'rgba(102, 126, 234, 0.8)',   // Blue
        'rgba(118, 75, 162, 0.8)',    // Purple
        'rgba(255, 159, 64, 0.8)',    // Orange
        'rgba(75, 192, 192, 0.8)',    // Teal
        'rgba(153, 102, 255, 0.8)',   // Light Purple
        'rgba(255, 99, 132, 0.8)',    // Pink
        'rgba(54, 162, 235, 0.8)',    // Light Blue
        'rgba(255, 206, 86, 0.8)',    // Yellow
        'rgba(201, 203, 207, 0.8)',   // Gray
        'rgba(255, 159, 64, 0.8)',    // Orange
        'rgba(75, 192, 192, 0.8)',    // Teal
        'rgba(153, 102, 255, 0.8)',   // Light Purple
        'rgba(128, 128, 128, 0.8)'    // Gray for Other
    ];
    
    // Create datasets for each category
    const datasets = [];
    let colorIndex = 0;
    
    // Add top categories first
    topCategories.forEach(category => {
        if (monthlyByCategory[category]) {
            const total = monthlyByCategory[category].reduce((a, b) => a + b, 0);
            if (total > 0) { // Only add if there's data
                datasets.push({
                    label: category.substring(0, 30),
                    data: monthlyByCategory[category],
                    backgroundColor: colorPalette[colorIndex % colorPalette.length],
                    borderColor: colorPalette[colorIndex % colorPalette.length].replace('0.8', '1'),
                    borderWidth: 1
                });
                colorIndex++;
            }
        }
    });
    
    // Add "Other" category if it has data
    const otherTotal = monthlyByCategory['Other']?.reduce((a, b) => a + b, 0) || 0;
    if (otherTotal > 0) {
        datasets.push({
            label: 'Other',
            data: monthlyByCategory['Other'],
            backgroundColor: 'rgba(128, 128, 128, 0.8)',
            borderColor: 'rgba(128, 128, 128, 1)',
            borderWidth: 1
        });
    }
    
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
                        padding: 8,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            // Don't show individual labels, we'll show top 5 in footer
                            return '';
                        },
                        footer: function(tooltipItems) {
                            if (tooltipItems.length === 0) return '';
                            
                            const monthIndex = tooltipItems[0].dataIndex;
                            const transactions = monthlyTransactions[monthIndex] || [];
                            
                            // Aggregate by category for this month
                            const categoryTotals = {};
                            transactions.forEach(t => {
                                if (!categoryTotals[t.category]) {
                                    categoryTotals[t.category] = 0;
                                }
                                categoryTotals[t.category] += t.amount;
                            });
                            
                            // Get top 5 categories for this month
                            const top5 = Object.entries(categoryTotals)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5);
                            
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            let footer = [`${monthNames[monthIndex]} - Top 5 Categories:`];
                            
                            top5.forEach(([category, amount], idx) => {
                                footer.push(`${idx + 1}. ${category}: $${formatCurrency(amount)}`);
                            });
                            
                            const total = top5.reduce((sum, [, amount]) => sum + amount, 0);
                            footer.push(`Total: $${formatCurrency(total)}`);
                            
                            return footer;
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
    
    // Map transactions to categories
    function mapToPnlCategory(text) {
        const textLower = (text || '').toLowerCase();
        const allCategories = Object.keys(expenses);
        
        for (const pnlCat of allCategories) {
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
            if (textLower.includes(keyword) && allCategories.includes(category)) {
                return category;
            }
        }
        
        return null;
    }
    
    // Group transactions by category
    const transactionsByCategory = {};
    Object.keys(expenses).forEach(cat => {
        transactionsByCategory[cat] = [];
    });
    
    financialData.transactions
        .filter(t => t.year === year && t.amount > 0)
        .forEach(t => {
            let matchedCategory = mapToPnlCategory(t.category);
            if (!matchedCategory && t.vendor) matchedCategory = mapToPnlCategory(t.vendor);
            if (!matchedCategory && t.memo) matchedCategory = mapToPnlCategory(t.memo);
            
            if (matchedCategory && transactionsByCategory[matchedCategory]) {
                transactionsByCategory[matchedCategory].push({
                    date: t.date,
                    vendor: t.vendor || 'Unknown',
                    memo: t.memo || '---',
                    amount: t.amount
                });
            }
        });
    
    // Sort transactions by date within each category
    Object.keys(transactionsByCategory).forEach(cat => {
        transactionsByCategory[cat].sort((a, b) => new Date(a.date) - new Date(b.date));
    });
    
    const expenseEntries = Object.entries(expenses)
        .sort((a, b) => b[1] - a[1]);
    
    tbody.innerHTML = expenseEntries.map(([category, amount], index) => {
        const percentage = ((amount / totalExpenses) * 100).toFixed(1);
        const transactions = transactionsByCategory[category] || [];
        const hasTransactions = transactions.length > 0;
        
        const transactionRows = hasTransactions ? `
            <tr class="transaction-detail" data-category-index="${index}" style="display: none;">
                <td colspan="3" style="padding: 0; background: #f8f9fa;">
                    <div style="padding: 15px;">
                        <table style="width: 100%; background: white; border-radius: 5px; overflow: hidden;">
                            <thead>
                                <tr style="background: #e9ecef;">
                                    <th style="padding: 10px; font-size: 0.85em; text-align: left; font-weight: 600;">Date</th>
                                    <th style="padding: 10px; font-size: 0.85em; text-align: left; font-weight: 600;">Vendor</th>
                                    <th style="padding: 10px; font-size: 0.85em; text-align: left; font-weight: 600;">Memo</th>
                                    <th style="padding: 10px; font-size: 0.85em; text-align: right; font-weight: 600;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${transactions.map(t => `
                                    <tr>
                                        <td style="padding: 10px; font-size: 0.9em; color: #666; border-bottom: 1px solid #eee;">
                                            ${new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td style="padding: 10px; font-size: 0.9em; color: #666; border-bottom: 1px solid #eee;">${t.vendor}</td>
                                        <td style="padding: 10px; font-size: 0.9em; color: #666; border-bottom: 1px solid #eee;">${t.memo}</td>
                                        <td style="padding: 10px; font-size: 0.9em; color: #666; font-weight: bold; text-align: right; border-bottom: 1px solid #eee;">$${formatCurrency(t.amount)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </td>
            </tr>
        ` : '';
        
        return `
            <tr class="category-row" data-index="${index}" style="cursor: pointer;">
                <td>
                    <span class="expand-icon" style="margin-right: 10px; display: inline-block; width: 15px;">${hasTransactions ? '▶' : ''}</span>
                    ${category}
                </td>
                <td>$${formatCurrency(amount)}</td>
                <td>${percentage}%</td>
            </tr>
            ${transactionRows}
        `;
    }).join('');
    
    // Add click handlers
    tbody.querySelectorAll('.category-row').forEach(row => {
        row.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const detailRow = tbody.querySelector(`.transaction-detail[data-category-index="${index}"]`);
            const icon = this.querySelector('.expand-icon');
            
            if (detailRow) {
                const isHidden = detailRow.style.display === 'none' || detailRow.style.display === '';
                detailRow.style.display = isHidden ? 'table-row' : 'none';
                
                if (icon) {
                    icon.textContent = isHidden ? '▼' : '▶';
                }
            }
        });
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

