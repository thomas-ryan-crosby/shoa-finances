let financialData = null;
let budgetData = null;
let specialProjectCounter = 0;

// Load data
async function loadData() {
    try {
        const response = await fetch('data.json');
        financialData = await response.json();
        
        const budgetResponse = await fetch('budget-2026-data.json');
        budgetData = await budgetResponse.json();
        
        initializeBudget();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').innerHTML = 'Error loading data. Please ensure data.json and budget-2026-data.json exist.';
    }
}

function initializeBudget() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    // Calculate 2025 net income
    const end2024Reserve = 326672.14;
    const y2025Data = financialData.pnl_data['2025'];
    const y2025Income = Object.values(y2025Data?.income || {}).reduce((a, b) => a + b, 0);
    const y2025Expenses = Object.values(y2025Data?.expenses || {}).reduce((a, b) => a + b, 0);
    const y2025Net = y2025Income - y2025Expenses;
    const end2025Reserve = end2024Reserve + y2025Net;
    
    document.getElementById('y2025NetIncome').textContent = '$' + formatCurrency(y2025Net);
    document.getElementById('y2025ReserveFund').textContent = '$' + formatCurrency(end2025Reserve);
    
    // Load income items
    loadIncomeItems();
    
    // Load expense items by category
    loadExpenseItems('Operating Expenses', 'operatingExpenses');
    loadExpenseItems('Amenities Maintenance', 'amenitiesMaintenance');
    loadExpenseItems('Clubhouse Maintenance', 'clubhouseMaintenance');
    loadExpenseItems('Common Area Maintenance', 'commonAreaMaintenance');
    loadExpenseItems('Grounds & Landscape Maintenance', 'groundsMaintenance');
    loadExpenseItems('Security', 'security');
    loadExpenseItems('Streets & Drainage', 'streetsDrainage');
    loadExpenseItems('Taxes', 'taxes');
    loadExpenseItems('Utilities', 'utilities');
    loadExpenseItems('Special Projects', 'specialProjects');
    
    // Initial summary update
    updateBudgetSummary();
    updateRemainingReserve();
}

function loadIncomeItems() {
    const container = document.getElementById('incomeItems');
    const items = budgetData.income || {};
    
    container.innerHTML = Object.entries(items).map(([name, amount]) => `
        <div class="budget-line-item">
            <div class="label">${name}</div>
            <div class="amount">
                <input type="number" 
                       id="income_${name.replace(/[^a-zA-Z0-9]/g, '_')}" 
                       value="${amount}" 
                       step="100"
                       onchange="updateBudgetSummary()">
            </div>
            <div></div>
        </div>
    `).join('');
}

function loadExpenseItems(category, containerId) {
    const container = document.getElementById(containerId);
    const items = budgetData.expenses[category] || {};
    
    if (Object.keys(items).length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic;">No items in this category</p>';
        return;
    }
    
    container.innerHTML = Object.entries(items).map(([name, amount]) => `
        <div class="budget-line-item">
            <div class="label">${name}</div>
            <div class="amount">
                <input type="number" 
                       id="expense_${category.replace(/[^a-zA-Z0-9]/g, '_')}_${name.replace(/[^a-zA-Z0-9]/g, '_')}" 
                       value="${amount}" 
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
    Object.keys(budgetData.income || {}).forEach(name => {
        const input = document.getElementById('income_' + name.replace(/[^a-zA-Z0-9]/g, '_'));
        if (input) {
            totalIncome += parseFloat(input.value) || 0;
        }
    });
    
    // Calculate total expenses
    let totalExpenses = 0;
    const expenseContainers = ['operatingExpenses', 'amenitiesMaintenance', 'clubhouseMaintenance', 
                               'commonAreaMaintenance', 'groundsMaintenance', 'security', 
                               'streetsDrainage', 'taxes', 'utilities'];
    
    expenseContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.querySelectorAll('input[type="number"]').forEach(input => {
                totalExpenses += parseFloat(input.value) || 0;
            });
        }
    });
    
    // Add special projects
    const specialProjects = document.querySelectorAll('#specialProjects .budget-line-item');
    specialProjects.forEach(item => {
        const amountInput = item.querySelector('input[type="number"]');
        if (amountInput && amountInput.id.includes('_amount')) {
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
    
    updateRemainingReserve();
}

function updateRemainingReserve() {
    const end2024Reserve = 326672.14;
    const y2025Data = financialData.pnl_data['2025'];
    const y2025Income = Object.values(y2025Data?.income || {}).reduce((a, b) => a + b, 0);
    const y2025Expenses = Object.values(y2025Data?.expenses || {}).reduce((a, b) => a + b, 0);
    const y2025Net = y2025Income - y2025Expenses;
    const end2025Reserve = end2024Reserve + y2025Net;
    
    const stormFundAmount = parseFloat(document.getElementById('stormFundAmount').value) || 0;
    const spendableReserve = end2025Reserve - stormFundAmount;
    
    // Update displays
    const y2025ReserveEl = document.getElementById('y2025ReserveFund');
    const stormFundDisplayEl = document.getElementById('stormFundDisplay');
    const spendableReserveEl = document.getElementById('spendableReserve');
    
    if (y2025ReserveEl) y2025ReserveEl.textContent = '$' + formatCurrency(end2025Reserve);
    if (stormFundDisplayEl) stormFundDisplayEl.textContent = '$' + formatCurrency(stormFundAmount);
    if (spendableReserveEl) spendableReserveEl.textContent = '$' + formatCurrency(spendableReserve);
    
    // Update end of year projection
    updateEndOfYearProjection(end2025Reserve);
}

function updateEndOfYearProjection(startingReserve) {
    // Calculate projected net income from budget
    let totalIncome = 0;
    Object.keys(budgetData.income || {}).forEach(name => {
        const input = document.getElementById('income_' + name.replace(/[^a-zA-Z0-9]/g, '_'));
        if (input) {
            totalIncome += parseFloat(input.value) || 0;
        }
    });
    
    let totalExpenses = 0;
    const expenseContainers = ['operatingExpenses', 'amenitiesMaintenance', 'clubhouseMaintenance', 
                               'commonAreaMaintenance', 'groundsMaintenance', 'security', 
                               'streetsDrainage', 'taxes', 'utilities'];
    
    expenseContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.querySelectorAll('input[type="number"]').forEach(input => {
                totalExpenses += parseFloat(input.value) || 0;
            });
        }
    });
    
    // Add special projects
    const specialProjects = document.querySelectorAll('#specialProjects .budget-line-item');
    specialProjects.forEach(item => {
        const amountInput = item.querySelector('input[type="number"]');
        if (amountInput && amountInput.id.includes('_amount')) {
            totalExpenses += parseFloat(amountInput.value) || 0;
        }
    });
    
    const projectedNet = totalIncome - totalExpenses;
    const end2026Reserve = startingReserve + projectedNet;
    
    const startingReserveEl = document.getElementById('startingReserve2026');
    const projectedNetEl = document.getElementById('projectedNet2026');
    const end2026ReserveEl = document.getElementById('end2026ReserveFund');
    
    if (startingReserveEl) startingReserveEl.textContent = '$' + formatCurrency(startingReserve);
    if (projectedNetEl) projectedNetEl.textContent = '$' + formatCurrency(projectedNet);
    if (end2026ReserveEl) {
        end2026ReserveEl.textContent = '$' + formatCurrency(end2026Reserve);
        // Save to localStorage for 2027 page to use
        try {
            localStorage.setItem('end2026ReserveFund', end2026Reserve.toString());
        } catch (e) {
            // localStorage not available, that's okay
        }
    }
}

function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0.00';
    }
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
} else {
    loadData();
}

