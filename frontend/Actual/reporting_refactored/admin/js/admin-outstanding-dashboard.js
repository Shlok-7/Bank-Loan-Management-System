let dashboardData = null;
let filteredPortfolio = [];
let currentPage = 1;
const itemsPerPage = 5;
let histogramChartInstance = null;

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
            const response = await fetch('http://localhost:8086/admin/reports/outstanding-loans');
            if (!response.ok) throw new Error('Network response was not ok');
            data = await response.json();
        } catch (e) {
            console.warn("Backend unavailable, using rich mock data for preview.", e);
            data = await getMockData(); 
        }
        
        dashboardData = data;
        filteredPortfolio = [...(data.detailedOutstandingPortfolio || [])];
        
        renderKPIs(data);
        renderHistogram(data.detailedOutstandingPortfolio);
        
        currentPage = 1;
        renderTable();
        
    } catch (error) {
        console.error("Dashboard initialization failed:", error);
    }
}

function renderKPIs(data) {
    document.getElementById('kpi-total-outstanding').textContent = currencyFormatter.format(data.totalOutstandingBalance);
    document.getElementById('kpi-overdue-count').textContent = data.countOfOverdueLoans.toLocaleString();
    document.getElementById('kpi-largest-outstanding').textContent = currencyFormatter.format(data.largestOutstandingAmount);
    document.getElementById('kpi-avg-outstanding').textContent = currencyFormatter.format(data.averageOutstandingBalance);
}

function renderHistogram(portfolio) {
    const ctx = document.getElementById('agingHistogramChart').getContext('2d');
    
    let bucketCurrent = 0;
    let bucket1to30 = 0;
    let bucket31to60 = 0;
    let bucket60Plus = 0;

    portfolio.forEach(loan => {
        const days = loan.daysOverdue || 0;
        if (days === 0) bucketCurrent++;
        else if (days >= 1 && days <= 30) bucket1to30++;
        else if (days >= 31 && days <= 60) bucket31to60++;
        else bucket60Plus++;
    });

    if (histogramChartInstance) {
        histogramChartInstance.destroy();
    }

    histogramChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Current (0 Days)', '1-30 Days Overdue', '31-60 Days Overdue', '60+ Days Overdue'],
            datasets: [{
                label: 'Number of Active Loans',
                data: [bucketCurrent, bucket1to30, bucket31to60, bucket60Plus],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.85)', 
                    'rgba(245, 158, 11, 0.85)', 
                    'rgba(249, 115, 22, 0.85)',  
                    'rgba(239, 68, 68, 0.85)'    
                ],
                borderColor: [
                    '#2563eb',
                    '#d97706',
                    '#ea580c',
                    '#dc2626'
                ],
                borderWidth: 1.5,
                borderRadius: 8,
                borderSkipped: false,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleFont: { size: 13, family: "'Inter', sans-serif" },
                    bodyFont: { size: 12, family: "'Inter', sans-serif" },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (context) => ` ${context.raw} Outstanding Loans`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, precision: 0, font: { family: "'Inter', sans-serif" } },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    ticks: { font: { family: "'Inter', sans-serif', font-weight: '600'" } },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderTable() {
    const tbody = document.getElementById('portfolio-table-body');
    const totalRecords = filteredPortfolio.length;

    if (totalRecords === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">No outstanding portfolio data found.</td></tr>`;
        document.getElementById('table-entries-info').textContent = "Showing 0 to 0 of 0 entries";
        renderPaginationControls(0);
        return;
    }

    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalRecords);
    const paginatedRecords = filteredPortfolio.slice(startIndex, endIndex);

    document.getElementById('table-entries-info').textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalRecords} entries`;

    tbody.innerHTML = ''; 
    
    paginatedRecords.forEach(row => {
        const isOverdue = row.daysOverdue > 0;
        const overdueStyles = row.daysOverdue > 60 ? 'bg-red-100 text-red-700 border-red-200' 
                            : row.daysOverdue > 30 ? 'bg-orange-100 text-orange-700 border-orange-200'
                            : isOverdue ? 'bg-yellow-100 text-yellow-700 border-yellow-200' 
                            : 'bg-green-50 text-green-700 border-green-200';
        
        const overdueText = isOverdue ? `${row.daysOverdue} Days Late` : 'Current';
        const overdueIcon = isOverdue ? 'ph-warning-circle' : 'ph-check-circle';
        
        const formattedOrigAmt = currencyFormatter.format(row.originalLoanAmount);
        const formattedOutstBal = currencyFormatter.format(row.outstandingBalance);
        const approvalDateStr = row.approvalDate ? dateFormatter.format(new Date(row.approvalDate)) : '-';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition-colors group';
        
        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex flex-col gap-1">
                    <span class="inline-flex items-center w-max px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[11px] font-mono font-medium text-gray-600">
                        APP-${row.applicationId.toString().padStart(4, '0')}
                    </span>
                    <span class="text-[10px] text-gray-400">Approved: ${approvalDateStr}</span>
                </div>
            </td>
            <td class="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                <div class="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                    ${row.customerName ? row.customerName.charAt(0) : 'U'}
                </div>
                <div class="flex flex-col">
                    <span>${row.customerName || 'N/A'}</span>
                    <span class="text-xs font-normal text-gray-400">ID: CUST-${row.customerId}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <span class="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                        <i class="ph ph-bank text-gray-400"></i> ${row.bankName}
                    </span>
                    <span class="text-xs text-gray-500">${row.productType}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-right text-gray-500">${formattedOrigAmt}</td>
            <td class="px-6 py-4 text-right font-bold text-gray-900">${formattedOutstBal}</td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${overdueStyles}">
                    <i class="ph ${overdueIcon}"></i> ${overdueText}
                </span>
            </td>
            <td class="px-6 py-4 text-center text-sm font-medium text-gray-600">${row.interestRate}%</td>
        `;
        tbody.appendChild(tr);
    });

    renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
    const paginationContainer = document.getElementById('paginationControls');
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) {
        paginationContainer.innerHTML = `
            <button class="px-2 py-1 rounded text-gray-300 cursor-not-allowed" disabled><i class="ph ph-caret-left"></i></button>
            <button class="px-3 py-1 rounded bg-blue-600 text-white font-medium">1</button>
            <button class="px-2 py-1 rounded text-gray-300 cursor-not-allowed" disabled><i class="ph ph-caret-right"></i></button>
        `;
        return;
    }

    const prevButton = document.createElement('button');
    prevButton.className = `px-2 py-1 rounded transition-all ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'}`;
    prevButton.innerHTML = `<i class="ph ph-caret-left"></i>`;
    if (currentPage > 1) {
        prevButton.addEventListener('click', () => {
            currentPage--;
            renderTable();
        });
    } else {
        prevButton.disabled = true;
    }
    paginationContainer.appendChild(prevButton);

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        if (i === currentPage) {
            pageBtn.className = "px-3 py-1 rounded bg-blue-600 text-white font-medium shadow-sm transition-all";
        } else {
            pageBtn.className = "px-3 py-1 rounded text-gray-600 hover:bg-gray-200 transition-all";
        }
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderTable();
        });
        paginationContainer.appendChild(pageBtn);
    }

    const nextButton = document.createElement('button');
    nextButton.className = `px-2 py-1 rounded transition-all ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'}`;
    nextButton.innerHTML = `<i class="ph ph-caret-right"></i>`;
    if (currentPage < totalPages) {
        nextButton.addEventListener('click', () => {
            currentPage++;
            renderTable();
        });
    } else {
        nextButton.disabled = true;
    }
    paginationContainer.appendChild(nextButton);
}