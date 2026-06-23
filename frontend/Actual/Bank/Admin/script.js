const bankModalElement = document.getElementById('bankModal');
const bankModal = new bootstrap.Modal(bankModalElement);
const bankForm = document.getElementById('bankForm');

// backend url
const url = "http://localhost:8086"
// Master memory state cache data tracking variables
let masterBankData = [];
let currentPage = 1;
const recordsPerPage = 10; 
let isEditMode = false;

// Fetch remote dataset array from Spring Boot application controller mapping
function loadAllBanks() {
    fetch(`${url}/getAllBanks`)
        .then(response => response.json())
        .then(data => {
            masterBankData = data || [];
            
            // Adjust fallback tracking bounds immediately if content list shifts
            const totalPages = Math.ceil(masterBankData.length / recordsPerPage);
            if (currentPage > totalPages && totalPages > 0) {
                currentPage = totalPages;
            }
            populateTable();
        })
        .catch(error => console.error("Error loading all banks:", error));
}

// Table painter runtime engine
function populateTable() {
    const tableBody = document.getElementById("bankTableBody");
    let rows = "";
    
    if (!masterBankData || masterBankData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No registered banks found.</td></tr>`;
        updatePaginationControls(0, 0);
        return;
    }

    // Paginated window math execution bounds
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, masterBankData.length);
    const paginatedItems = masterBankData.slice(startIndex, endIndex);

    paginatedItems.forEach(bank => {
        // Safeguard against string parsing syntax disruptions in template action clicks
        const escapedName = (bank.bankName || "").replace(/'/g, "\\'");
        const escapedCode = (bank.branchCode || "").replace(/'/g, "\\'");
        const escapedLoc = (bank.location || "").replace(/'/g, "\\'");
        const escapedPhone = (bank.contactNumber || "").replace(/'/g, "\\'");
        const escapedAddr = (bank.branchAddress || "").replace(/'/g, "\\'");
        
        // Encode the entire bank object to pass it securely to the next page
        const bankJson = encodeURIComponent(JSON.stringify(bank));

        rows += `
            <tr>
                <td><strong>${bank.bankID}</strong></td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-bank text-primary fs-5"></i>
                        <span class="bank-emphasized">${bank.bankName}</span>
                    </div>
                </td>
                <td><span class="badge badge-branch">${bank.branchCode}</span></td>
                <td><span class="fw-medium"><i class="bi bi-geo-alt text-muted me-1"></i>${bank.location}</span></td>
                <td><span class="text-secondary fw-medium">${bank.contactNumber || 'N/A'}</span></td>
                <td><span class="text-muted small">${bank.branchAddress}</span></td>
                <td class="text-end">
                    <span class="d-flex justify-content-end gap-2">
                        
                        <button class="btn btn-action btn-light-info" title="View Products" onclick="viewProducts('${bankJson}')">
                             Products
                        </button>
                        
                        <button class="btn btn-action btn-light-secondary" title="Edit Bank" onclick="openEditModal(this, '${bank.bankID}', '${escapedName}', '${escapedCode}', '${escapedLoc}', '${escapedPhone}', '${escapedAddr}')">
                            Edit
                        </button>
                        
                        <button class="btn btn-action btn-light-danger" title="Delete Bank" data-id="${bank.bankID}" onclick="deleteRow(this)">
                            Delete
                        </button>
                    </span>
                </td>
            </tr>`;
    });

    tableBody.innerHTML = rows;
    updatePaginationControls(startIndex, endIndex);
}

// --- NEW FUNCTION: Redirect to Products Page ---
function viewProducts(bankJsonStr) {
    // Save the selected bank data to session storage so the products page can read the ID
    sessionStorage.setItem('adminSelectedBankData', bankJsonStr);
    
    // Redirect to the admin products page (assuming it is in the same folder)
    window.location.href='../../LoanProducts/Admin/admin-products.html'; 
}

// Generate lower structural navigation links dynamically
function updatePaginationControls(start, end) {
    const totalPages = Math.ceil(masterBankData.length / recordsPerPage);
    const infoText = document.getElementById('paginationInfo');
    const controlsContainer = document.getElementById('paginationControls');

    infoText.innerText = masterBankData.length > 0 
        ? `Showing ${start + 1} to ${end} of ${masterBankData.length} entries`
        : `Showing 0 to 0 of 0 entries`;

    controlsContainer.innerHTML = "";

    if (totalPages <= 1) return; 

    // Previous Link Arrow Button
    controlsContainer.innerHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(event, ${currentPage - 1})"><i class="bi bi-chevron-left"></i></a>
        </li>
    `;

    // Numeric Page Series mapping loops
    for (let i = 1; i <= totalPages; i++) {
        controlsContainer.innerHTML += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(event, ${i})">${i}</a>
            </li>
        `;
    }

    // Next Link Arrow Button
    controlsContainer.innerHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(event, ${currentPage + 1})"><i class="bi bi-chevron-right"></i></a>
        </li>
    `;
}

function changePage(event, pageNumber) {
    if (event) event.preventDefault();
    currentPage = pageNumber;
    populateTable();
}

/* --- NEW VALIDATION ARCHITECTURE --- */
const inputsToValidate = bankForm.querySelectorAll('.form-control-modern');
inputsToValidate.forEach(input => {
    input.addEventListener('input', function() {
        if (input.checkValidity()) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
        }
    });
});

function clearValidationStyles() {
    inputsToValidate.forEach(input => {
        input.classList.remove('is-invalid', 'is-valid');
    });
}
            
// Unified payload compilation form tracker logic
bankForm.addEventListener('submit', function(e) {
    e.preventDefault();

    if (!bankForm.checkValidity()) {
        e.stopPropagation();
        inputsToValidate.forEach(input => {
            if (!input.checkValidity()) {
                input.classList.add('is-invalid');
            }
        });
        return; 
    }
    
    const bankPayload = {
        bankID: bankForm.querySelector('[name="bankID"]').value, 
        bankName: bankForm.querySelector('[name="bankName"]').value,
        branchCode: bankForm.querySelector('[name="branchCode"]').value,
        location: bankForm.querySelector('[name="location"]').value,
        contactNumber: bankForm.querySelector('[name="contactNumber"]').value,
        branchAddress: bankForm.querySelector('[name="branchAddress"]').value
    };
    
    const bankId = bankForm.querySelector('[name="bankID"]').value;
    const targetUrl = isEditMode ? `${url}/updateBank/${bankId}` : `${url}/addBank`;
    const targetMethod = isEditMode ? 'PUT' : 'POST';

    fetch(targetUrl, {
        method: targetMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankPayload)
    })
    .then(response => {
        if (!response.ok) throw new Error('Transaction tracking processing fault intercepted.');
        return response.json();
    })
    .then(data => {
        bankForm.reset();
        bankModal.hide();
        
        if (!isEditMode) {
            currentPage = 1; 
        }
        loadAllBanks(); 
    })
    .catch(error => {
        console.error("Submission failed:", error);
        alert("Failed to submit and save data profile mapping schema.");
    });
});

// Safe row entity deletion handler pipeline
function deleteRow(btn) {
    const bankId = btn.getAttribute('data-id');
    if (!bankId) {
        alert("Error: Bank execution ID configuration key context mapping missing.");
        return;
    }
    if (confirm("Are you certain you want to remove this operational bank asset?")) {
        fetch(`${url}/deleteBank/${bankId}`, { method: 'DELETE' })
        .then(response => {
            return response.text().then(message => {
                if (!response.ok) throw new Error(message || 'Deletion validation criteria rejected.');
                return message;
            });
        })
        .then(data => {
            masterBankData = masterBankData.filter(item => String(item.bankID) !== String(bankId));
            
            const totalPages = Math.ceil(masterBankData.length / recordsPerPage);
            if (currentPage > totalPages && totalPages > 0) {
                currentPage = totalPages;
            }
            loadAllBanks(); 
        })
        .catch(error => {
            console.error('Error during deletion:', error);
            alert(error);
        });
    }
}

// Open Modal initialization setup configuration bindings
document.getElementById('openAddModalBtn').addEventListener('click', function() {
    isEditMode = false;
    bankForm.reset();
    
    bankForm.querySelector('[name="bankID"]').disabled = false; 
    document.getElementById('modalTitle').innerHTML = '<i class="bi bi-plus-square"></i> Enter Bank Details';
    document.getElementById('submitModalBtn').textContent = "Add New Bank Entity";
    
    bankModal.show();
});

// Populate targeted data model definitions back into input forms cleanly
function openEditModal(btn, id, name, code, location, phone, address) {
    isEditMode = true;
    
    document.getElementById('modalTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Update Bank Details';
    document.getElementById('submitModalBtn').textContent = "Save Changes";
    
    bankForm.querySelector('[name="bankID"]').value = id;
    bankForm.querySelector('[name="bankID"]').disabled = true; 
    bankForm.querySelector('[name="bankName"]').value = name;
    bankForm.querySelector('[name="branchCode"]').value = code;
    bankForm.querySelector('[name="location"]').value = location;
    bankForm.querySelector('[name="contactNumber"]').value = phone;
    bankForm.querySelector('[name="branchAddress"]').value = address;

    bankModal.show();
}

// Automated bootstrap trigger sequence initialization map setup execution logic
loadAllBanks();

/* ==========================================
   Navbar & Authentication Functionality
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    initializeNavbar();
});

function initializeNavbar() {
    const storedUserName = localStorage.getItem('userName'); 
    const displayName = storedUserName ? storedUserName : 'Admin ';
    
    const avatarElement = document.getElementById('nav-avatar');
    if (avatarElement) {
        avatarElement.textContent = displayName.charAt(0).toUpperCase();
    }
    
    const nameElement = document.getElementById('nav-user-name');
    if (nameElement) {
        nameElement.textContent = `${displayName} ▾`;
    }
}

window.logout = function() {
    if (confirm("Are you sure you want to securely log out?")) {
        localStorage.removeItem('userName');
        localStorage.removeItem('authToken'); 
        localStorage.clear(); 
        
        window.location.href = '../../Customer/login.html';
    }
};