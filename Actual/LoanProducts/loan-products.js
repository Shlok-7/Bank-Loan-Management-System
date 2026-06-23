let currentBank = null;
let loanApplyModal = null;
const BASE_URL = 'http://localhost:8086/loan-applications'; // Updated to match the new API structure

// ==========================================
// Initialization & Auth Setup
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const userName = localStorage.getItem('loggedInUserName');
    const userId = localStorage.getItem('loggedInUserId');
    
    if (!userName && !userId) {
        alert("Please log in to view loan products.");
        window.location.href = '/Actual/Customer/login.html';
        return;
    }

    // Setup Navbar UI
    const guestMenu = document.getElementById('guest-menu');
    const userMenu = document.getElementById('user-menu');
    if (userName) {
        guestMenu.classList.add('d-none');
        guestMenu.classList.remove('d-flex');
        userMenu.classList.remove('d-none');
        document.getElementById('nav-user-name').innerText = userName;
        document.getElementById('nav-avatar').innerText = userName.charAt(0).toUpperCase();
    }

    // Retrieve Bank Data
    const bankDataStr = sessionStorage.getItem('selectedBankData');
    if (!bankDataStr) {
        window.location.href = '/Actual/Bank/Customer/index.html';
        return;
    }
    
    currentBank = JSON.parse(decodeURIComponent(bankDataStr));

    // Initialize Modal
    loanApplyModal = new bootstrap.Modal(document.getElementById('loanApplicationModal'), {
        keyboard: false
    });

    renderProductTable();
});

function goBackToBanks() {
    window.location.href = '/Actual/Bank/Customer/index.html'; 
}

// ==========================================
// Table Rendering
// ==========================================
function renderProductTable() {
    document.getElementById('headerBankName').innerText = currentBank.bankName;
    document.getElementById('headerBankLocation').innerHTML = `<i class="bi bi-geo-alt"></i> ${currentBank.branchAddress}`;

    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';

    if(currentBank.loanProducts && currentBank.loanProducts.length > 0) {
        currentBank.loanProducts.forEach(p => {
            const productJson = encodeURIComponent(JSON.stringify(p));
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold ps-4" style="color: var(--accent-blue);">${p.loanProductName}</td>
                <td>₹${p.minAmount ? p.minAmount.toLocaleString() : '0'}</td>
                <td>₹${p.maxAmount ? p.maxAmount.toLocaleString() : '0'}</td>
                <td class="fw-bold" style="color: var(--success);">${p.interestRate}%</td>
                <td>${p.tenure}</td>
                <td class="text-end pe-4">
                    <button class="btn-apply-dark shadow-sm" onclick="openApplicationModal('${productJson}')">
                        Apply Now
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } else {
         tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5">No products available for this bank currently.</td></tr>`;
    }
}

// ==========================================
// Application Modal Operations
// ==========================================
function openApplicationModal(productJsonStr) {
    const p = JSON.parse(decodeURIComponent(productJsonStr));
    
    // Reset Views
    document.getElementById('applyForm').reset();
    document.getElementById('modalFormStage').style.display = 'block';
    document.getElementById('modalSuccessStage').classList.add('d-none');
    
    // 1. Populate Hidden Payload Data
    document.getElementById('bankMailId').value = currentBank.bankID || currentBank.id;
    document.getElementById('prodMailId').value = p.loanProductID || p.id;
    
    // 2. Populate Read-Only Visual Data
    document.getElementById('prodNameDisplay').value = p.loanProductName;
    document.getElementById('prodRateDisplay').value = `${p.interestRate}%`;
    document.getElementById('prodTenureDisplay').value = p.tenure;
    
    // 3. Populate User Data & Fetch Dynamic KYC
    const loggedInId = localStorage.getItem('loggedInUserId');
    const loggedInName = localStorage.getItem('loggedInUserName');
    
    if (loggedInId) {
        document.getElementById('custMailId').value = loggedInId;
        
        // --> TRIGGER KYC FETCH HERE <--
        fetchKycStatus(loggedInId);
    } else {
        // Clear the KYC container if no user ID is present to prevent stale data
        const kycContainer = document.getElementById('kycStatusContainer');
        if (kycContainer) kycContainer.innerHTML = '';
    }
    
    if (loggedInName) {
        document.getElementById('modalUserName').innerText = loggedInName;
    }

    // 4. Reset Button State
    const btn = document.getElementById('submitBtnElement');
    btn.innerHTML = '<i class="bi bi-file-earmark-check me-2"></i>Confirm & Submit Application';
    btn.disabled = false;
    
    loanApplyModal.show();
}

async function submitApplication() {
    const custField = document.getElementById('custMailId');
    const bankField = document.getElementById('bankMailId');
    const prodField = document.getElementById('prodMailId');
    const amtField = document.getElementById('loanAmt');

    if (!amtField.value || amtField.value <= 0) {
        alert('Please enter a valid requested loan amount.');
        return;
    }

    const payload = {
        customer: { customerId: parseInt(custField.value) },
        bank: { bankID: parseInt(bankField.value) },
        loanProduct: { loanProductID: parseInt(prodField.value) },
        loanAmount: parseFloat(amtField.value)
    };

    // Trigger Loader UI
    const btn = document.getElementById('submitBtnElement');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing Application...';
    btn.disabled = true;

    try {
        const response = await fetch(`${BASE_URL}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('generatedIdDisplay').innerText = `#${data.applicationId || Math.floor(Math.random() * 1000000)}`;
            
            // Swap to success view
            document.getElementById('modalFormStage').style.display = 'none';
            document.getElementById('modalSuccessStage').classList.remove('d-none');
        } else {
            alert('Submission failed. Please verify your details or try again later.');
            btn.innerHTML = '<i class="bi bi-file-earmark-check me-2"></i>Confirm & Submit Application';
            btn.disabled = false;
        }
    } catch (err) {
        console.error('Error during fetch:', err);
        alert('Could not connect to the backend server.');
        btn.innerHTML = '<i class="bi bi-file-earmark-check me-2"></i>Confirm & Submit Application';
        btn.disabled = false;
    }
}
// Fetch and render KYC Status
async function fetchKycStatus(customerId) {
    const kycContainer = document.getElementById('kycStatusContainer');
    
    // Show a loading state while fetching
    kycContainer.innerHTML = `
        <span class="badge bg-secondary bg-opacity-10 text-secondary px-3 py-2 rounded-pill border border-secondary border-opacity-25 d-flex align-items-center gap-2">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Fetching KYC...
        </span>`;

    try {
        const response = await fetch(`http://localhost:8086/customers/${customerId}/kyc-status`);
        
        if (response.ok) {
            // Read as text and clean up quotes/whitespace in case it's a raw string or boolean
            const status = (await response.text()).replace(/["'{}]/g, '').toUpperCase().trim();

            if (status === 'VERIFIED' || status === 'TRUE' || status === 'APPROVED') {
                kycContainer.innerHTML = `
                    <span class="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill border border-success border-opacity-25 d-flex align-items-center gap-1">
                        <span class="spinner-grow spinner-grow-sm text-success" style="width: 0.4rem; height: 0.4rem;"></span>
                        <i class="bi bi-patch-check-fill ms-1"></i> KYC VERIFIED
                    </span>`;
            } else if (status === 'PENDING') {
                kycContainer.innerHTML = `
                    <span class="badge bg-warning bg-opacity-10 text-warning px-3 py-2 rounded-pill border border-warning border-opacity-25 d-flex align-items-center gap-1">
                        <i class="bi bi-hourglass-split ms-1"></i> KYC PENDING
                    </span>`;
            } else {
                kycContainer.innerHTML = `
                    <span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill border border-danger border-opacity-25 d-flex align-items-center gap-1">
                        <i class="bi bi-x-circle-fill ms-1"></i> KYC ${status}
                    </span>`;
            }
        } else {
            kycContainer.innerHTML = `
                <span class="badge bg-secondary bg-opacity-10 text-secondary px-3 py-2 rounded-pill border border-secondary border-opacity-25 d-flex align-items-center gap-1">
                    <i class="bi bi-question-circle-fill ms-1"></i> KYC UNKNOWN
                </span>`;
        }
    } catch (error) {
        console.error("Error fetching KYC status:", error);
        kycContainer.innerHTML = `
            <span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill border border-danger border-opacity-25 d-flex align-items-center gap-1">
                <i class="bi bi-exclamation-triangle-fill ms-1"></i> API ERROR
            </span>`;
    }
}

function redirectToDashboard() {
    window.location.href = "/Actual/LoanApplications/User/dashboard.html";
}

function logoutUser() {
    if(confirm("Are you sure you want to log out?")) {
        localStorage.clear();
        window.location.replace('/Actual/Customer/login.html'); 
    }
}