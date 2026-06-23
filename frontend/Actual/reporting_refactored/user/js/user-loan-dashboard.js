const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
});

let customerId = null;

window.addEventListener('DOMContentLoaded', () => {
    // 1. Try to get the ID from local storage first (set by your login.html)
    const storedUserId = localStorage.getItem('loggedInUserId');
    
    // 2. Also check URL params just in case (e.g., ?customerId=3)
    const urlParams = new URLSearchParams(window.location.search);
    let urlId = null;
    
    for (const [key, value] of urlParams.entries()) {
        if (key.toLowerCase() === 'customerid' && !isNaN(parseInt(value))) {
            urlId = parseInt(value, 10);
            break;
        }
    }
    
    // 3. Prioritize stored user ID, then URL ID
    if (storedUserId) {
        customerId = parseInt(storedUserId, 10);
    } else if (urlId !== null) {
        customerId = urlId;
    } else {
        // If neither exists, boot the user back to the login page
        showToast('No active session found. Redirecting to login...', 'error');
        setTimeout(() => {
            window.location.href = '../../Customer/login.html';
        }, 2000);
        return;
    }

    // Initialize the dashboard with the correct ID
    initDashboard();
});

async function initDashboard() {
    document.getElementById('user-display-id').textContent = `Customer ID: #${customerId}`;
    
    setTableLoading();

    try {
        const data = await fetchLiveApi(customerId);
        
        let customerName = "Verified Customer";
        if (data.customerName) {
            customerName = data.customerName;
        } else if (data.loanDetails && data.loanDetails.length > 0 && data.loanDetails[0].customerName) {
            customerName = data.loanDetails[0].customerName;
        }
        document.getElementById('user-display-name').textContent = customerName;

        renderKPIs(data);
        renderProgress(data);
        renderTable(data);
        
        if (typeof lucide !== 'undefined') lucide.createIcons(); 
        
    } catch (error) {
        console.error("Dashboard Render Failed:", error);
        
        if (error.message.includes('status: 404') || error.message.includes('Not Found')) {
            showKycNotApprovedState();
        } else {
            showToast(`Connection Failed: ${error.message}`, 'error', 'Please ensure your backend server on port 8086 is running.');
            setTableErrorState(`Failed to load data for Customer #${customerId}. Ensure backend is running.`);
        }
    }
}

async function fetchLiveApi(id) {
    // NOTE: Ensure this exact endpoint exists in your Spring Boot/Backend controllers!
    const targetUrl = `http://localhost:8086/user/${id}/reports/loans`;
    
    let response;
    try {
        response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
    } catch (netErr) {
        throw new Error("Local Network Disconnected. Ensure server is active on port 8086.");
    }

    if (!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
    }

    return await response.json();
}

function showKycNotApprovedState() {
    document.getElementById('user-display-name').textContent = "Pending Verification";
    document.getElementById('user-display-id').textContent = `Customer ID: #${customerId}`;

    document.getElementById('kpi-next-repayment').textContent = currencyFormatter.format(0);
    document.getElementById('kpi-remaining-principal').textContent = currencyFormatter.format(0);
    document.getElementById('kpi-active-loans').textContent = "0";
    document.getElementById('kpi-next-duedate').textContent = "Verification Pending";

    document.getElementById('progress-amount-paid').textContent = currencyFormatter.format(0);
    document.getElementById('progress-amount-total').textContent = currencyFormatter.format(0);
    document.getElementById('badge-percentage').textContent = "0%";
    document.getElementById('progress-percentage-text').textContent = "KYC Verification Required";
    document.getElementById('progress-bar-fill').style.width = '0%';

    showToast(
        `KYC / Account Verification Required`, 
        'info', 
        `No active loan portfolios are available for Customer ID #${customerId}.`
    );

    document.getElementById('loans-table-body').innerHTML = `
        <tr>
            <td colspan="8" class="py-16 text-center">
                <div class="flex flex-col items-center justify-center max-w-md mx-auto gap-4">
                    <div class="p-4 bg-amber-50 text-amber-600 rounded-full">
                        <i data-lucide="user-check" class="w-8 h-8"></i>
                    </div>
                    <div class="space-y-1">
                        <h4 class="font-bold text-slate-800 text-base font-display">KYC Verification Needed</h4>
                        <p class="text-slate-500 text-xs px-4">
                            Your profile is either awaiting KYC documents review, or no active loan accounts have been synchronized for Customer ID #${customerId} yet.
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <a href="mailto:support@nexusfinance.com" class="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors">
                            Contact Support
                        </a>
                    </div>
                </div>
            </td>
        </tr>`;
        
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderKPIs(data) {
    document.getElementById('kpi-next-repayment').textContent = currencyFormatter.format(data.nextRepaymentAmount || 0);
    document.getElementById('kpi-remaining-principal').textContent = currencyFormatter.format(data.remainingPrincipal || 0);
    document.getElementById('kpi-active-loans').textContent = data.totalActiveLoans || 0;

    let earliestDate = "No Upcoming Payments";
    if (data.loanDetails && data.loanDetails.length > 0) {
        const validDateObjects = [];
        
        data.loanDetails.forEach(loan => {
            if (loan.nextDueDate && loan.loanStatus === 'APPROVED') {
                const parsedDate = new Date(loan.nextDueDate + 'T00:00:00');
                if (!isNaN(parsedDate.getTime())) {
                    validDateObjects.push(parsedDate);
                }
            }
        });
        
        if (validDateObjects.length > 0) {
            const minDate = new Date(Math.min(...validDateObjects));
            earliestDate = dateFormatter.format(minDate);
        }
    }
    document.getElementById('kpi-next-duedate').textContent = earliestDate;
}

function renderProgress(data) {
    // 1. Get initial values from root if they exist
    let totalPayable = data.totalRepaymentAmount || 0;
    let remainingToPay = data.remainingPrincipal || 0;

    // 2. Fallback: Aggregate from the loanDetails array if root properties are 0/missing
    if (data.loanDetails && data.loanDetails.length > 0) {
        if (totalPayable === 0) {
            totalPayable = data.loanDetails.reduce((sum, loan) => sum + (loan.totalRepaymentAmount || 0), 0);
        }
        if (remainingToPay === 0) {
            remainingToPay = data.loanDetails.reduce((sum, loan) => sum + (loan.outstandingBalance || 0), 0);
        }
    }

    // 3. Safely calculate the amount paid
    const amountPaid = Math.max(0, totalPayable - remainingToPay);
    
    // 4. Update the DOM elements
    document.getElementById('progress-amount-paid').textContent = currencyFormatter.format(amountPaid);
    document.getElementById('progress-amount-total').textContent = currencyFormatter.format(totalPayable);

    let ratio = 0;
    if (totalPayable > 0) {
        ratio = (amountPaid / totalPayable) * 100;
    }

    const cappedRatio = Math.min(ratio, 100).toFixed(1);
    
    document.getElementById('badge-percentage').textContent = `${cappedRatio}%`;
    document.getElementById('progress-percentage-text').textContent = `${cappedRatio}% Completed`;
    
    const fillBar = document.getElementById('progress-bar-fill');
    fillBar.style.width = '0%';
    setTimeout(() => {
        fillBar.style.width = `${cappedRatio}%`;
    }, 150);
}

function renderTable(data) {
    const tbody = document.getElementById('loans-table-body');
    const loans = data.loanDetails || [];
    
    document.getElementById('table-entries-badge').textContent = `${loans.length} Application${loans.length === 1 ? '' : 's'} Logged`;

    if (loans.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="py-12 text-center text-slate-400">
                    <i data-lucide="folder-open" class="w-10 h-10 mx-auto text-slate-300 mb-2"></i>
                    <span class="font-medium">No registered loan accounts or historical records found.</span>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = '';
    
    loans.forEach(loan => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/70 transition-colors group";

        let statusClass = "bg-slate-100 text-slate-700 border-slate-200";
        if (loan.loanStatus === 'APPROVED') {
            statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
        } else if (loan.loanStatus === 'PENDING') {
            statusClass = "bg-amber-50 text-amber-700 border-amber-200/60";
        } else if (loan.loanStatus === 'REJECTED') {
            statusClass = "bg-rose-50 text-rose-700 border-rose-200/60";
        }

        let displayDueDate = '—';
        if (loan.nextDueDate) {
            const parsedDate = new Date(loan.nextDueDate + 'T00:00:00');
            if (!isNaN(parsedDate.getTime())) {
                 displayDueDate = dateFormatter.format(parsedDate);
            }
        }

        tr.innerHTML = `
            <td class="py-4 px-6">
                <div class="font-bold text-slate-800 font-display">#APP-${loan.applicationId}</div>
                <div class="text-xs text-slate-500 font-medium truncate max-w-xs mt-0.5" title="${loan.loanProduct}">
                    ${loan.loanProduct}
                </div>
            </td>
            <td class="py-4 px-6 text-right font-semibold text-slate-800 font-display">
                ${currencyFormatter.format(loan.totalAmount || 0)}
            </td>
            <td class="py-4 px-6 text-right font-semibold text-slate-800 font-display">
                ${currencyFormatter.format(loan.totalRepaymentAmount || 0)}
            </td>
            <td class="py-4 px-6 text-right text-amber-600 font-semibold font-display">
                ${currencyFormatter.format(loan.outstandingBalance || 0)}
            </td>
            <td class="py-4 px-6 text-center font-medium text-slate-600">
                ${loan.interestRate}% <span class="text-[10px] text-slate-400 block font-normal">fixed p.a.</span>
            </td>
            <td class="py-4 px-6 text-center text-slate-600 font-semibold">
                ${loan.loanTenure}
            </td>
            <td class="py-4 px-6 text-center text-slate-700 font-medium">
                ${displayDueDate}
            </td>
            <td class="py-4 px-6 text-center">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusClass}">
                    <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                    ${loan.loanStatus}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function setTableLoading() {
    document.getElementById('loans-table-body').innerHTML = `
        <tr>
            <td colspan="8" class="py-16 text-center">
                <div class="flex flex-col items-center justify-center gap-3">
                    <div class="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                    <span class="text-slate-500 font-medium">Reading customer database records...</span>
                </div>
            </td>
        </tr>`;
}

function setTableErrorState(message) {
    document.getElementById('loans-table-body').innerHTML = `
        <tr>
            <td colspan="8" class="py-12 text-center text-rose-500">
                <i data-lucide="alert-circle" class="w-10 h-10 mx-auto text-rose-300 mb-2"></i>
                <span class="font-medium">${message}</span>
            </td>
        </tr>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showToast(message, type = 'info', submessage = '') {
    const toast = document.getElementById('status-toast');
    const iconSpan = document.getElementById('status-toast-icon');
    const msgP = document.getElementById('status-toast-msg');
    const submsgP = document.getElementById('status-toast-submsg');
    
    if (!toast || !msgP) return; // Fail silently if toast elements don't exist in HTML
    
    msgP.textContent = message;
    if (submessage && submsgP) {
        submsgP.textContent = submessage;
        submsgP.classList.remove('hidden');
    } else if (submsgP) {
        submsgP.textContent = '';
        submsgP.classList.add('hidden');
    }
    
    toast.className = "mb-6 p-4 rounded-xl shadow-lg border flex items-center justify-between transition-all duration-300";
    
    if (type === 'success') {
        toast.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
        if (iconSpan) iconSpan.innerHTML = '<i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-600"></i>';
    } else if (type === 'error') {
        toast.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-800');
        if (iconSpan) iconSpan.innerHTML = '<i data-lucide="alert-octagon" class="w-5 h-5 text-rose-600"></i>';
    } else if (type === 'info') {
        toast.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-800');
        if (iconSpan) iconSpan.innerHTML = '<i data-lucide="info" class="w-5 h-5 text-blue-600"></i>';
    }
    
    toast.classList.remove('hidden');
    if(typeof lucide !== 'undefined') lucide.createIcons();

    if (type !== 'error') {
        setTimeout(dismissToast, 6000);
    }
}

function dismissToast() {
    const toast = document.getElementById('status-toast');
    if (toast) toast.classList.add('hidden');
}