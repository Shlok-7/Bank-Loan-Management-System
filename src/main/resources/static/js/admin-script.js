document.addEventListener("DOMContentLoaded", () => {
    
    // 1. SECURITY: Block non-admins from viewing this page
    const role = localStorage.getItem('userRole');
    const userName = localStorage.getItem('loggedInUserName');
    
    if (role !== 'ADMIN') {
        alert("Unauthorized Access. Only Admins can view this page.");
        window.location.href = '/auth/login.html';
        return; 
    }

    document.getElementById('nav-user-name').textContent = userName + ' ▾';
    document.getElementById('nav-avatar').textContent = 'A'; // 'A' for Admin

    // 2. Load Dashboard Data
    loadDashboard();
});

function loadDashboard() {
    fetch('/customers/getAllCustomers')
        .then(response => response.json())
        .then(customers => {
            const verifiedCount = customers.filter(c => c.kycStatus === "VERIFIED").length;
            const pendingCount = customers.filter(c => c.kycStatus === "PENDING").length;

            document.getElementById("verified-count").textContent = verifiedCount;
            document.getElementById("pending-count").textContent = pendingCount;

            const tableBody = document.getElementById("customer-table-body");
            tableBody.innerHTML = ''; 

            customers.forEach((customer, index) => {
                const row = document.createElement("tr");
                row.classList.add("row-animate");
                row.style.animationDelay = `${0.05 * index}s`;

                const isVerified = customer.kycStatus === 'VERIFIED';
                const badgeClass = isVerified ? 'badge-verified' : 'badge-pending';
                
                // If pending, show the Verify button. If verified, show a disabled checked button.
                const actionButton = isVerified 
                    ? `<button class="btn-outline" disabled style="color: var(--success); border-color: var(--success);">✔ Approved</button>`
                    : `<button class="btn-primary" onclick="approveKYC(${customer.customerId})" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Verify KYC</button>`;

                row.innerHTML = `
                    <td>#${customer.customerId}</td>
                    <td style="font-weight: 500;">${customer.name}</td>
                    <td style="color: var(--text-muted);">${customer.email}</td>
                    <td>${customer.phone}</td>
                    <td><span class="badge-status ${badgeClass}" id="status-badge-${customer.customerId}">${customer.kycStatus}</span></td>
                    <td>${actionButton}</td>
                `;
                tableBody.appendChild(row);
            });
        });
}

// 3. The Approval Function (Hits your Spring Boot PUT endpoint)
function approveKYC(customerId) {
    if(confirm("Are you sure you want to approve KYC for Customer #" + customerId + "?")) {
        
        fetch(`/customers/${customerId}/kyc-status?status=VERIFIED`, {
            method: 'PUT'
        })
        .then(response => {
            if(response.ok) {
                alert("KYC Successfully Verified!");
                loadDashboard(); // Reload the table to show the new green badge!
            } else {
                alert("Failed to update KYC status.");
            }
        })
        .catch(error => console.error("Error:", error));
    }
}

function logout() {
    if (confirm("Do you want to logout of the Admin Portal?")) {
        localStorage.clear(); // Wipes all session data
        window.location.replace('/auth/login.html');
    }
}