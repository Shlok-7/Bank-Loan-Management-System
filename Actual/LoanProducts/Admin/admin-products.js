// --- Configuration & State ---
const API_BASE_URL = "http://localhost:8086";
let currentBank = null;
let currentProducts = [];
let addProductModal;
let editProductModal;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modals
    addProductModal = new bootstrap.Modal(document.getElementById('addProductModal'));
    editProductModal = new bootstrap.Modal(document.getElementById('editProductModal'));
    
    // Setup form logic
    setupAddFormValidation();
    setupEditFormValidation();
    
    initializePage();
});

function initializePage() {
    const bankDataStr = sessionStorage.getItem('adminSelectedBankData');
    
    if (!bankDataStr) {
        window.location.href = 'index.html'; 
        return;
    }

    currentBank = JSON.parse(decodeURIComponent(bankDataStr));
    
    // Set Header Info
    document.getElementById('bank-name-display').textContent = currentBank.bankName;
    document.getElementById('bank-location-display').innerHTML = `<i class="bi bi-geo-alt"></i> ${currentBank.location || currentBank.branchAddress}`;
    
    // Back Link target
    document.getElementById('backToBanksLink').href = '../../Bank/Admin/index.html';
    
    // Initial fetch
    fetchProducts();
}

// --- Fetch Logic ---
async function fetchProducts() {
    const tableBody = document.getElementById('product-table-body');
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Loading products...</p></td></tr>`;

    try {
        const response = await fetch(`${API_BASE_URL}/getProductByBankId/${currentBank.bankID}`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        currentProducts = data || [];
        renderProductsTable();
        
    } catch (error) {
        console.error("Error fetching products:", error);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger fw-bold"><i class="bi bi-exclamation-triangle"></i> Failed to load products.</td></tr>`;
    }
}

// --- Formatting Helpers ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

// --- Render Logic ---
function renderProductsTable() {
    const tableBody = document.getElementById('product-table-body');
    tableBody.innerHTML = ''; 

    if (currentProducts.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No products configured for this bank yet. Click 'Add New Product' to get started.</td></tr>`;
        return;
    }

    currentProducts.forEach(product => {
        const productJson = encodeURIComponent(JSON.stringify(product));
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-id">#${product.loanProductID}</td>
            <td class="text-product-name">${product.loanProductName}</td>
            <td>${formatCurrency(product.minAmount)}</td>
            <td>${formatCurrency(product.maxAmount)}</td>
            <td class="text-rate">${product.interestRate}%</td>
            <td>${product.tenure}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" onclick="openEditModal('${productJson}')" title="Edit Product">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteProduct(${product.loanProductID})" title="Delete Product">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// ==========================================
// ADD Product Modal & Validation
// ==========================================
function openAddProductModal() {
    document.getElementById('addLoanForm').reset();
    document.getElementById('submitProductBtn').disabled = true;
    
    document.querySelectorAll('.error-text').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-invalid-custom'));
    
    addProductModal.show();
}

function setupAddFormValidation() {
    const form = document.getElementById('addLoanForm');
    const inputs = form.querySelectorAll('input');
    
    inputs.forEach(input => input.addEventListener('input', () => validateAddFields()));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newProduct = {
            loanProductName: document.getElementById('productName').value.trim(),
            minAmount: parseFloat(document.getElementById('minAmount').value),
            maxAmount: parseFloat(document.getElementById('maxAmount').value),
            interestRate: parseFloat(document.getElementById('interestRate').value),
            tenure: parseInt(document.getElementById('tenure').value)
        };

        try {
            const response = await fetch(`${API_BASE_URL}/addLoanProduct/${currentBank.bankID}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct)
            });

            if (response.ok) {
                addProductModal.hide();
                await fetchProducts(); 
            } else {
                const errorData = await response.text();
                alert("Error adding product: " + errorData);
            }
        } catch (error) {
            console.error("Submit Error:", error);
            alert("Network error occurred.");
        }
    });
}

function validateAddFields() {
    const minAmt = parseFloat(document.getElementById('minAmount').value) || 0;
    const maxAmt = parseFloat(document.getElementById('maxAmount').value) || 0;
    const rate = parseFloat(document.getElementById('interestRate').value) || 0;
    const tenure = parseInt(document.getElementById('tenure').value) || 0;
    const name = document.getElementById('productName').value.trim();
    
    let isValid = validateLogic(minAmt, maxAmt, rate, tenure, name, 'minAmount', 'maxAmount', 'interestRate', 'tenure', 'errAmount', 'errRate', 'errTenure');
    document.getElementById('submitProductBtn').disabled = !isValid;
}

// ==========================================
// EDIT Product Modal & Validation
// ==========================================
function openEditModal(productJsonStr) {
    const product = JSON.parse(decodeURIComponent(productJsonStr));

    // Clear previous errors
    document.querySelectorAll('.error-text').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.edit-input').forEach(el => el.classList.remove('is-invalid-custom'));

    // Populate Form
    document.getElementById('editProductId').value = product.loanProductID;
    document.getElementById('editProductName').value = product.loanProductName;
    document.getElementById('editMinAmount').value = product.minAmount;
    document.getElementById('editMaxAmount').value = product.maxAmount;
    document.getElementById('editInterestRate').value = product.interestRate;
    document.getElementById('editTenure').value = product.tenure;

    // Enable button initially
    document.getElementById('submitEditProductBtn').disabled = false;
    
    editProductModal.show();
}

function setupEditFormValidation() {
    const form = document.getElementById('editLoanForm');
    const inputs = form.querySelectorAll('.edit-input');
    
    inputs.forEach(input => input.addEventListener('input', () => validateEditFields()));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const productId = document.getElementById('editProductId').value;
        const updatedProduct = {
            loanProductName: document.getElementById('editProductName').value.trim(),
            minAmount: parseFloat(document.getElementById('editMinAmount').value),
            maxAmount: parseFloat(document.getElementById('editMaxAmount').value),
            interestRate: parseFloat(document.getElementById('editInterestRate').value),
            tenure: parseInt(document.getElementById('editTenure').value)
        };

        try {
            const response = await fetch(`${API_BASE_URL}/updateLoanProduct/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedProduct)
            });

            if (response.ok) {
                editProductModal.hide();
                await fetchProducts(); 
            } else {
                const errorData = await response.text();
                alert("Error updating product: " + errorData);
            }
        } catch (error) {
            console.error("Update Error:", error);
            alert("Network error occurred.");
        }
    });
}

function validateEditFields() {
    const minAmt = parseFloat(document.getElementById('editMinAmount').value) || 0;
    const maxAmt = parseFloat(document.getElementById('editMaxAmount').value) || 0;
    const rate = parseFloat(document.getElementById('editInterestRate').value) || 0;
    const tenure = parseInt(document.getElementById('editTenure').value) || 0;
    const name = document.getElementById('editProductName').value.trim();
    
    let isValid = validateLogic(minAmt, maxAmt, rate, tenure, name, 'editMinAmount', 'editMaxAmount', 'editInterestRate', 'editTenure', 'errEditAmount', 'errEditRate', 'errEditTenure');
    document.getElementById('submitEditProductBtn').disabled = !isValid;
}

// ==========================================
// DELETE Product Logic
// ==========================================
async function deleteProduct(productId) {
    if (confirm("Are you sure you want to delete this loan product? This action cannot be undone.")) {
        try {
            const response = await fetch(`${API_BASE_URL}/deleteLoanProduct/${productId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchProducts(); 
            } else {
                alert("Failed to delete product. Please try again.");
            }
        } catch (error) {
            console.error("Delete Error:", error);
            alert("Network error occurred while deleting.");
        }
    }
}

// ==========================================
// Helper: Shared Logic for UI Error States
// ==========================================
function validateLogic(minAmt, maxAmt, rate, tenure, name, idMin, idMax, idRate, idTenure, errAmt, errRate, errTen) {
    let isValid = true;

    if (document.getElementById(idTenure).value !== "" && tenure <= 0) {
        showError(idTenure, errTen);
        isValid = false;
    } else clearError(idTenure, errTen);

    if (document.getElementById(idRate).value !== "" && rate <= 0) {
        showError(idRate, errRate);
        isValid = false;
    } else clearError(idRate, errRate);

    if (document.getElementById(idMin).value !== "" && document.getElementById(idMax).value !== "") {
        if (minAmt >= maxAmt) {
            showError(idMax, errAmt);
            isValid = false;
        } else clearError(idMax, errAmt);
    }

    if (name === "" || isNaN(minAmt) || isNaN(maxAmt) || isNaN(rate) || isNaN(tenure)) {
        isValid = false;
    }
    return isValid;
}

function showError(inputId, errorTextId) {
    document.getElementById(inputId).classList.add('is-invalid-custom');
    document.getElementById(errorTextId).style.display = 'block';
}

function clearError(inputId, errorTextId) {
    document.getElementById(inputId).classList.remove('is-invalid-custom');
    document.getElementById(errorTextId).style.display = 'none';
}