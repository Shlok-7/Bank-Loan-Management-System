const BASE_URL = 'http://localhost:8086/loan-applications';

// ==========================================
// Initialization & Auth Setup
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Auth Check (Admin Restricted)
    // Adjusting to check for either generic 'userName' or specific 'loggedInUserName'
    const userName = localStorage.getItem('loggedInUserName') || localStorage.getItem('userName');
    
    if (!userName) {
        alert("Secure Area: Please log in with Administrative credentials.");
        window.location.href = '/Actual/Customer/login.html'; // Assuming this is your login route
        return;
    }

    // 2. Initialize Navbar Profile
    initializeNavbar();

    // 3. Load master table on boot
    const isAdminPage = document.getElementById('adminTable');
    if (isAdminPage) {
        fetchAdminApplications('/admin/all');
    }
});

// Dynamic Navbar Profile Update
function initializeNavbar() {
    const storedUserName = localStorage.getItem('loggedInUserName') || localStorage.getItem('userName'); 
    const displayName = storedUserName ? storedUserName : 'Admin User';
    
    const avatarElement = document.getElementById('nav-avatar');
    if (avatarElement) {
        avatarElement.textContent = displayName.charAt(0).toUpperCase();
    }
    
    const nameElement = document.getElementById('nav-user-name');
    if (nameElement) {
        nameElement.textContent = `${displayName} ▾`;
    }
}

// Admin Logout
function logout() {
    if(confirm("Are you sure you want to securely log out?")) {
        localStorage.clear();
        window.location.replace('/Actual/Customer/login.html'); 
    }
}

// Badge Helper
function getStatusBadge(status) {
    const s = String(status).toUpperCase().trim();
    if (s === 'APPROVED' || s === 'APPROVE') return `<span class="badge bg-success bg-opacity-10 text-success px-3 py-1 rounded-pill"><i class="bi bi-check-circle-fill me-1"></i>Approved</span>`;
    if (s === 'REJECTED' || s === 'REJECT') return `<span class="badge bg-danger bg-opacity-10 text-danger px-3 py-1 rounded-pill"><i class="bi bi-x-circle-fill me-1"></i>Rejected</span>`;
    return `<span class="badge bg-warning bg-opacity-10 text-warning px-3 py-1 rounded-pill"><i class="bi bi-hourglass-split me-1"></i>Pending</span>`;
}

// ==========================================
// 5. GET: Inspect Single Application (Formatted UI)
// ==========================================
async function fetchSingleDetails() {
    const appId = document.getElementById('searchAppId').value.trim();
    const resBox = document.getElementById('detailsResult');
    if (!appId) return alert('Enter an Application ID');

    try {
        const response = await fetch(`${BASE_URL}/admin/${appId}`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (resBox) {
                resBox.style.display = 'block';
                // Transform JSON into a beautiful read-only card
                resBox.innerHTML = `
                    <div class="bg-light p-3 rounded-3 border">
                        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                            <h6 class="fw-bold mb-0 text-dark">Snapshot Profile</h6>
                            ${getStatusBadge(data.approvalStatus)}
                        </div>
                        <div class="row g-3">
                            <div class="col-6">
                                <span class="text-muted small text-uppercase fw-semibold d-block">App Reference</span>
                                <span class="fs-6 fw-bold text-primary">#${data.applicationId}</span>
                            </div>
                            <div class="col-6">
                                <span class="text-muted small text-uppercase fw-semibold d-block">Customer ID</span>
                                <span class="fs-6 fw-bold text-dark">#${data.customer?.customerId || 'N/A'}</span>
                            </div>
                            <div class="col-6">
                                <span class="text-muted small text-uppercase fw-semibold d-block">Loan Amount</span>
                                <span class="fs-6 fw-bold text-dark">₹${data.loanAmount ? data.loanAmount.toLocaleString() : '0'}</span>
                            </div>
                            <div class="col-6">
                                <span class="text-muted small text-uppercase fw-semibold d-block">Product ID</span>
                                <span class="fs-6 fw-bold text-dark">#${data.loanProduct?.loanProductID || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            renderAdminTable([data]); 
            
        } else {
            if (resBox) {
                resBox.style.display = 'block';
                resBox.innerHTML = `
                    <div class="alert alert-danger d-flex align-items-center mb-0 p-3" role="alert">
                        <i class="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
                        <div>
                            <h6 class="alert-heading fw-bold mb-1">Entity Not Found</h6>
                            <span class="small">No matching records found for ID #${appId}</span>
                        </div>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error("Error fetching single application item: ", err);
        alert('Could not sync with individual backend lookups.');
    }
}

// ==========================================
// 6. GET: Admin Master Lists
// ==========================================
async function fetchAdminApplications(subUrl) {
    // Visual toggle for buttons
    const btns = document.querySelectorAll('.btn-sm');
    btns.forEach(b => {
        if(b.innerText.includes(subUrl.includes('pending') ? 'Pending' : 'All')) {
            b.classList.remove('btn-outline-secondary');
            b.classList.add('btn-dark');
        } else {
            b.classList.add('btn-outline-secondary');
            b.classList.remove('btn-dark');
        }
    });

    try {
        const response = await fetch(`${BASE_URL}${subUrl}`);
        if (response.ok) {
            const list = await response.json();
            renderAdminTable(list);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderAdminTable(list) {
    const tbody = document.querySelector('#adminTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-5">No matching applications inside this context index log.</td></tr>`;
    } else {
        list.forEach(app => {
            tbody.innerHTML += `
                <tr>
                    <td class="ps-4"><span class="fw-bold text-primary">#${app.applicationId}</span></td>
                    <td><span class="badge bg-light text-dark border px-2 py-1">Cust #${app.customer?.customerId || 'N/A'}</span></td>
                    <td class="fw-medium">₹${app.loanAmount ? app.loanAmount.toLocaleString() : '0'}</td>
                    <td class="text-end pe-4">${getStatusBadge(app.approvalStatus)}</td>
                </tr>`;
        });
    }
    const wrapper = document.getElementById('adminTableWrapper');
    if (wrapper) wrapper.style.display = 'block';
}

// ==========================================
// 7. PUT: Process Decision Logic
// ==========================================
async function processDecision(actionType) {
    const appIdInput = document.getElementById("decisionAppId");
    if (!appIdInput) return;
    
    const appId = appIdInput.value.trim();
    if (!appId) {
        alert("Please enter a valid Application ID first.");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/admin/review/${appId}?action=${actionType}`, {
            method: 'PUT'
        });

        const modalTargetId = document.getElementById('modalTargetId');
        const modalIcon = document.getElementById('modalIcon');
        const modalBodyText = document.getElementById('modalBodyText');

        if (modalTargetId) modalTargetId.innerText = `#${appId}`;

        if (response.ok) {
            if (actionType === 'APPROVE') {
                if (modalIcon) modalIcon.innerHTML = '<i class="bi bi-check-circle-fill text-success" style="font-size: 3.5rem;"></i>';
                if (modalBodyText) modalBodyText.innerText = "Loan Application has been successfully Approved and logged into records system layers.";
            } else {
                if (modalIcon) modalIcon.innerHTML = '<i class="bi bi-x-circle-fill text-danger" style="font-size: 3.5rem;"></i>';
                if (modalBodyText) modalBodyText.innerText = "Loan Application signature block has been successfully Rejected.";
            }
            
            appIdInput.value = "";
            fetchAdminApplications('/admin/all'); 
            
            // If the searched item was this one, update the UI dynamically
            if(document.getElementById('searchAppId').value == appId) {
                fetchSingleDetails();
            }
            
        } else {
            if (modalIcon) modalIcon.innerHTML = '<i class="bi bi-exclamation-triangle-fill text-warning" style="font-size: 3.5rem;"></i>';
            if (modalBodyText) modalBodyText.innerText = "Failed to update record state. Check if application ID exists or is already processed.";
        }

        if (typeof bootstrap !== 'undefined') {
            const popupElement = document.getElementById('decisionPopUp');
            if (popupElement) {
                const bsModal = new bootstrap.Modal(popupElement);
                bsModal.show();
            }
        } else {
            alert(`Application #${appId} was processed successfully as ${actionType}.`);
            fetchAdminApplications('/admin/all');
        }

    } catch (err) {
        console.error("Communication error across gateway interfaces: ", err);
        alert("Could not link with administrative processing endpoints.");
    }
}