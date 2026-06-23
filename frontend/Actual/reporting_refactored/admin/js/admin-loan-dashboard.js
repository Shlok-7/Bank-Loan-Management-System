let rawPortfolioData = [];
let dashboardData = {};
let currentPage = 1;
const itemsPerPage = 5;

let donutChartInstance = null;
let bankExposureChartInstance = null;

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

function showToast(message, isError = false) {
    const toast = document.getElementById('notification-toast');
    const icon = document.getElementById('notification-icon');
    const msgSpan = document.getElementById('notification-message');
    
    msgSpan.textContent = message;
    if (isError) {
        toast.classList.add('border-red-500');
        icon.className = 'ph-bold ph-warning-circle text-red-500 text-lg';
    } else {
        toast.classList.remove('border-red-500');
        icon.className = 'ph-bold ph-info text-blue-400 text-lg';
    }

    toast.classList.remove('translate-y-[-150%]');
    setTimeout(() => {
        toast.classList.add('translate-y-[-150%]');
    }, 4000);
}

async function initDashboard() {
    try {
        let data;
        try {
            const response = await fetch('http://localhost:8086/admin/reports/loans');
            if (!response.ok) throw new Error('CORS or connection exception');
            data = await response.json();
            showToast("Dashboard synchronized with live databases successfully!");
        } catch (e) {
            console.warn("Backend server at http://localhost:8086 is offline. Displaying local simulated assets.", e);
            data = await getMockData();
            showToast("Server offline. Displaying high-fidelity mock data.", false);
        }
        
        dashboardData = data;
        rawPortfolioData = data.recentCustomerPortfolio || [];
        
        renderKPIs(data);
        renderChart(data);
        renderBankExposureChart(rawPortfolioData);
        
        currentPage = 1;
        renderTable();
        
    } catch (error) {
        console.error("Failed to load dashboard data:", error);
        showToast("System encountered an initialization error. Please verify endpoints.", true);
    }
}

function renderKPIs(data) {
    document.getElementById('kpi-disbursed').textContent = currencyFormatter.format(data.totalAmountDisbursed);
    document.getElementById('kpi-outstanding').textContent = currencyFormatter.format(data.totalOutstandingBalance);
    document.getElementById('kpi-customers').textContent = data.totalCustomers.toLocaleString('en-IN');
}

function renderChart(data) {
    const ctx = document.getElementById('statusDonutChart').getContext('2d');
    
    const total = data.approvedApplications + data.pendingApplications;
    document.getElementById('chart-total-center').textContent = total;
    document.getElementById('stat-approved').textContent = data.approvedApplications;
    document.getElementById('stat-pending').textContent = data.pendingApplications;

    if (donutChartInstance) {
        donutChartInstance.destroy();
    }

    donutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Approved', 'Pending'],
            datasets: [{
                data: [data.approvedApplications, data.pendingApplications],
                backgroundColor: [
                    '#2563eb', 
                    '#f97316'  
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%', 
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            label += context.raw;
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function renderBankExposureChart(portfolio) {
    const canvas = document.getElementById('bankExposureChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const bankAggregation = {};
    portfolio.forEach(item => {
        const bank = item.bankName || 'Unknown Bank';
        const amt = parseFloat(item.requestedAmount) || 0;
        const status = (item.applicationStatus || '').toUpperCase();

        if (!bankAggregation[bank]) {
            bankAggregation[bank] = { approved: 0, pending: 0 };
        }

        if (status === 'APPROVED') {
            bankAggregation[bank].approved += amt;
        } else if (status === 'PENDING') {
            bankAggregation[bank].pending += amt;
        }
    });

    const labels = Object.keys(bankAggregation);
    const approvedData = labels.map(bank => bankAggregation[bank].approved);
    const pendingData = labels.map(bank => bankAggregation[bank].pending);

    if (bankExposureChartInstance) {
        bankExposureChartInstance.destroy();
    }

    bankExposureChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Approved Amount',
                    data: approvedData,
                    backgroundColor: '#2563eb', 
                    borderRadius: 6,
                    barThickness: 16
                },
                {
                    label: 'Requested Amount',
                    data: pendingData,
                    backgroundColor: '#f97316', 
                    borderRadius: 6,
                    barThickness: 16
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11, family: 'Inter' }, color: '#64748b' }
                },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        font: { size: 10, family: 'Inter' },
                        color: '#64748b',
                        callback: function(value) {
                            if (value >= 100000) return '₹' + (value / 100000).toFixed(0) + 'L';
                            if (value >= 1000) return '₹' + (value / 1000).toFixed(0) + 'k';
                            return '₹' + value;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: { size: 11, family: 'Inter' },
                        padding: 16,
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            label += currencyFormatter.format(context.raw);
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function renderTable() {
    const tbody = document.getElementById('portfolio-table-body');
    if (!tbody) return;

    const totalRecords = rawPortfolioData.length;
    const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, totalRecords);
    const paginatedSlice = rawPortfolioData.slice(startIdx, endIdx);

    document.getElementById('table-entries-info').textContent = totalRecords > 0 
        ? `Showing ${startIdx + 1} to ${endIdx} of ${totalRecords} entries` 
        : 'Showing 0 to 0 of 0 entries';

    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    const paginationNumbersDiv = document.getElementById('pagination-numbers');
    paginationNumbersDiv.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === currentPage) {
            btn.className = "px-3 py-1.5 rounded bg-blue-600 text-white font-semibold shadow-sm text-xs transition-all";
        } else {
            btn.className = "px-3 py-1.5 rounded bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-medium text-xs transition-all";
            btn.onclick = () => {
                currentPage = i;
                renderTable();
            };
        }
        paginationNumbersDiv.appendChild(btn);
    }

    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    };

    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    };

    if (paginatedSlice.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7" class="px-6 py-12 text-center text-gray-500 font-medium">No application records available.</td></tr>
        `;
        return;
    }

    tbody.innerHTML = ''; 
    
    paginatedSlice.forEach(row => {
        const statusColor = row.applicationStatus === 'APPROVED' ? 'bg-blue-100 text-blue-700 border-blue-200' 
                          : row.applicationStatus === 'PENDING' ? 'bg-orange-100 text-orange-700 border-orange-200' 
                          : 'bg-red-100 text-red-700 border-red-200';
        
        const kycColor = row.kycStatus === 'VERIFIED' ? 'text-green-600 bg-green-50' 
                       : 'text-amber-600 bg-amber-50';

        const formattedAmt = currencyFormatter.format(row.requestedAmount);
        const formattedDate = row.loanApprovalDate ? dateFormatter.format(new Date(row.loanApprovalDate)) : '<span class="text-gray-400">-</span>';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition-colors group';
        tr.innerHTML = `
            <td class="px-6 py-4">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200 text-xs font-mono font-medium text-gray-600">
                    APP-${row.applicationId.toString().padStart(4, '0')}
                </span>
            </td>
            <td class="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                <div class="h-8 w-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                    ${row.customerName ? row.customerName.charAt(0) : 'C'}
                </div>
                ${row.customerName || 'N/A'}
            </td>
            <td class="px-6 py-4 text-gray-600">
                <div class="flex items-center gap-2">
                    <i class="ph ph-bank text-gray-400"></i> ${row.bankName}
                </div>
            </td>
            <td class="px-6 py-4 text-gray-600">${row.productType}</td>
            <td class="px-6 py-4 text-right font-medium text-gray-900">${formattedAmt}</td>
            <td class="px-6 py-4 text-center">
                <div class="flex flex-col items-center gap-1.5">
                    <span class="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded uppercase border ${statusColor}">
                        ${row.applicationStatus}
                    </span>
                    <span class="text-[10px] font-medium px-2 py-0.5 rounded ${kycColor}">
                        KYC: ${row.kycStatus}
                    </span>
                </div>
            </td>
            <td class="px-6 py-4 text-right text-gray-500 text-sm">${formattedDate}</td>
        `;
        tbody.appendChild(tr);
    });
}

function handleExport() {
    if (rawPortfolioData.length === 0) {
        showToast("No data portfolio entries available to export.", true);
        return;
    }

    const headers = ["App ID", "Customer Name", "Partner Bank", "Product Type", "Requested Amount (INR)", "Application Status", "KYC Status", "Loan Approval Date"];
    const csvRows = [headers.join(",")];

    rawPortfolioData.forEach(row => {
        const values = [
            `"APP-${row.applicationId}"`,
            `"${row.customerName.replace(/"/g, '""')}"`,
            `"${row.bankName.replace(/"/g, '""')}"`,
            `"${row.productType.replace(/"/g, '""')}"`,
            row.requestedAmount,
            `"${row.applicationStatus}"`,
            `"${row.kycStatus}"`,
            `"${row.loanApprovalDate || 'N/A'}"`
        ];
        csvRows.push(values.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const downloadLink = document.createElement("a");
    
    downloadLink.setAttribute("href", encodedUri);
    downloadLink.setAttribute("download", `loan_dashboard_portfolio_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(downloadLink);
    
    downloadLink.click();
    document.body.removeChild(downloadLink);

    showToast("Structured CSV data compiled and downloaded.");
}