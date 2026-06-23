document.addEventListener("DOMContentLoaded", () => {
    // 1. SECURITY: Block non-admins from viewing this page
    const role = localStorage.getItem('userRole');
    const userName = localStorage.getItem('loggedInUserName');
    
    if (role !== 'ADMIN') {
        alert("Unauthorized Access. Only Admins can view this page.");
        window.location.href = '../login.html';
        return; 
    }

    document.getElementById('nav-user-name').textContent = userName + ' ▾';
    document.getElementById('nav-avatar').textContent = 'A'; // 'A' for Admin

    // 2. Load Dashboard Data (Starts at Page 0)
    loadDashboard(0);
});

// ==========================================
// DATA LOADING & PAGINATION
// ==========================================

function loadDashboard(page = 0) {
    // NOTE: Ensure your backend endpoint is updated to accept ?page=X&size=Y
    // It must return a Spring Page object containing { content: [], totalPages: X, number: Y }
    fetch(`http://localhost:8086/customers/paginated?page=${page}&size=10`)
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch paginated data");
            return response.json();
        })
        .then(pageData => {
            // Extract data from Spring Boot's Page object
            const customers = pageData.content;
            const currentPage = pageData.number;
            const totalPages = pageData.totalPages;

            // Stats calculation (Note: This only calculates stats for the CURRENT page)
            const verifiedCount = customers.filter(c => c.kycStatus === "VERIFIED").length;
            const pendingCount = customers.filter(c => c.kycStatus === "PENDING").length;
            document.getElementById("verified-count").textContent = verifiedCount;
            document.getElementById("pending-count").textContent = pendingCount;

            const tableBody = document.getElementById("customer-table-body");
            tableBody.innerHTML = ''; 

            if (customers.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: gray;">No customers found.</td></tr>`;
                document.getElementById('customer-pagination-container').innerHTML = '';
                return;
            }

            customers.forEach((customer, index) => {
                const row = document.createElement("tr");
                row.classList.add("row-animate");
                row.style.animationDelay = `${0.05 * index}s`;

                const isVerified = customer.kycStatus === 'VERIFIED';
                const badgeClass = isVerified ? 'badge-verified' : 'badge-pending';
                
                // Pass the currentPage to the approveKYC function so we don't lose our place
                const actionButton = isVerified 
                    ? `<button class="btn-outline" disabled style="color: var(--success); border-color: var(--success); padding: 0.4rem 0.8rem;">✔ Approved</button>`
                    : `<button class="btn-primary" onclick="approveKYC(${customer.customerId}, ${currentPage})" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; cursor:pointer;">Verify KYC</button>`;

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

            // Render the page buttons
            renderPagination(currentPage, totalPages);
        })
        .catch(error => {
            console.error("Dashboard Load Error:", error);
            document.getElementById("customer-table-body").innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Failed to load data. Ensure backend is running.</td></tr>`;
        });
}

function renderPagination(currentPage, totalPages) {
    const container = document.getElementById('customer-pagination-container');
    if (!container) return;
    
    if (totalPages <= 1) { 
        container.innerHTML = ""; 
        return; 
    }

    let html = `<div style="display: flex; gap: 8px;">`;
    
    // Previous Button
    const prevDisabled = currentPage === 0 ? "disabled" : "";
    const prevOp = currentPage === 0 ? "opacity: 0.5; cursor: not-allowed;" : "cursor: pointer;";
    html += `<button class="btn-outline" ${prevDisabled} style="padding: 0.4rem 0.8rem; ${prevOp}" onclick="loadDashboard(${currentPage - 1})">Previous</button>`;

    // Page Numbers
    for (let i = 0; i < totalPages; i++) {
        // Simple styling to highlight the active page
        const activeStyle = i === currentPage 
            ? "background-color: var(--primary, #007bff); color: white; border-color: var(--primary, #007bff);" 
            : "cursor: pointer;";
            
        html += `<button class="btn-outline" style="padding: 0.4rem 0.8rem; ${activeStyle}" onclick="loadDashboard(${i})">${i + 1}</button>`;
    }

    // Next Button
    const nextDisabled = currentPage === totalPages - 1 ? "disabled" : "";
    const nextOp = currentPage === totalPages - 1 ? "opacity: 0.5; cursor: not-allowed;" : "cursor: pointer;";
    html += `<button class="btn-outline" ${nextDisabled} style="padding: 0.4rem 0.8rem; ${nextOp}" onclick="loadDashboard(${currentPage + 1})">Next</button>`;
    
    html += `</div>`;
    container.innerHTML = html;
}

// ==========================================
// ACTIONS
// ==========================================

// 3. The Approval Function (Notice we added 'currentPage' parameter)
async function approveKYC(customerId, currentPage) {
    if (confirm(`Are you sure you want to approve KYC for Customer #${customerId}?`)) {
        try {
            const response = await fetch(`http://localhost:8086/customers/${customerId}/kyc-status?status=VERIFIED`, {
                method: 'PUT',
            });

            if (response.ok) {
                alert("KYC Successfully Verified!");
                loadDashboard(currentPage); // Reloads the EXACT page you were on!
            } else {
                const errorText = await response.text();
                console.error(`HTTP Error: ${response.status} - ${errorText}`);
                alert(`Failed to update KYC status. Status Code: ${response.status}`);
            }
        } catch (error) {
            console.error("Network Error:", error);
            alert("A network error occurred. Check the console for details.");
        }
    }
}

function logout() {
    if (confirm("Do you want to logout of the Admin Portal?")) {
        localStorage.clear();
        window.location.replace('../login.html');
    }
}