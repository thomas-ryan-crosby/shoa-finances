let financialData = null;
let budget2026Data = null;
let specialProjectCounter = 0;

// Load data
async function loadData() {
    try {
        const response = await fetch('data.json');
        financialData = await response.json();
        
        const budgetResponse = await fetch('budget-2026-data.json');
        budget2026Data = await budgetResponse.json();
        
        initializeBudget();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').innerHTML = 'Error loading data. Please ensure data.json and budget-2026-data.json exist.';
    }
}

function initializeBudget() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    // Calculate reserve fund projections
    const end2024Reserve = 326672.14;
    const y2025Data = financialData.pnl_data['2025'];
    const y2025Income = Object.values(y2025Data?.income || {}).reduce((a, b) => a + b, 0);
    const y2025Expenses = Object.values(y2025Data?.expenses || {}).reduce((a, b) => a + b, 0);
    const y2025Net = y2025Income - y2025Expenses;
    const end2025Reserve = end2024Reserve + y2025Net;
    
    // Try to get 2026 projection from localStorage (set by 2026 budget page)
    // Otherwise estimate from 2026 budget data
    let end2026Reserve = null;
    try {
        const saved2026Reserve = localStorage.getItem('end2026ReserveFund');
        if (saved2026Reserve) {
            end2026Reserve = parseFloat(saved2026Reserve);
        }
    } catch (e) {
        // localStorage not available, fall back to calculation
    }
    
    if (!end2026Reserve) {
        // Estimate 2026 net income (from 2026 budget)
        const y2026Income = Object.values(budget2026Data.income || {}).reduce((a, b) => a + b, 0);
        let y2026Expenses = 0;
        Object.values(budget2026Data.expenses || {}).forEach(category => {
            Object.values(category || {}).forEach(amount => {
                y2026Expenses += amount;
            });
        });
        const y2026Net = y2026Income - y2026Expenses;
        end2026Reserve = end2025Reserve + y2026Net;
    }
    
    // Update initial reserve fund display
    const y2026ReserveEl = document.getElementById('y2026ReserveFund');
    if (y2026ReserveEl) {
        y2026ReserveEl.textContent = '$' + formatCurrency(end2026Reserve);
    }
    
    // Initialize storm fund display
    const stormFundDisplayEl = document.getElementById('stormFundDisplay');
    const spendableReserveEl = document.getElementById('spendableReserve');
    const stormFundAmount = 375000;
    if (stormFundDisplayEl) stormFundDisplayEl.textContent = '$' + formatCurrency(stormFundAmount);
    if (spendableReserveEl) spendableReserveEl.textContent = '$' + formatCurrency(end2026Reserve - stormFundAmount);
    
    // Initialize 2027 budget with 2026 data + 10% dues increase
    initialize2027Budget();
    
    // Initial summary update
    updateBudgetSummary();
}

function initialize2027Budget() {
    // Start with 2026 budget and apply 10% dues increase
    const dues2026 = budget2026Data.income['Annual Dues Income'] || 0;
    const otherIncome2026 = Object.entries(budget2026Data.income || {})
        .filter(([name]) => name !== 'Annual Dues Income')
        .reduce((sum, [, amount]) => sum + amount, 0);
    
    // 2027: 10% dues increase, 3% other income growth, 3% expense inflation
    const budget2027 = {
        income: {
            'Annual Dues Income': dues2026 * 1.10,
            'Clubhouse Rental': (budget2026Data.income['Clubhouse Rental'] || 0) * 1.03,
            'Entry Card Fees': (budget2026Data.income['Entry Card Fees'] || 0) * 1.03,
            'Interest Income': (budget2026Data.income['Interest Income'] || 0) * 1.03,
            'Late Fees': budget2026Data.income['Late Fees'] || 0,
            'Misc. Income': budget2026Data.income['Misc. Income'] || 0
        },
        expenses: {}
    };
    
    // Apply 3% inflation to expenses
    Object.keys(budget2026Data.expenses || {}).forEach(category => {
        budget2027.expenses[category] = {};
        Object.entries(budget2026Data.expenses[category] || {}).forEach(([name, amount]) => {
            budget2027.expenses[category][name] = amount * 1.03;
        });
    });
    
    // Load income items
    loadIncomeItems(budget2027.income);
    
    // Load expense items by category
    loadExpenseItems('Operating Expenses', 'operatingExpenses', budget2027.expenses);
    loadExpenseItems('Amenities Maintenance', 'amenitiesMaintenance', budget2027.expenses);
    loadExpenseItems('Clubhouse Maintenance', 'clubhouseMaintenance', budget2027.expenses);
    loadExpenseItems('Common Area Maintenance', 'commonAreaMaintenance', budget2027.expenses);
    loadExpenseItems('Grounds & Landscape Maintenance', 'groundsMaintenance', budget2027.expenses);
    loadExpenseItems('Security', 'security', budget2027.expenses);
    loadExpenseItems('Streets & Drainage', 'streetsDrainage', budget2027.expenses);
    loadExpenseItems('Taxes', 'taxes', budget2027.expenses);
    loadExpenseItems('Utilities', 'utilities', budget2027.expenses);
    loadExpenseItems('Special Projects', 'specialProjects', budget2027.expenses);
}

function loadIncomeItems(incomeData) {
    const container = document.getElementById('incomeItems');
    const items = incomeData || {};
    
    container.innerHTML = Object.entries(items).map(([name, amount]) => `
        <div class="budget-line-item">
            <div class="label">${name}</div>
            <div class="amount">
                <input type="number" 
                       id="income_${name.replace(/[^a-zA-Z0-9]/g, '_')}" 
                       value="${Math.round(amount)}" 
                       step="100"
                       onchange="updateBudgetSummary()">
            </div>
            <div></div>
        </div>
    `).join('');
}

function loadExpenseItems(category, containerId, expensesData) {
    const container = document.getElementById(containerId);
    const items = expensesData[category] || {};
    
    container.innerHTML = Object.entries(items).map(([name, amount]) => `
        <div class="budget-line-item">
            <div class="label">${name}</div>
            <div class="amount">
                <input type="number" 
                       id="expense_${category.replace(/[^a-zA-Z0-9]/g, '_')}_${name.replace(/[^a-zA-Z0-9]/g, '_')}" 
                       value="${Math.round(amount)}" 
                       step="100"
                       onchange="updateBudgetSummary()">
            </div>
            <div></div>
        </div>
    `).join('');
}

function addSpecialProject() {
    const container = document.getElementById('specialProjects');
    const newId = `special_${specialProjectCounter++}`;
    
    const newItem = document.createElement('div');
    newItem.className = 'budget-line-item';
    newItem.innerHTML = `
        <div class="label">
            <input type="text" 
                   id="${newId}_name" 
                   placeholder="Project Name" 
                   style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
        </div>
        <div class="amount">
            <input type="number" 
                   id="${newId}_amount" 
                   value="0" 
                   step="100"
                   onchange="updateBudgetSummary()">
        </div>
        <div>
            <button class="delete-item-btn" onclick="removeSpecialProject(this)">Delete</button>
        </div>
    `;
    
    container.appendChild(newItem);
}

function removeSpecialProject(button) {
    button.closest('.budget-line-item').remove();
    updateBudgetSummary();
}

function updateBudgetSummary() {
    // Calculate total income
    let totalIncome = 0;
    const incomeInputs = document.querySelectorAll('#incomeItems input[type="number"]');
    incomeInputs.forEach(input => {
        totalIncome += parseFloat(input.value) || 0;
    });
    
    // Calculate total expenses
    let totalExpenses = 0;
    const expenseInputs = document.querySelectorAll('#operatingExpenses, #amenitiesMaintenance, #clubhouseMaintenance, #commonAreaMaintenance, #groundsMaintenance, #security, #streetsDrainage, #taxes, #utilities').forEach(container => {
        container.querySelectorAll('input[type="number"]').forEach(input => {
            totalExpenses += parseFloat(input.value) || 0;
        });
    });
    
    // Add special projects
    const specialProjects = document.querySelectorAll('#specialProjects .budget-line-item');
    specialProjects.forEach(item => {
        const amountInput = item.querySelector('input[type="number"]');
        if (amountInput) {
            totalExpenses += parseFloat(amountInput.value) || 0;
        }
    });
    
    const netIncome = totalIncome - totalExpenses;
    const margin = totalIncome > 0 ? (netIncome / totalIncome * 100) : 0;
    
    // Update income summary
    document.getElementById('incomeSummary').innerHTML = `
        <div class="summary-row">
            <span>Total Income</span>
            <span>$${formatCurrency(totalIncome)}</span>
        </div>
    `;
    
    // Update expense summary
    document.getElementById('expenseSummary').innerHTML = `
        <div class="summary-row">
            <span>Total Expenses</span>
            <span>$${formatCurrency(totalExpenses)}</span>
        </div>
    `;
    
    // Update net income summary
    document.getElementById('netIncomeSummary').innerHTML = `
        <div class="summary-row">
            <span>Projected Net Income</span>
            <span style="color: ${netIncome >= 0 ? '#28a745' : '#dc3545'}; font-size: 1.2em;">$${formatCurrency(netIncome)}</span>
        </div>
        <div class="summary-row">
            <span>Operating Margin</span>
            <span style="color: ${margin >= 0 ? '#28a745' : '#dc3545'}">${margin.toFixed(2)}%</span>
        </div>
    `;
    
    // Update reserve fund projection
    updateReserveProjection(totalIncome, totalExpenses);
}

function updateReserveProjection(totalIncome, totalExpenses) {
    const end2024Reserve = 326672.14;
    const y2025Data = financialData.pnl_data['2025'];
    const y2025Income = Object.values(y2025Data?.income || {}).reduce((a, b) => a + b, 0);
    const y2025Expenses = Object.values(y2025Data?.expenses || {}).reduce((a, b) => a + b, 0);
    const y2025Net = y2025Income - y2025Expenses;
    const end2025Reserve = end2024Reserve + y2025Net;
    
    // Try to get 2026 projection from localStorage
    let end2026Reserve = null;
    try {
        const saved2026Reserve = localStorage.getItem('end2026ReserveFund');
        if (saved2026Reserve) {
            end2026Reserve = parseFloat(saved2026Reserve);
        }
    } catch (e) {
        // localStorage not available
    }
    
    if (!end2026Reserve) {
        // Estimate from 2026 budget data
        const y2026Income = Object.values(budget2026Data.income || {}).reduce((a, b) => a + b, 0);
        let y2026Expenses = 0;
        Object.values(budget2026Data.expenses || {}).forEach(category => {
            Object.values(category || {}).forEach(amount => {
                y2026Expenses += amount;
            });
        });
        const y2026Net = y2026Income - y2026Expenses;
        end2026Reserve = end2025Reserve + y2026Net;
    }
    
    // Update reserve fund allocation displays
    const stormFundInput = document.getElementById('stormFundAmount');
    const stormFundAmount = parseFloat(stormFundInput?.value) || 375000;
    const spendableReserve = end2026Reserve - stormFundAmount;
    
    const y2026ReserveEl = document.getElementById('y2026ReserveFund');
    const stormFundDisplayEl = document.getElementById('stormFundDisplay');
    const spendableReserveEl = document.getElementById('spendableReserve');
    
    if (y2026ReserveEl) y2026ReserveEl.textContent = '$' + formatCurrency(end2026Reserve);
    if (stormFundDisplayEl) stormFundDisplayEl.textContent = '$' + formatCurrency(stormFundAmount);
    if (spendableReserveEl) spendableReserveEl.textContent = '$' + formatCurrency(spendableReserve);
    
    // Update end of year projection
    const projectedNet2027 = totalIncome - totalExpenses;
    const end2027Reserve = end2026Reserve + projectedNet2027;
    
    const startingReserveEl = document.getElementById('startingReserve2027');
    const projectedNetEl = document.getElementById('projectedNet2027');
    const end2027ReserveEl = document.getElementById('end2027ReserveFund');
    
    if (startingReserveEl) startingReserveEl.textContent = '$' + formatCurrency(end2026Reserve);
    if (projectedNetEl) projectedNetEl.textContent = '$' + formatCurrency(projectedNet2027);
    if (end2027ReserveEl) end2027ReserveEl.textContent = '$' + formatCurrency(end2027Reserve);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Initialize on load
loadData();

