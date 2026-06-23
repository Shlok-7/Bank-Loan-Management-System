const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
});

let globalRepaymentData = [];
let currentPage = 1;
const rowsPerPage = 10;
let performanceChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Role-based auth check
    const customerId = localStorage.getItem('loggedInUserId');
    
    if (!customerId) {
        showError("Authentication required. Please log in.");
        return;
    }
    
    initDashboard(customerId);
});

async function initDashboard(customerId) {
    document.getElementById('header-customer-id').textContent = customerId;

    try {
        const response = await fetch(`http://localhost:8086/user/${customerId}/reports/repayments`);
        
        if (!response.ok) {
            if(response.status === 404) throw new Error("404_NOT_FOUND");
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if(!data.detailedRepaymentLog || data.detailedRepaymentLog.length === 0) {
            throw new Error("EMPTY_RECORDS");
        }

        document.getElementById('error-banner').classList.add('hidden');

        globalRepaymentData = data.detailedRepaymentLog;
        
        renderKPIs(data);
        renderStreak(globalRepaymentData);
        renderChart(globalRepaymentData);
        
        currentPage = 1;
        renderTablePage();

    } catch (error) {
        console.warn("API Error intercepted:", error.message);
        
        document.getElementById('error-banner').classList.remove('hidden');
        document.getElementById('repayment-table-body').innerHTML = `
            <tr><td colspan="6" class="py-8 text-center text-slate-500 italic">No historical records available to display.</td></tr>
        `;
        document.getElementById('streak-container').innerHTML = `<div class="text-slate-400 text-sm">No streak data available.</div>`;
        
        // Mock data fallback if server is unreachable
        if(error.message !== "404_NOT_FOUND" && error.message !== "EMPTY_RECORDS") {
            document.getElementById('error-message').innerHTML = "Could not connect to live server. Displaying <b>Simulated Mock Data</b> for preview.";
            loadMockData();
        }
    }
}

// ... (Keep the rest of your existing functions: renderKPIs, renderStreak, renderChart, renderTablePage, changePage, and loadMockData exactly as they are) ...

function renderKPIs(data) {
    document.getElementById('kpi-total-payments').textContent = data.totalPaymentsMade || 0;
    document.getElementById('kpi-completed-payments').textContent = data.numberOfCompletedPayments || 0;
    
    document.getElementById('kpi-latest-date').textContent = 
        data.latestPaymentDate ? dateFormatter.format(new Date(data.latestPaymentDate)) : 'N/A';
        
    document.getElementById('kpi-next-date').textContent = 
        data.nextPaymentDate ? dateFormatter.format(new Date(data.nextPaymentDate)) : 'N/A';
}

function renderStreak(logs) {
    const container = document.getElementById('streak-container');
    container.innerHTML = ''; 

    if(logs.length === 0) return;

    const sortedLogs = [...logs].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const today = new Date();

    sortedLogs.forEach((log, index) => {
        const dueDate = new Date(log.dueDate);
        
        let nodeColorClass = 'bg-slate-200 text-transparent'; 
        let icon = '';
        
        if(log.paymentStatus === 'COMPLETED') {
            nodeColorClass = 'bg-emerald-500 text-white';
            icon = '<i class="fa-solid fa-check text-[10px]"></i>';
        } else if (log.paymentStatus === 'PENDING') {
            if (dueDate < today) {
                nodeColorClass = 'bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.6)]';
                icon = '<i class="fa-solid fa-exclamation text-[10px]"></i>';
            } else {
                nodeColorClass = 'bg-slate-200 text-transparent border-2 border-slate-300';
            }
        }

        const nodeWrapper = document.createElement('div');
        nodeWrapper.className = 'flex items-center group relative cursor-pointer';
        
        const dot = document.createElement('div');
        dot.className = `w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 transition-transform group-hover:scale-125 ${nodeColorClass}`;
        dot.innerHTML = icon;

        const tooltip = document.createElement('div');
        tooltip.className = 'absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-lg';
        const formattedDue = dateFormatter.format(dueDate);
        tooltip.innerHTML = `Due: ${formattedDue}<br>Status: ${log.paymentStatus}`;

        nodeWrapper.appendChild(dot);
        nodeWrapper.appendChild(tooltip);
        
        container.appendChild(nodeWrapper);

        if (index < sortedLogs.length - 1) {
            const line = document.createElement('div');
            line.className = 'w-6 md:w-10 h-1 bg-slate-200 shrink-0';
            if(log.paymentStatus === 'COMPLETED' && sortedLogs[index+1].paymentStatus === 'COMPLETED') {
                line.className = 'w-6 md:w-10 h-1 bg-emerald-400 shrink-0';
            }
            container.appendChild(line);
        }
    });
}

function renderChart(logs) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    if(performanceChartInstance) {
        performanceChartInstance.destroy();
    }

    const sortedLogs = [...logs].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const labels = sortedLogs.map(log => {
        const date = new Date(log.dueDate);
        return `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    });

    const completedData = sortedLogs.map(log => log.paymentStatus === 'COMPLETED' ? log.amountDue : 0);
    const pendingData = sortedLogs.map(log => log.paymentStatus === 'PENDING' ? log.amountDue : 0);

    performanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Completed Payments',
                    data: completedData,
                    backgroundColor: '#10b981', 
                    borderRadius: 4
                },
                {
                    label: 'Pending / Due Amount',
                    data: pendingData,
                    backgroundColor: '#f1f5f9', 
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { 
                    stacked: true, 
                    border: { dash: [4, 4] },
                    ticks: {
                        callback: function(value) { return '₹' + value; }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function renderTablePage() {
    const tbody = document.getElementById('repayment-table-body');
    const totalRows = globalRepaymentData.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
    
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
    const pageData = globalRepaymentData.slice(startIndex, endIndex);

    document.getElementById('table-entries-info').textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalRows} entries`;
    document.getElementById('page-indicator').textContent = `Page ${currentPage} of ${totalPages}`;
    
    document.getElementById('btn-prev').disabled = currentPage === 1;
    document.getElementById('btn-next').disabled = currentPage === totalPages;

    tbody.innerHTML = '';
    
    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-500">No repayment history found.</td></tr>`;
        return;
    }

    pageData.forEach(row => {
        const statusColor = row.paymentStatus === 'COMPLETED' 
            ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
            : 'bg-orange-100 text-orange-700 border-orange-200';
            
        const statusIcon = row.paymentStatus === 'COMPLETED' ? 'fa-check' : 'fa-clock';

        const formattedAmt = currencyFormatter.format(row.amountDue);
        const formattedDue = row.dueDate ? dateFormatter.format(new Date(row.dueDate)) : '-';
        const formattedPaid = row.paymentDate ? dateFormatter.format(new Date(row.paymentDate)) : '-';
        
        const isOverdue = row.paymentStatus === 'PENDING' && new Date(row.dueDate) < new Date();
        const overdueStyle = isOverdue ? 'text-red-500 font-medium' : '';
        const displayStatus = isOverdue ? 'OVERDUE' : row.paymentStatus;
        const activeStatusColor = isOverdue ? 'bg-red-100 text-red-700 border-red-200' : statusColor;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/80 transition-colors group';
        tr.innerHTML = `
            <td class="py-4 px-6 text-slate-600 font-medium">REP-${row.repaymentId.toString().padStart(5, '0')}</td>
            <td class="py-4 px-6 text-slate-800">${row.loanProduct}</td>
            <td class="py-4 px-6 text-slate-600 ${overdueStyle}">${formattedDue}</td>
            <td class="py-4 px-6 text-slate-800 font-semibold">${formattedAmt}</td>
            <td class="py-4 px-6 text-slate-500">${formattedPaid}</td>
            <td class="py-4 px-6 text-center">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${activeStatusColor}">
                    <i class="fa-solid ${isOverdue ? 'fa-exclamation-circle' : statusIcon} mr-1.5"></i> ${displayStatus}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.changePage = function(direction) {
    currentPage += direction;
    renderTablePage();
};

function loadMockData() {
    const mockData = {
        nextPaymentDate: "2026-08-17",
        latestPaymentDate: "2026-05-17",
        numberOfCompletedPayments: 12,
        totalPaymentsMade: 72,
        detailedRepaymentLog: []
    };

    const products = ["SBI Xpress Credit Personal Loan", "Home Loan Premium", "Auto Loan Scheme"];
    const startDate = new Date(2025, 5, 17); 

    for(let i=1; i<=25; i++) { 
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);
        
        const isPast = dueDate < new Date("2026-06-02"); 
        const isCompleted = isPast && Math.random() > 0.1; 

        mockData.detailedRepaymentLog.push({
            repaymentId: 1000 + i,
            loanProduct: products[i % 3],
            dueDate: dueDate.toISOString().split('T')[0],
            amountDue: 5000 + (Math.random() * 2000),
            paymentDate: isCompleted ? dueDate.toISOString().split('T')[0] : null,
            paymentStatus: isCompleted ? "COMPLETED" : "PENDING"
        });
    }
    
    globalRepaymentData = mockData.detailedRepaymentLog;
    renderKPIs(mockData);
    renderStreak(globalRepaymentData);
    renderChart(globalRepaymentData);
    currentPage = 1;
    renderTablePage();
}