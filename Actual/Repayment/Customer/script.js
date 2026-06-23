
// ==========================================
// 1. APPLICATION LIST LOGIC (View 1)
// ==========================================
// Added 'page' parameter with a default of 0
function loadUserApplications(customerId, page = 0) {

     

    const grid = document.getElementById('applicationGrid');
    const paginationContainer = document.getElementById('paginationContainer');
    
    // 1. Show a loading spinner
    grid.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="text-muted mt-2">Loading your applications...</p>
        </div>
    `;

    // 2. Fetch the specific page from the backend (size=6 means 6 cards per page)
    const backendUrl = `http://localhost:8086/getRepayments/applications/customer/${customerId}?page=${page}&size=6`;
    
    fetch(backendUrl)
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch applications. Is the server running?");
            return response.json();
        })
        .then(async (pageData) => { 
            grid.innerHTML = ""; 
            
            // Extract the actual array of loans from the Page object
            const applications = pageData.content; 

            // Handle empty state
            if (applications.length === 0) {
                grid.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <p class="text-muted">No active applications found.</p>
                    </div>`;
                paginationContainer.innerHTML = "";
                return;
            }

            // 3. Render the live data (with the async balance side-quest!)
            for (const app of applications) {
                let isCompleted = false;

                try {
                    const balanceResponse = await fetch(`http://localhost:8086/getRepayments/balance/${app.applicationId}`);
                    if (balanceResponse.ok) {
                        const balanceText = await balanceResponse.text();
                        const numericBalance = parseFloat(balanceText);
                        
                        if (!isNaN(numericBalance) && numericBalance === 0) {
                            isCompleted = true;
                        }
                    }
                } catch (error) {
                    console.error(`Failed to fetch balance for app #${app.applicationId}`, error);
                }
                
                const tickMarkHtml = isCompleted 
                    ? `<i class="bi bi-check-circle-fill text-success position-absolute" style="top: 16px; right: 16px; font-size: 1.4rem;" title="Loan Settled"></i>` 
                    : '';

                const buttonText = isCompleted ? "View History" : "Manage Repayments";
                const buttonClass = isCompleted ? "btn-outline-success" : "btn-outline-primary";
                
                grid.innerHTML += `
                    <div class="col-md-5">
                        <div class="card shadow-sm border-0 h-100 app-card position-relative" onclick="openScheduleView(${app.applicationId})">
                            ${tickMarkHtml}
                            <div class="card-body p-4 text-center">
                                <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle d-inline-block mb-3">
                                    <i class="bi bi-bank fs-2"></i>
                                </div>
                                <h4 class="fw-bold">${app.loanProduct.loanProductName}</h4>
                                <p class="text-muted mb-3">Application ID: #${app.applicationId}</p>
                                <button class="btn ${buttonClass} w-100">${buttonText}</button>
                            </div>
                        </div>
                    </div>
                `;
            }

            // 4. Render the Pagination Buttons at the bottom
            renderPagination(customerId, pageData.number, pageData.totalPages);
        })
        .catch(error => {
            console.error("Error loading applications:", error);
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert alert-danger d-inline-block shadow-sm">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i> 
                        Unable to connect to the server. Please try again later.
                    </div>
                </div>
            `;
        });
}

// ==========================================
// NEW: PAGINATION RENDERING LOGIC
// ==========================================
function renderPagination(customerId, currentPage, totalPages) {
    const container = document.getElementById('paginationContainer');
    
    // Hide pagination if there is only 1 page of results
    if (totalPages <= 1) {
        container.innerHTML = ""; 
        return;
    }

    let html = `<nav aria-label="Page navigation"><ul class="pagination pagination-sm shadow-sm">`;

    // Previous Button
    const prevDisabled = currentPage === 0 ? "disabled" : "";
    html += `
        <li class="page-item ${prevDisabled}">
            <button class="page-link text-primary fw-medium" onclick="loadUserApplications('${customerId}', ${currentPage - 1})">Previous</button>
        </li>`;

    // Page Numbers
    for (let i = 0; i < totalPages; i++) {
        const activeClass = i === currentPage ? "active" : "";
        html += `
            <li class="page-item ${activeClass}">
                <button class="page-link" onclick="loadUserApplications('${customerId}', ${i})">${i + 1}</button>
            </li>`;
    }

    // Next Button
    const nextDisabled = currentPage === totalPages - 1 ? "disabled" : "";
    html += `
        <li class="page-item ${nextDisabled}">
            <button class="page-link text-primary fw-medium" onclick="loadUserApplications('${customerId}', ${currentPage + 1})">Next</button>
        </li>`;

    html += `</ul></nav>`;
    container.innerHTML = html;
}

// ROUTING: Switch to Schedule View
function openScheduleView(applicationId) {
    document.getElementById('applicationListView').classList.add('d-none');
    document.getElementById('scheduleView').classList.remove('d-none');
    
    // Update the UI Badge
    document.getElementById('currentAppBadge').innerText = `Loan App ID: #${applicationId}`;
    
    // Scroll to top
    window.scrollTo(0, 0);

    // Fetch live backend data specifically for this App ID
    loadOutstandingBalance(applicationId);
    loadRepaymentSchedule(applicationId);
}

// ROUTING: Switch back to Application List View
function showApplicationList() {
    document.getElementById('scheduleView').classList.add('d-none');
    document.getElementById('applicationListView').classList.remove('d-none');
    window.scrollTo(0, 0);
}

// ==========================================
// 2. BACKEND FETCHING LOGIC (View 2)
// ==========================================
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

// Fetch Schedule using dynamic appId
function loadRepaymentSchedule(applicationId){
    // Notice the backticks (`) and ${appId}. This dynamically changes the URL based on the click!
    const backendUrl = `http://localhost:8086/getRepayments/${applicationId}`;

    fetch(backendUrl)
    .then(response => {
        if(!response.ok) throw new Error("Failed to fetch repayment schedule.");
        return response.json(); 
    })
    .then(scheduleArray => {
        console.log("Live Schedule from DB:", scheduleArray);
        renderDashboard(scheduleArray);
    })
    .catch(error => console.error("Error loading schedule:", error));
}

// Fetch Balance using dynamic appId
function loadOutstandingBalance(applicationId) {
    const backendUrl = `http://localhost:8086/getRepayments/balance/${applicationId}`;

    fetch(backendUrl)
    .then(response => {
        if (!response.ok) throw new Error("Server returned an HTTP error status");
        return response.text(); // Read the response body as plain text first
    })
    .then(textData => {
        console.log("Raw Balance text received:", textData);
        
        // Convert the text string to a number safely
        const numericBalance = parseFloat(textData);
        
        if (isNaN(numericBalance)) {
            // If the backend sent a JSON object instead, try parsing as JSON
            const jsonObject = JSON.parse(textData);
            return jsonObject.balance || jsonObject; 
        }
        
        return numericBalance;
    })
    .then(finalBalance => {
        const balanceDisplay = document.getElementById('displayBalance');
        if (balanceDisplay) {
            balanceDisplay.innerText = formatCurrency(finalBalance);
        }
    })
    .catch(error => {
        console.error("Failed to fetch balance due to error:", error);
        const balanceDisplay = document.getElementById('displayBalance');
        if (balanceDisplay) {
            balanceDisplay.innerText = "Offline";
        }
    });
}

// 2. The main rendering engine
function renderDashboard(liveData) {
    const tableBody = document.getElementById('repaymentTableBody');
    tableBody.innerHTML = ""; 

    // ==========================================
    // Update "Next EMI Due" Card 
    // ==========================================
    const nextUnpaidEmi = liveData.find(emi => emi.paymentStatus !== 'COMPLETED');
    const nextDateDisplay = document.getElementById('displayNextDate');
    
    if (nextDateDisplay) {
        if (nextUnpaidEmi) {
            nextDateDisplay.innerText = nextUnpaidEmi.dueDate; 
            
            // Add cursor-pointer and the click event to scroll!
            nextDateDisplay.className = "fw-bold mb-0 text-due-date cursor-pointer"; 
            nextDateDisplay.title = "Click to jump to this EMI";
            nextDateDisplay.onclick = () => scrollToEmi(nextUnpaidEmi.repaymentId);
            
        } else if (liveData.length > 0) {
            nextDateDisplay.innerText = "Settled";
            nextDateDisplay.className = "fw-bold mb-0 text-success"; 
            nextDateDisplay.onclick = null; // Remove click event if settled
            nextDateDisplay.removeAttribute("title");
        } else {
            nextDateDisplay.innerText = "--";
            nextDateDisplay.className = "fw-bold mb-0 text-white opacity-50";
        }
    }
    // ==========================================

    liveData.forEach(emi => {

        //Client side UI state validation
        let badgeHtml = emi.paymentStatus === 'COMPLETED' 
            ? `<span class="badge bg-success">Settled</span>`
            : `<span class="badge bg-warning text-dark">Pending</span>`;

        let btnHtml = emi.paymentStatus === 'COMPLETED'
            ? `<button class="btn btn-sm btn-secondary" disabled>Paid</button>`
            : `<button class="btn btn-sm btn-primary" onclick="payEmi(${emi.repaymentId})">Pay Now</button>`;

        // Notice the new id="" added to the <tr> tag below!
        const rowHtml = `
            <tr id="emi-row-${emi.repaymentId}" class="emi-row-transition">
                <td><strong>#${emi.repaymentId}</strong></td>
                <td>${emi.dueDate}</td>
                <td>${formatCurrency(emi.amountDue)}</td>
                <td>${badgeHtml}</td>
                <td class="text-end pe-4">${btnHtml}</td>
            </tr>
        `;
        
        tableBody.innerHTML += rowHtml;
    });
}

// Function to smoothly scroll to a specific EMI row and highlight it
function scrollToEmi(repaymentId) {
    const targetRow = document.getElementById(`emi-row-${repaymentId}`);
    
    if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add our custom premium pulse class instead of table-primary
        targetRow.classList.add('highlight-pulse');
        
        // Remove it after the animation finishes so it can be triggered again later
        setTimeout(() => {
            targetRow.classList.remove('highlight-pulse');
        }, 2000);
    }
}

function payEmi(repaymentId) {
    const btn = document.querySelector(`button[onclick="payEmi(${repaymentId})"]`);
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Auth...`;

    const paymentUrl = `http://localhost:8086/getRepayments/pay/${repaymentId}`;

    fetch(paymentUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (!response.ok) throw new Error("Payment Blocked: Ensure older EMIs are cleared first.");
        return response.text();
    })
    .then(successMessage => {
        showNotification(`Transaction #${repaymentId} processed successfully.`);
        
        // Extract the current App ID from the badge text so we can refresh the right data
        const currentAppText = document.getElementById('currentAppBadge').innerText;
        const currentAppId = currentAppText.split("#")[1]; 
        
        loadOutstandingBalance(currentAppId);
        loadRepaymentSchedule(currentAppId);
    })
    .catch(error => {
        console.error("Payment Failed:", error);
        showNotification(error.message, true);
    })
    .finally(() => {
        btn.innerHTML = "Pay Now";
        btn.disabled = false;
    });
}

// Toast Helper
function showNotification(message, isError = false) {
    const toastEl = document.getElementById('statusToast');
    const toastMsg = document.getElementById('toastMessage');
    
    if (!toastEl || !toastMsg) {
        alert((isError ? "ERROR: " : "SUCCESS: ") + message);
        return;
    }

    toastEl.className = `toast align-items-center text-white border-0 shadow-lg ${isError ? 'bg-danger' : 'bg-success'}`;
    toastMsg.innerHTML = isError 
        ? `<i class="bi bi-exclamation-octagon-fill me-2 fs-5 align-middle"></i> ${message}` 
        : `<i class="bi bi-check-circle-fill me-2 fs-5 align-middle"></i> ${message}`;
    
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}

//ADMIN
// ==========================================
// ADMIN GOD MODE LOGIC
// ==========================================

// 1. Fetch Global Data
function loadAllRepaymentsAdmin(page = 0) {
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return; // Exit if we aren't on the admin page
    
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;

    fetch(`http://localhost:8086/getRepayments/admin/all?page=${page}&size=10`)
        .then(response => response.json())
        .then(pageData => {
            tbody.innerHTML = "";
            const repayments = pageData.content;

            if (repayments.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No records found.</td></tr>`;
                return;
            }

            repayments.forEach(emi => {
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
                        <button class="btn btn-sm btn-primary fw-bold" onclick="executeAdminOverride(${emi.repaymentId}, ${page})">
                            Update
                        </button>
                    </div>
                `;

                tbody.innerHTML += `
                    <tr>
                        <td class="ps-4 fw-bold">#${emi.repaymentId}</td>
                        <td>App #${appId}</td>
                        <td>${emi.dueDate}</td>
                        <td>${formatCurrency(emi.amountDue)}</td>
                        <td>${badge}</td>
                        <td class="text-end pe-4">${actionHtml}</td>
                    </tr>
                `;
            });

            renderAdminPagination(pageData.number, pageData.totalPages);
        })
        .catch(error => showNotification("Failed to load admin data", true));
}

// 2. Admin Pagination Renderer (Standard styling)
function renderAdminPagination(currentPage, totalPages) {
    const container = document.getElementById('adminPaginationContainer');
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<nav aria-label="Page navigation"><ul class="pagination pagination-sm shadow-sm">`;
    const prevDisabled = currentPage === 0 ? "disabled" : "";
    html += `<li class="page-item ${prevDisabled}"><button class="page-link text-primary fw-medium" onclick="loadAllRepaymentsAdmin(${currentPage - 1})">Previous</button></li>`;

    for (let i = 0; i < totalPages; i++) {
        const activeClass = i === currentPage ? "active" : "";
        html += `<li class="page-item ${activeClass}"><button class="page-link" onclick="loadAllRepaymentsAdmin(${i})">${i + 1}</button></li>`;
    }

    const nextDisabled = currentPage === totalPages - 1 ? "disabled" : "";
    html += `<li class="page-item ${nextDisabled}"><button class="page-link text-primary fw-medium" onclick="loadAllRepaymentsAdmin(${currentPage + 1})">Next</button></li>`;
    html += `</ul></nav>`;
    
    container.innerHTML = html;
}

// 3. The Execute Function
function executeAdminOverride(repaymentId, currentPage) {
    const newStatus = document.getElementById(`override-status-${repaymentId}`).value;
    
    if(!confirm(`Are you sure you want to change EMI #${repaymentId} to ${newStatus}?`)) return;

    fetch(`http://localhost:8086/getRepayments/admin/override/${repaymentId}?status=${newStatus}`, {
        method: 'PUT'
    })
    .then(response => {
        if (!response.ok) throw new Error("Override failed");
        return response.json();
    })
    .then(updatedEmi => {
        showNotification(`EMI #${repaymentId} updated to ${newStatus}.`);
        loadAllRepaymentsAdmin(currentPage); 
    })
    .catch(error => {
        showNotification("Security Error: Override blocked.", true);
    });
}
// ==========================================
// ADMIN GLOBAL SEARCH (Server-Side)
// ==========================================
let searchTimeout;

function filterAdminTable() {
    const input = document.getElementById("searchEmiId");
    // Remove the '#' if the user typed it, and trim spaces
    const filterId = input.value.replace('#', '').trim();
    
    // Clear the previous timer
    clearTimeout(searchTimeout);

    // Wait 500ms after the user stops typing before making the API call
    searchTimeout = setTimeout(() => {
        const tbody = document.getElementById("adminTableBody");
        const paginationContainer = document.getElementById('adminPaginationContainer');

        // If the search box is cleared, reload the standard paginated view
        if (filterId === "") {
            loadAllRepaymentsAdmin(0);
            return;
        }

        // Show a loading spinner in the table while searching
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;
        paginationContainer.innerHTML = ""; // Hide pagination during search

        // Fetch the specific EMI ID from the backend
        // UPDATE THIS URL to match your actual backend search endpoint
        fetch(`http://localhost:8086/getRepayments/admin/search/${filterId}`)
            .then(response => {
                if (!response.ok) throw new Error("Record not found");
                return response.json();
            })
            .then(emi => {
                tbody.innerHTML = "";
                
                // If backend returns null or empty
                if (!emi || !emi.repaymentId) {
                    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No records found for EMI #${filterId}.</td></tr>`;
                    return;
                }

                // Render the single found record
                renderSingleAdminRow(tbody, emi);
            })
            .catch(error => {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No matching records found.</td></tr>`;
            });

    }, 500); 
}

// Helper function to keep your code DRY (Don't Repeat Yourself)
function renderSingleAdminRow(tbody, emi) {
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
            <button class="btn btn-sm btn-primary fw-bold" onclick="executeAdminOverride(${emi.repaymentId}, 0)">
                Update
            </button>
        </div>
    `;

    tbody.innerHTML += `
        <tr>
            <td class="ps-4 fw-bold">#${emi.repaymentId}</td>
            <td>App #${appId}</td>
            <td>${emi.dueDate}</td>
            <td>${formatCurrency(emi.amountDue)}</td>
            <td>${badge}</td>
            <td class="text-end pe-4">${actionHtml}</td>
        </tr>
    `;
}

// ==========================================
// 4. STARTUP LOGIC
// ==========================================
// document.addEventListener('DOMContentLoaded', () => {
//     // ONLY load the applications on initial page load!
//     loadUserApplications();
// });

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.custom-navbar');
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
});

// ==========================================
// 4. STARTUP LOGIC
// ==========================================
// ==========================================
// 4. STARTUP LOGIC
// ==========================================
// ==========================================
// 4. STARTUP LOGIC & AUTH STATE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // 1. Authentication & ID Retrieval
    const userId = localStorage.getItem('loggedInUserId');
    const userName = localStorage.getItem('loggedInUserName');
    
    const guestMenu = document.getElementById('guest-menu');
    const userMenu = document.getElementById('user-menu');
    
    if (!userId) {
        // Show Login/Register, hide User profile
        if (guestMenu) guestMenu.classList.remove('d-none');
        if (userMenu) userMenu.classList.add('d-none');

        alert("Secure Area: Please log in to view your repayments.");
        window.location.href = '/Actual/Customer/login.html';
        return; 
    }

    // 2. User IS logged in: Hide Login/Register, show User profile
    if (guestMenu) guestMenu.classList.add('d-none');
    if (userMenu) userMenu.classList.remove('d-none');

    // 3. Update Navbar Profile UI (Fixed selectors to match your HTML)
    if (userName) {
        const profileCircle = document.getElementById('nav-avatar');
        const profileName = document.getElementById('nav-user-name');
        
        if (profileCircle) profileCircle.innerText = userName.charAt(0).toUpperCase();
        if (profileName) profileName.innerText = userName;
    }

    // 4. Load dynamic user data
    loadUserApplications(userId);
});

// ==========================================
// 5. LOGOUT FUNCTIONALITY
// ==========================================
function logoutUser() {
    // Clear all authentication data
    localStorage.removeItem('loggedInUserId');
    localStorage.removeItem('loggedInUserName');
    localStorage.removeItem('userRole');
    
    // Redirect to login page
    window.location.href = '/Actual/Customer/login.html';
}