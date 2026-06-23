
let masterBankList = [];
let currentPage = 1;
const recordsPerPage = 9;
let currentBank = null; // Stores currently selected bank
let loanApplyModal = null; // Bootstrap Modal instance

// Backend URLs
const API_BASE_URL = "http://localhost:8086";
const LOAN_APP_API_URL = "http://localhost:8086"; 

// ==========================================
// Initialization Lifecycle
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    loadAllBanks();
    loanApplyModal = new bootstrap.Modal(document.getElementById('loanApplicationModal'), {
        keyboard: false
    });
});

// Event Listeners for Search
document.getElementById('searchBtn').addEventListener('click', executeSearch);
document.getElementById('bankSearch').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') executeSearch();
});

// ==========================================
// View Toggle Controllers & Auth Check
// ==========================================
function showProductsView(bankStr) {
    // 1. AUTHENTICATION CHECK
    const isLoggedIn = localStorage.getItem('loggedInUserName') || localStorage.getItem('loggedInUserId');
    
    if (!isLoggedIn) {
        alert("Please log in to view loan products.");
        window.location.href = '/Actual/Customer/login.html';
        return; 
    }

    // 2. Pass data and navigate
    // Store the stringified bank object in session storage so the next page can read it
    sessionStorage.setItem('selectedBankData', bankStr);
    
    // Redirect to the new dedicated loan products page
    window.location.href = '/Actual/LoanProducts/loan-products.html';
}

// You can delete  openApplicationModal(), and submitApplication() from this file.

// ==========================================
// Core Render Dynamic Grid Engine
// ==========================================
function populateGrid(banks) {
    const gridContainer = document.getElementById("bankGrid");
    const noResults = document.getElementById('noResults');
    const paginationWrapper = document.getElementById('paginationWrapper');
    
    gridContainer.innerHTML = "";

    if (!banks || banks.length === 0) {
        noResults.classList.remove('d-none');
        paginationWrapper.classList.add('d-none');
        return;
    }

    noResults.classList.add('d-none');
    paginationWrapper.classList.remove('d-none');

    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, banks.length);
    const activePageSlice = banks.slice(startIndex, endIndex);

    activePageSlice.forEach(bank => {
        const bankDataStr = encodeURIComponent(JSON.stringify(bank));
        
        gridContainer.innerHTML += `
        <div class="col-md-6 col-lg-4">
            <div class="bank-card p-4 border rounded shadow-sm bg-white h-100 d-flex flex-column">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center justify-content-between mb-4">
                        <div class="bank-logo-icon bg-light rounded-circle p-2 text-primary">
                            <i class="bi bi-bank fs-4"></i>
                        </div>
                        <span class="badge bg-primary text-white px-2 py-1 rounded text-xs fw-bold">Branch: ${bank.branchCode || 'N/A'}</span>
                    </div>
                    <h4 class="bank-title mb-3 fw-bold">${bank.bankName}</h4>
                    
                    <div class="mb-3">
                        <div class="info-label text-muted small fw-semibold text-uppercase">Location / Hub</div>
                        <div class="info-value"><i class="bi bi-geo-alt text-secondary me-1"></i> ${bank.location}</div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="info-label text-muted small fw-semibold text-uppercase">Contact Line</div>
                        <div class="info-value">
                            <a href="tel:${bank.contactNumber}" class="text-decoration-none text-dark">
                                <i class="bi bi-telephone text-secondary me-1"></i> ${bank.contactNumber || 'N/A'}
                            </a>
                        </div>
                    </div>

                    <div class="mb-4">
                        <div class="info-label text-muted small fw-semibold text-uppercase">Operating Address</div>
                        <div class="info-value text-muted small">${bank.branchAddress}</div>
                    </div>
                </div>

                <button class="btn btn-primary text-white w-100 py-2 fw-semibold loan-btn mt-auto" onclick="showProductsView('${bankDataStr}')">
                    <i class="bi bi-wallet2 me-1"></i> View Loans
                </button>
            </div>
        </div>`;
    });

    updatePaginationControls(banks, startIndex, endIndex);
}

function updatePaginationControls(banks, start, end) {
    const totalPages = Math.ceil(banks.length / recordsPerPage);
    const infoText = document.getElementById('paginationInfo');
    const controlsContainer = document.getElementById('paginationControls');

    infoText.innerText = banks.length > 0 
        ? `Showing ${start + 1} to ${end} of ${banks.length} entries`
        : `Showing 0 to 0 of 0 entries`;

    controlsContainer.innerHTML = "";

    if (totalPages <= 1) return;

    controlsContainer.innerHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(event, ${currentPage - 1})"><i class="bi bi-chevron-left"></i></a>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        controlsContainer.innerHTML += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(event, ${i})">${i}</a>
            </li>
        `;
    }

    controlsContainer.innerHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(event, ${currentPage + 1})"><i class="bi bi-chevron-right"></i></a>
        </li>
    `;
}

function changePage(event, pageNumber) {
    event.preventDefault();
    currentPage = pageNumber;
    populateGrid(masterBankList);
    
    const targetElement = document.getElementById('bankSearch');
    if(targetElement) {
        window.scrollTo({ top: targetElement.offsetTop - 40, behavior: 'smooth' });
    }
}





function redirectToDashboard() {
    window.location.href = "dashboard.html";
}

// ==========================================
// Network Fetch Operations
// ==========================================
function loadAllBanks() {
    fetch(`${API_BASE_URL}/getAllBanks`)
        .then(response => response.json())
        .then(data => {
            masterBankList = data;
            currentPage = 1;
            populateGrid(masterBankList);
        })
        .catch(error => {
            console.error("Error loading all banks:", error);
            populateGrid([]);
        });
}

function executeSearch() {
    const queryValue = document.getElementById('bankSearch').value.trim();

    if (!queryValue) {
        loadAllBanks();
        return;
    }

    fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(queryValue)}`)
        .then(response => {
            if (!response.ok) throw new Error('Search request failed');
            return response.json();
        })
        .then(data => {
            masterBankList = data; 
            currentPage = 1;       
            populateGrid(masterBankList);
        })
        .catch(error => console.error("Error executing search:", error));
}