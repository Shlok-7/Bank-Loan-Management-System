const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
});

document.addEventListener('DOMContentLoaded', () => {
    // Get the ID directly from the session storage set during login
    const customerId = localStorage.getItem('loggedInUserId');
    
    if (!customerId) {
        showError("Authentication required. Please log in first.");
        return;
    }

    initDashboard(customerId);
});

async function initDashboard(customerId) {
    const identityEl = document.getElementById('customer-identity');
    identityEl.innerHTML = `#${customerId} <span class="bg-emerald-500/20 text-emerald-100 text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 ml-2 tracking-wide">VERIFIED KYC</span>`;

    try {
        // Use the authenticated ID in the API URL
        const response = await fetch(`http://localhost:8086/user/${customerId}/reports/outstanding-loans`);
        
        if (!response.ok) {
            if (response.status === 404) throw new Error("404_NOT_FOUND");
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.outstandingBalanceDetails || data.outstandingBalanceDetails.length === 0) {
             throw new Error("EMPTY_RECORDS");
        }

        // --- THE FIX: Fallback calculation if backend stats are missing ---
        let calculatedOutstanding = 0;
        let calculatedRepayment = 0;
        let calculatedOverdue = 0;

        data.outstandingBalanceDetails.forEach(loan => {
            calculatedOutstanding += (loan.outstandingAmount || 0);
            calculatedRepayment += (loan.totalRepaymentAmount || 0);
            if (loan.daysOverdue > 0) {
                // If it's overdue, add the outstanding amount to the overdue total
                calculatedOverdue += (loan.outstandingAmount || 0);
            }
        });

        // Apply calculations only if the backend failed to provide them
        data.totalOutstandingBalance = data.totalOutstandingBalance || calculatedOutstanding;
        data.totalRepaymentAmount = data.totalRepaymentAmount || calculatedRepayment;
        
        // Strict check for overdue, because 0 is a valid number we don't want to overwrite unnecessarily
        if (typeof data.overdueBalance !== 'number') {
            data.overdueBalance = calculatedOverdue;
        }
        // ------------------------------------------------------------------

        renderKPIs(data);
        renderUrgencyChart(data);
        renderGaugeChart(data);
        renderTable(data);

    } catch (error) {
        console.error("Dashboard Initialization Error:", error);
        
        let errorMsg = "We couldn't locate active loan records. Please ensure your KYC is approved.";
        if(error.message === "404_NOT_FOUND") {
            errorMsg = "Customer profile not found. Please contact support.";
        }
        showError(errorMsg);
    }
}

function showError(message) {
    const mainDash = document.getElementById('main-dashboard');
    if(mainDash) mainDash.style.display = 'none';
    const errorState = document.getElementById('error-state');
    if(errorState) {
        errorState.classList.remove('hidden');
        document.getElementById('error-message').textContent = message;
    }
}

function renderKPIs(data) {
    document.getElementById('kpi-total-outstanding').textContent = currencyFormatter.format(data.totalOutstandingBalance);
    document.getElementById('kpi-overdue-balance').textContent = currencyFormatter.format(data.overdueBalance);
    document.getElementById('kpi-total-repayment').textContent = currencyFormatter.format(data.totalRepaymentAmount);
}

let urgencyChartInstance = null;
function renderUrgencyChart(data) {
    const ctx = document.getElementById('urgencyChart').getContext('2d');
    
    const overdue = data.overdueBalance || 0;
    const healthy = Math.max(0, data.totalOutstandingBalance - overdue);

    document.getElementById('stat-healthy').textContent = currencyFormatter.format(healthy);
    document.getElementById('stat-overdue').textContent = currencyFormatter.format(overdue);

    if (urgencyChartInstance) urgencyChartInstance.destroy();

    urgencyChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Urgent Overdue', 'Healthy Outstanding'],
            datasets: [{
                data: [overdue, healthy],
                backgroundColor: ['#ef4444', '#3b82f6'], 
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${currencyFormatter.format(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

let gaugeChartInstance = null;
function renderGaugeChart(data) {
    const ctx = document.getElementById('gaugeChart').getContext('2d');
    
    const totalRepayment = data.totalRepaymentAmount || 0;
    const outstanding = data.totalOutstandingBalance || 0;
    
    let paidAmount = Math.max(0, totalRepayment - outstanding);
    let percentage = 0;
    
    if (totalRepayment > 0) {
        percentage = (paidAmount / totalRepayment) * 100;
    }

    document.getElementById('gauge-percentage').textContent = `${percentage.toFixed(1)}%`;

    if (gaugeChartInstance) gaugeChartInstance.destroy();

    gaugeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Cleared Debt', 'Remaining Balance'],
            datasets: [{
                data: [paidAmount, outstanding],
                backgroundColor: ['#10b981', '#e2e8f0'], 
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${currencyFormatter.format(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderTable(data) {
    const tbody = document.getElementById('portfolio-table-body');
    const items = data.outstandingBalanceDetails || [];
    
    tbody.innerHTML = '';

    items.forEach(row => {
        const prinStr = currencyFormatter.format(row.principalAmount);
        const totalStr = currencyFormatter.format(row.totalRepaymentAmount);
        const outStr = currencyFormatter.format(row.outstandingAmount);
        const dateStr = row.nextDueDate ? dateFormatter.format(new Date(row.nextDueDate)) : '-';
        
        let urgencyBadge = '';
        if (row.daysOverdue > 0) {
            urgencyBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                ${row.daysOverdue} Days Overdue
                            </span>`;
        } else {
            urgencyBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                Current
                            </span>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-blue-50/50 transition-colors group';
        
        tr.innerHTML = `
            <td class="py-4 px-6 whitespace-nowrap">
                <div class="font-bold text-slate-800">APP-${row.applicationId}</div>
                <div class="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">${row.loanStatus}</div>
            </td>
            <td class="py-4 px-6 whitespace-nowrap">
                ${urgencyBadge}
            </td>
            <td class="py-4 px-6 whitespace-nowrap text-right font-medium text-slate-600">
                ${prinStr}
            </td>
            <td class="py-4 px-6 whitespace-nowrap text-right font-medium text-slate-600">
                ${totalStr}
            </td>
            <td class="py-4 px-6 whitespace-nowrap text-right font-bold text-slate-800">
                ${outStr}
            </td>
            <td class="py-4 px-6 whitespace-nowrap text-right font-medium text-slate-600">
                ${dateStr}
            </td>
        `;
        tbody.appendChild(tr);
    });
}