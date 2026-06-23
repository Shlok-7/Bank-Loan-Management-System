let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
const itemsPerPage = 5;

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
});

async function initDashboard() {
    try {
        let data;
        try {
            const response = await fetch('http://localhost:8086/admin/reports/repayments');
            if (!response.ok) throw new Error('Network response was not ok');
            data = await response.json();
        } catch (e) {
            console.warn("Backend unavailable, using mock data for preview.", e);
            data = await getMockData(); 
        }
        
        renderKPIs(data);
        renderGaugeChart(data);
        renderDonutChart(data);
        
        allRecords = data.detailedRepaymentPerformance || [];
        filteredRecords = [...allRecords];
        
        setupEventListeners();
        renderTable();
        
    } catch (error) {
        console.error("Dashboard initialization failed:", error);
    }
}

function setupEventListeners() {
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        const maxPage = Math.ceil(filteredRecords.length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderTable();
        }
    });
}

function renderKPIs(data) {
    document.getElementById('kpi-expected').textContent = currencyFormatter.format(data.totalExpectedRepayments);
    document.getElementById('kpi-collected').textContent = currencyFormatter.format(data.totalCollectedRepayment);
    document.getElementById('kpi-pending-count').textContent = data.numberOfPendingRepayments.toLocaleString();
}

function renderGaugeChart(data) {
    const ctx = document.getElementById('efficiencyGaugeChart').getContext('2d');
    
    let ratio = 0;
    if (data.totalExpectedRepayments > 0) {
        ratio = (data.totalCollectedRepayment / data.totalExpectedRepayments) * 100;
    }
    
    document.getElementById('gauge-percentage-text').textContent = ratio.toFixed(1) + '%';

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Collected', 'Pending/Shortfall'],
            datasets: [{
                data: [ratio, 100 - ratio],
                backgroundColor: ['#10b981', '#e2e8f0'],
                borderWidth: 0,
                hoverOffset: 2,
                circumference: 180,
                rotation: 270
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
                            return ` ${context.label}: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            }
        }
    });
}

function renderDonutChart(data) {
    const ctx = document.getElementById('statusDonutChart').getContext('2d');
    
    const total = data.numberOfCompletedRepayments + data.numberOfPendingRepayments;
    document.getElementById('donut-total-text').textContent = total.toLocaleString();
    document.getElementById('stat-completed-count').textContent = data.numberOfCompletedRepayments.toLocaleString();
    document.getElementById('stat-pending-count').textContent = data.numberOfPendingRepayments.toLocaleString();

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending'],
            datasets: [{
                data: [data.numberOfCompletedRepayments, data.numberOfPendingRepayments],
                backgroundColor: ['#22c55e', '#fb923c'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false },
            }
        }
    });
}

function renderTable() {
    const tbody = document.getElementById('repayment-table-body');
    
    if (filteredRecords.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">No repayment data found.</td></tr>`;
        updatePaginationUI();
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    tbody.innerHTML = ''; 
    
    paginatedRecords.forEach(row => {
        const isCompleted = row.paymentStatus === 'COMPLETED';
        const statusStyles = isCompleted 
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-orange-100 text-orange-700 border-orange-200';
        
        const statusIcon = isCompleted ? 'ph-check-circle' : 'ph-clock';

        const formattedAmt = currencyFormatter.format(row.amountDue);
        const formattedDueDate = row.dueDate ? dateFormatter.format(new Date(row.dueDate)) : '-';
        const formattedPaymentDate = row.paymentDate ? dateFormatter.format(new Date(row.paymentDate)) : '<span class="text-gray-400 italic">Pending</span>';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition-colors';
        
        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex flex-col gap-1">
                    <span class="inline-flex items-center w-max px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[11px] font-mono font-medium text-gray-600">
                        REP-${row.repaymentId.toString().padStart(4, '0')}
                    </span>
                    <span class="text-[10px] text-gray-400">APP-${row.applicationId}</span>
                </div>
            </td>
            <td class="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                <div class="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                    ${row.customerName.charAt(0)}
                </div>
                ${row.customerName}
            </td>
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <span class="text-sm font-medium text-gray-700 flex items-center gap-1.5"><i class="ph ph-bank text-gray-400"></i> ${row.bankName}</span>
                    <span class="text-xs text-gray-500">${row.productType}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-right font-bold text-gray-900">${formattedAmt}</td>
            <td class="px-6 py-4 text-right text-gray-600 text-sm">${formattedDueDate}</td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${statusStyles}">
                    <i class="ph ${statusIcon}"></i> ${row.paymentStatus}
                </span>
            </td>
            <td class="px-6 py-4 text-right text-sm">${formattedPaymentDate}</td>
        `;
        tbody.appendChild(tr);
    });

    updatePaginationUI();
}

function updatePaginationUI() {
    const maxPage = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    prevBtn.disabled = currentPage === 1;
    prevBtn.className = `px-2 py-1 rounded transition-colors ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200 cursor-pointer'}`;
    
    nextBtn.disabled = currentPage === maxPage;
    nextBtn.className = `px-2 py-1 rounded transition-colors ${currentPage === maxPage ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200 cursor-pointer'}`;

    const startEntry = (currentPage - 1) * itemsPerPage + 1;
    const endEntry = Math.min(currentPage * itemsPerPage, filteredRecords.length);
    const total = filteredRecords.length;

    const infoText = total === 0 ? "Showing 0 entries" : `Showing ${startEntry} to ${endEntry} of ${total} entries`;
    document.getElementById('table-entries-info').textContent = infoText;

    const pageNumbersContainer = document.getElementById('page-numbers');
    pageNumbersContainer.innerHTML = '';
    
    const pageRange = [];
    const delta = 1; 
    
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(maxPage - 1, currentPage + delta); i++) {
        pageRange.push(i);
    }
    
    if (currentPage - delta > 2) {
        pageRange.unshift("...");
    }
    if (currentPage + delta < maxPage - 1) {
        pageRange.push("...");
    }
    
    pageRange.unshift(1);
    if (maxPage > 1) {
        pageRange.push(maxPage);
    }

    pageRange.forEach(page => {
        if (page === "...") {
            const span = document.createElement('span');
            span.textContent = "...";
            span.className = "px-2 py-1 text-gray-400 font-medium select-none";
            pageNumbersContainer.appendChild(span);
        } else {
            const btn = document.createElement('button');
            btn.textContent = page;
            if(page === currentPage) {
                btn.className = "px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 font-medium shadow-sm transition-colors";
            } else {
                btn.className = "px-2.5 py-1 rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors";
            }
            btn.onclick = () => { 
                currentPage = page; 
                renderTable(); 
            };
            pageNumbersContainer.appendChild(btn);
        }
    });
}