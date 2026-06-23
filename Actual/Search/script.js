// Configuration
const API_URL = 'http://localhost:8086/getAllBanks';
const ITEMS_PER_PAGE = 8; 

// State management
let allLoanProducts = [];
let filteredLoanProducts = [];
let currentPage = 1;

// DOM Elements
const statusMessage = document.getElementById('status-message');
const statusText = document.getElementById('status-text');
const loadingSpinner = document.getElementById('loading-spinner');
const retryBtn = document.getElementById('retry-btn');
const tableContainer = document.getElementById('table-container');
const tableBody = document.getElementById('loan-table-body');
const paginationEl = document.getElementById('pagination');
const searchInput = document.getElementById('search-input');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth(); // Check user login state first
    fetchAndRenderData();
    setupSearch();
});

// --- AUTHENTICATION LOGIC ---
function initializeAuth() {
    // Check localStorage for the logged-in user's name
    const userName = localStorage.getItem('loggedInUserName') || localStorage.getItem('userName');
    const guestMenu = document.getElementById('guest-menu');
    const userMenu = document.getElementById('user-menu');
    
    if (userName) {
        // User is logged in: Hide guest buttons, show user profile
        if (guestMenu) {
            guestMenu.classList.add('d-none');
            guestMenu.classList.remove('d-flex');
        }
        if (userMenu) {
            userMenu.classList.remove('d-none');
            userMenu.classList.add('d-flex');
        }
        
        // Update avatar and name
        const navUserName = document.getElementById('nav-user-name');
        const navAvatar = document.getElementById('nav-avatar');
        
        if (navUserName) navUserName.innerText = userName;
        if (navAvatar) navAvatar.innerText = userName.charAt(0).toUpperCase();
    } else {
        // User is a guest: Show guest buttons, hide user profile
        if (guestMenu) {
            guestMenu.classList.remove('d-none');
            guestMenu.classList.add('d-flex');
        }
        if (userMenu) {
            userMenu.classList.add('d-none');
            userMenu.classList.remove('d-flex');
        }
    }
}

function logoutUser() {
    if(confirm("Are you sure you want to log out?")) {
        localStorage.clear();
        window.location.replace('/Actual/Customer/login.html'); 
    }
}
// ----------------------------

async function fetchAndRenderData() {
    showLoading();
    
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const banksData = await response.json();
        processLoanData(banksData);
        
        if (allLoanProducts.length > 0) {
            renderPage(1);
        } else {
            showError("No loan products available at the moment.");
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        showError("Failed to load data. Please ensure backend is running.");
    }
}

// Flattens nested data and structures it for tracking
function processLoanData(banks) {
    allLoanProducts = [];
    banks.forEach(bank => {
        if (bank.loanProducts && bank.loanProducts.length > 0) {
            bank.loanProducts.forEach(product => {
                allLoanProducts.push({
                    productName: product.loanProductName.trim(),
                    bankName: bank.bankName.trim(),
                    location: bank.location.trim()
                });
            });
        }
    });
    // Set initial filtered view to match complete set
    filteredLoanProducts = [...allLoanProducts];
}

// Sets up client-side search filtering
function setupSearch() {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredLoanProducts = [...allLoanProducts];
        } else {
            filteredLoanProducts = allLoanProducts.filter(item => 
                item.productName.toLowerCase().includes(searchTerm) ||
                item.bankName.toLowerCase().includes(searchTerm) ||
                item.location.toLowerCase().includes(searchTerm)
            );
        }
        
        // Always reset to first page on a query filter
        renderPage(1);
    });
}

function renderPage(page) {
    currentPage = page;
    tableBody.innerHTML = '';
    
    if (filteredLoanProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-5 text-muted">
                    <i class="bi bi-exclamation-circle fs-4 d-block mb-2"></i>
                    No matches found for your search query.
                </td>
            </tr>
        `;
        paginationEl.classList.add('d-none');
        showTable();
        return;
    }

    // Pagination bounds calculation
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = filteredLoanProducts.slice(startIndex, endIndex);
    
    // Inject clean text-only metadata structure
    paginatedItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="d-flex align-items-center gap-2fw-semibold text-dark">
                    <i class="bi bi-file-earmark-text text-primary fs-5"></i>
                    ${item.productName}
                </div>
            </td>
            <td>
                <span class="badge bg-light text-dark border px-2.5 py-1.5 font-medium">${item.bankName}</span>
            </td>
            <td>
                <span class="text-secondary"><i class="bi bi-geo-alt text-muted me-1"></i>${item.location}</span>
            </td>
        `;
        tableBody.appendChild(tr);
    });
    
    renderPaginationControls();
    showTable();
}

function renderPaginationControls() {
    paginationEl.innerHTML = '';
    const totalPages = Math.ceil(filteredLoanProducts.length / ITEMS_PER_PAGE);
    
    if (totalPages <= 1) {
        paginationEl.classList.add('d-none');
        return;
    }

    paginationEl.classList.remove('d-none');

    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => renderPage(currentPage - 1);
    paginationEl.appendChild(prevBtn);

    // Dynamic Numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${currentPage === i ? 'active' : ''}`;
        pageBtn.innerText = i;
        pageBtn.onclick = () => renderPage(i);
        paginationEl.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => renderPage(currentPage + 1);
    paginationEl.appendChild(nextBtn);
}

// UI Transition Handlers
function showLoading() {
    statusMessage.classList.remove('d-none');
    loadingSpinner.classList.remove('d-none');
    retryBtn.classList.add('d-none');
    statusText.innerText = "Fetching loan products...";
    statusText.className = "text-muted fw-medium";
    
    tableContainer.classList.add('d-none');
    paginationEl.classList.add('d-none');
}

function showTable() {
    statusMessage.classList.add('d-none');
    tableContainer.classList.remove('d-none');
}

function showError(message) {
    statusMessage.classList.remove('d-none');
    loadingSpinner.classList.add('d-none');
    retryBtn.classList.remove('d-none');
    statusText.innerText = message;
    statusText.className = "text-danger fw-medium mt-3";
    
    tableContainer.classList.add('d-none');
    paginationEl.classList.add('d-none');
}