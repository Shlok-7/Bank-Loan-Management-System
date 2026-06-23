const BASE_URL = 'http://localhost:8086/getRepayments';
let currentSearchAppId = ""; // GLOBAL STATE: Remembers what you searched for

// ==========================================
// Initialization & Auth Setup
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const userName = localStorage.getItem('loggedInUserName') || localStorage.getItem('userName');
    
    if (!userName) {
        alert("Secure Area: Please log in with Administrative credentials.");
        window.location.href = '/Actual/Customer/login.html'; 
        return;
    }

    initializeNavbar();
    loadAllRepaymentsAdmin(0);
});

function initializeNavbar() {
    const storedUserName = localStorage.getItem('loggedInUserName') || localStorage.getItem('userName'); 
    const displayName = storedUserName ? storedUserName : 'Admin User';
    
    const avatarElement = document.getElementById('nav-avatar');
    if (avatarElement) avatarElement.textContent = displayName.charAt(0).toUpperCase();
    
    const nameElement = document.getElementById('nav-user-name');
    if (nameElement) nameElement.textContent = `${displayName} ▾`;
}

function logout() {
    if(confirm("Are you sure you want to securely log out?")) {
        localStorage.clear();
        window.location.replace('/Actual/Customer/login.html'); 
    }
}

// ==========================================
// Formatting & Utilities
// ==========================================
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

function showNotification(message, isError = false) {
    const toastEl = document.getElementById('statusToast');
    const toastMsg = document.getElementById('toastMessage');
    
    if (!toastEl || !toastMsg) return;

    toastEl.className = `toast align-items-center text-white border-0 shadow-lg ${isError ? 'bg-danger' : 'bg-success'}`;
    toastMsg.innerHTML = isError 
        ? `<i class="bi bi-exclamation-octagon-fill me-2 fs-5 align-middle"></i> ${message}` 
        : `<i class="bi bi-check-circle-fill me-2 fs-5 align-middle"></i> ${message}`;
    
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}

// ==========================================
// PAGINATION ROUTER (The Fix)
// ==========================================
// This replaces direct calls to loadAllRepaymentsAdmin()
function goToPage(page) {
    if (currentSearchAppId && currentSearchAppId !== "") {
        // If we have an active search, continue searching on the requested page
        filterAdminTable(page);
    } else {
        // Otherwise, load all records
        loadAllRepaymentsAdmin(page);
    }
}

// ==========================================
// ADMIN GOD MODE LOGIC
// ==========================================

// 1. Fetch Global Data
function loadAllRepaymentsAdmin(page = 0) {
    currentSearchAppId = ""; // Reset search state when loading all
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return; 
    
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;

    fetch(`${BASE_URL}/admin/all?page=${page}&size=20`)
        .then(response => response.json())
        .then(pageData => {
            tbody.innerHTML = "";
            const repayments = pageData.content;

            if (repayments.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No records found.</td></tr>`;
                return;
            }

            repayments.forEach(emi => {
                renderSingleAdminRow(tbody, emi, page);
            });

            renderAdminPagination(pageData.number, pageData.totalPages);
        })
        .catch(error => showNotification("Failed to load admin data", true));
}

// 2. Admin Pagination Renderer
function renderAdminPagination(currentPage, totalPages) {
    const container = document.getElementById('adminPaginationContainer');
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<nav aria-label="Page navigation"><ul class="pagination pagination-sm shadow-sm">`;
    
    // Previous Button: call goToPage
    const prevDisabled = currentPage === 0 ? "disabled" : "";
    html += `<li class="page-item ${prevDisabled}"><button class="page-link text-primary fw-medium" onclick="goToPage(${currentPage - 1})">Previous</button></li>`;

    // Page Numbers: call goToPage
    for (let i = 0; i < totalPages; i++) {
        const activeClass = i === currentPage ? "active" : "";
        html += `<li class="page-item ${activeClass}"><button class="page-link" onclick="goToPage(${i})">${i + 1}</button></li>`;
    }

    // Next Button: call goToPage
    const nextDisabled = currentPage === totalPages - 1 ? "disabled" : "";
    html += `<li class="page-item ${nextDisabled}"><button class="page-link text-primary fw-medium" onclick="goToPage(${currentPage + 1})">Next</button></li>`;
    html += `</ul></nav>`;
    
    container.innerHTML = html;
}

// 3. Admin Status Override
function executeAdminOverride(repaymentId, currentPage) {
    const newStatus = document.getElementById(`override-status-${repaymentId}`).value;
    
    if(!confirm(`Are you sure you want to change EMI #${repaymentId} to ${newStatus}?`)) return;

    fetch(`${BASE_URL}/admin/override/${repaymentId}?status=${newStatus}`, {
        method: 'PUT'
    })
    .then(response => {
        if (!response.ok) throw new Error("Override failed");
        return response.json();
    })
    .then(updatedEmi => {
        showNotification(`EMI #${repaymentId} updated to ${newStatus}.`);
        goToPage(currentPage); // Use router to refresh current view
    })
    .catch(error => {
        showNotification("Security Error: Override blocked.", true);
    });
}

// ==========================================
// ADMIN GLOBAL SEARCH (Server-Side with Pagination)
// ==========================================
let searchTimeout;

function filterAdminTable(page = 0) {
    const input = document.getElementById("searchAppId"); // Ensure HTML input has this ID
    currentSearchAppId = input.value.replace('#', '').trim(); // Set Global State
    
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        const tbody = document.getElementById("adminTableBody");
        const paginationContainer = document.getElementById('adminPaginationContainer');

        if (currentSearchAppId === "") {
            loadAllRepaymentsAdmin(0);
            return;
        }

        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;

        // Fetch paginated search results
        fetch(`${BASE_URL}/admin/search/application/${currentSearchAppId}?page=${page}&size=20`)
            .then(response => {
                if (!response.ok) throw new Error("Search failed");
                return response.json();
            })
            .then(pageData => {
                tbody.innerHTML = "";
                const results = pageData.content; 

                if (!results || results.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No records found for App #${currentSearchAppId}.</td></tr>`;
                    paginationContainer.innerHTML = "";
                    return;
                }

                // Render rows
                results.forEach(emi => renderSingleAdminRow(tbody, emi, page));
                
                // Update pagination controls
                renderAdminPagination(pageData.number, pageData.totalPages);
            })
            .catch(error => {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No records found.</td></tr>`;
                paginationContainer.innerHTML = "";
            });
    }, 500); 
}

// DRY Helper Function
function renderSingleAdminRow(tbody, emi, page) {
    const appId = emi.loanApplication ? emi.loanApplication.applicationId : "N/A";
    const isCompleted = emi.paymentStatus === 'COMPLETED';
    
    const badge = isCompleted 
        ? `<span class="badge badge-completed">COMPLETED</span>` 
        : `<span class="badge badge-pending">PENDING</span>`;

    const actionHtml = `
        <div class="d-flex justify-content-end gap-2">
            <select class="form-select form-select-sm w-auto" id="override-status-${emi.repaymentId}">
                <option value="COMPLETED" ${isCompleted ? 'selected' : ''}>Force COMPLETED</option>
                <option value="PENDING" ${!isCompleted ? 'selected' : ''}>Force PENDING</option>
            </select>
            <button class="btn btn-sm btn-primary fw-bold shadow-sm" onclick="executeAdminOverride(${emi.repaymentId}, ${page})">
                Update
            </button>
        </div>
    `;

    tbody.innerHTML += `
        <tr>
            <td class="ps-4 fw-bold text-primary">#${emi.repaymentId}</td>
            <td><span class="badge bg-light text-dark border px-2 py-1">App #${appId}</span></td>
            <td><span class="fw-medium">${emi.dueDate}</span></td>
            <td><span class="fw-medium">${formatCurrency(emi.amountDue)}</span></td>
            <td>${badge}</td>
            <td class="text-end pe-4">${actionHtml}</td>
        </tr>
    `;
}