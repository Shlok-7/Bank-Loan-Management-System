const BASE_URL = 'http://localhost:8086/loan-applications';

// ==========================================
// Initialization & Authentication Lifecycle
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. AUTHENTICATION CHECK
    const userName = localStorage.getItem('loggedInUserName');
    const userId = localStorage.getItem('loggedInUserId');
    const isLoggedIn = userName || userId;
    
    if (!isLoggedIn) {
        alert("Please log in to view your dashboard workspace.");
        window.location.href = '/Actual/Customer/login.html';
        return; 
    }

    // 2. Setup Navbar Auth UI
    const guestMenu = document.getElementById('guest-menu');
    const userMenu = document.getElementById('user-menu');
    if (userName) {
        guestMenu.classList.add('d-none');
        guestMenu.classList.remove('d-flex');
        userMenu.classList.remove('d-none');
        document.getElementById('nav-user-name').innerText = userName;
        document.getElementById('nav-avatar').innerText = userName.charAt(0).toUpperCase();
    }
    
    // 3. Auto-fill customer ID if available for quick fetch UX
    if (userId) {
        const histInput = document.getElementById('historyCustId');
        if(histInput) histInput.value = userId;
    }
});

// ==========================================
// User Actions
// ==========================================
function logoutUser() {
    if(confirm("Are you sure you want to log out?")) {
        localStorage.clear();
        window.location.replace('/Actual/Customer/login.html'); 
    }
}

function getStatusBadge(status) {
    const s = String(status).toUpperCase().trim();
    if (s === 'APPROVED' || s === 'APPROVE') return `<span class="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill"><i class="bi bi-check-circle-fill me-1"></i>Approved</span>`;
    if (s === 'REJECTED' || s === 'REJECT') return `<span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill"><i class="bi bi-x-circle-fill me-1"></i>Rejected</span>`;
    return `<span class="badge bg-warning bg-opacity-10 text-warning px-3 py-2 rounded-pill"><i class="bi bi-hourglass-split me-1"></i>Pending</span>`;
}

async function checkLoanStatus() {
    const appId = document.getElementById('statusAppId').value;
    const resBox = document.getElementById('statusResult');
    if (!appId) return alert('Enter an Application ID');

    try {
        const response = await fetch(`${BASE_URL}/status/${appId}`);
        resBox.style.display = 'block';
        if (response.ok) {
            const textStatus = await response.text();
            resBox.innerHTML = `<strong>Status Snapshot:</strong> <div class="mt-2">${getStatusBadge(textStatus)}</div>`;
        } else {
            resBox.innerHTML = `<span class="text-danger fw-semibold"><i class="bi bi-exclamation-triangle"></i> Application not found.</span>`;
        }
    } catch (err) {
        console.error(err);
        alert('Backend network exception encountered.');
    }
}

async function fetchCustomerHistory() {
    const custId = document.getElementById('historyCustId').value;
    if (!custId) return alert('Please input a valid Customer ID reference.');

    try {
        const response = await fetch(`${BASE_URL}/customer/${custId}`);
        if (response.ok) {
            let responseData = await response.json();
            
            // 1. Debugging: Log the exact response to your console so you can see its structure
            console.log("Backend Response:", responseData); 

            // 2. THE FIX: Ensure we are working with an Array
            let historyList = [];
            if (Array.isArray(responseData)) {
                historyList = responseData; // It's already an array
            } else if (responseData && typeof responseData === 'object') {
                // If the backend wraps the array in an object, try to extract it
                // Adjust ".data" or ".content" based on what your console.log shows!
                historyList = responseData.data || responseData.content || responseData.loanDetails || [responseData];
            }

            const tbody = document.querySelector('#customerTable tbody');
            tbody.innerHTML = '';

            // 3. Safe array operations
            if (!historyList || historyList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-5">No portfolio metrics on record for Customer #${custId}</td></tr>`;
            } else {
                historyList.forEach(app => {
                    // Added a fallback for loanAmount using optional chaining (?.) just in case
                    const amount = app.loanAmount ? app.loanAmount.toLocaleString() : '0';
                    
                    tbody.innerHTML += `
                        <tr class="align-middle">
                            <td class="ps-4"><span class="fw-bold text-primary">#${app.applicationId || 'N/A'}</span></td>
                            <td class="fw-medium">₹${amount}</td>
                            <td class="text-end pe-4">${getStatusBadge(app.approvalStatus || app.loanStatus)}</td>
                        </tr>`;
                });
            }
            document.getElementById('customerTableWrapper').style.display = 'block';
        } else {
             alert(`HTTP Error: ${response.status}`);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to fetch records from the server.');
    }
}

async function cancelApplication() {
    const appIdInput = document.getElementById('cancelAppId');
    const appId = appIdInput.value;
    if (!appId) return alert('Provide an explicit Application ID parameter.');

    if (!confirm(`Are you absolutely sure you want to request cancellation for application reference #${appId}?`)) return;

    try {
        const response = await fetch(`${BASE_URL}/cancel/${appId}`, { method: 'DELETE' });
        if (response.ok) {
            alert(`Application #${appId} successfully dropped from records context.`);
            appIdInput.value = '';
            if (document.getElementById('historyCustId').value) fetchCustomerHistory();
        } else {
            alert('Failed to drop application. It may not exist or has already been fully processed.');
        }
    } catch (err) {
        console.error(err);
        alert('Network error encountered while trying to cancel the application.');
    }
}