package com.BankLoanManagement.services;
 
import com.BankLoanManagement.entities.Customer;
import com.BankLoanManagement.entities.LoanApplication;
import com.BankLoanManagement.entities.LoanApplication.ApprovalStatus;
import com.BankLoanManagement.entities.LoanProducts;
import com.BankLoanManagement.repositories.LoanApplicationRepo;
import com.BankLoanManagement.services.LoanApplicationService;
import com.BankLoanManagement.services.RepaymentsService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.Random;
 
/**
* Service Implementation for Module 3: Loan Application Management.
* This class acts as the 'Conductor' of the loan process.
*/
@Service
public class LoanApplicationService {
 
    @Autowired
    private LoanApplicationRepo repository;
 
    	@Autowired
    private RepaymentsService repaymentService;
    	
    	@Autowired
    	 private CustomerService customerService;
    	 
    	@Autowired
    	private LoanProductsService loanProductService; 
    /**
     * Logic: Submit a new Loan Application
     * 1. Generates a unique 6-digit Application ID (Not auto-incremented).
     * 2. Sets the default status to 'PENDING'.
     * 3. Records the current server date as the application date.
     */
    
    	public LoanApplication applyForLoan(LoanApplication app) {
        	
        	
        	// 1. KYC Handshake (Module 3 -> Module 1)
        	// app.getCustomer().getCustomerId() extracts the number "50"
        	// customerService takes that "50", looks up the full profile in the database, and finds the KYC status
            //  Customer.KycStatus, it means KycStatus is an Inner Enum defined inside the Customer class.
            Customer.KycStatus status = customerService.getKycStatus(app.getCustomer().getCustomerId());
            if (status != Customer.KycStatus.VERIFIED) {
                throw new RuntimeException("KYC not verified.");
            }
         
            
            
            // 2. Amount Range Handshake (Module 3 -> Module 2)
            // Fetch the product details using the ID sent in the request
            LoanProducts product = loanProductService.getLoanProductById(app.getLoanProduct().getLoanProductID());
            double requestedAmount = app.getLoanAmount();
            if (requestedAmount < product.getMinAmount() || requestedAmount > product.getMaxAmount()) {
                throw new RuntimeException("Invalid Amount: For this product, amount must be between "
                                            + product.getMinAmount() + " and " + product.getMaxAmount());
            }
            
            
            
            
            
         // Fetch the IDs from the incoming application object
            Integer customerId = app.getCustomer().getCustomerId();
            Integer productId = app.getLoanProduct().getLoanProductID();
         // NEW RULE: Check for an existing active loan of the same type
         // 3. Smart Duplication Check: Show specific error messages based on status
     
            boolean hasPendingLoan = repository.existsByCustomer_CustomerIdAndLoanProduct_LoanProductIDAndApprovalStatus(
                    customerId,
                    productId,
                    ApprovalStatus.PENDING
                );
                if (hasPendingLoan) {
                    throw new RuntimeException("Application Denied: You already have a pending loan application of this type.");
                }
     
                // Check 3B: Cross-Module Repayments Check for APPROVED loans
                Page<LoanApplication> previousApplications = repository.findByCustomer_CustomerId(customerId,org.springframework.data.domain.Pageable.unpaged());
                
                for (LoanApplication existingApp : previousApplications) {
                    // Look specifically for APPROVED applications matching this loan product type
                    if (existingApp.getLoanProduct().getLoanProductID().equals(productId)
                            && existingApp.getApprovalStatus() == ApprovalStatus.APPROVED) {
                        
                        try {
                            // LIVE HANDSHAKE: Ask RepaymentsService for the remaining balance
                            java.math.BigDecimal outstandingBalance = repaymentService.calculateOutStandingBalance(existingApp.getApplicationId());
                            
                            // If they owe anything greater than 0.00, block them from getting another loan of this type
                            if (outstandingBalance.compareTo(java.math.BigDecimal.ZERO) > 0) {
                                throw new RuntimeException("You already have an active loan of this type. Please clear your current loan repayments first.");
                            }
                        } catch (com.BankLoanManagement.exceptions.ResourceNotFoundException e) {
                            // If no repayment records exist yet for an approved loan, treat it as active/unpaid
                            throw new RuntimeException("You already have an active loan of this type. Please clear your current loan repayments first.");
                        }
                    }
                }
            
                
                
            // 3. Logic: Generate ID and Save if all rules pass [cite: 67]
            int randomId = new Random().nextInt(900000) + 100000;
            app.setApplicationId(randomId);
            app.setApplicationDate(LocalDate.now());
            app.setApprovalStatus(ApprovalStatus.PENDING);
         
            return repository.save(app);
        }
    /**
     * Logic: Admin Approval Process (The Handshake)
     * 1. Validates that the application exists and is currently PENDING.
     * 2. Updates the status to APPROVED.
     * 3. Triggers the flow for Module 4 (Repayment) to generate EMI schedules.
     */
   
    public LoanApplication approveLoan(Integer applicationId) {
    	LoanApplication app = repository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Error: Application ID " + applicationId + " not found."));
 
        // Validation: Only PENDING applications can be approved
        if (app.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new RuntimeException("Validation Error: Only PENDING applications can be approved.");
        }
 
        // Capture the state changes
        app.setApprovalStatus(ApprovalStatus.APPROVED);
        app.setApprovalDate(LocalDate.now()); // Sets the current system date
        
        // Persist the changes to MySQL
        LoanApplication updatedApp = repository.save(app);
 
        // Handshake with Repayments Module (Module 4)
        repaymentService.getRepaymentSchedule(updatedApp);
        
        return updatedApp;
    }
 
    /**
     * Logic: Admin Rejection
     * Updates the status to REJECTED for a given application ID.
     */
    
    public LoanApplication rejectLoan(Integer applicationId) {
        LoanApplication app = repository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Error: Application not found."));
        app.setApprovalStatus(ApprovalStatus.REJECTED);
        return repository.save(app);
    }
 
    /**
     * Retrieves all loan applications submitted by a specific customer ID.
     */
    
    public Page<LoanApplication> getApplicationsByCustomer(Integer customerId, Pageable pageable) {
        return repository.findByCustomer_CustomerId(customerId,pageable);
    }
 
    /**
     * Filters and returns only applications with a 'PENDING' status for the Admin dashboard.
     */

    
    public List<LoanApplication> getPendingApplications() {
        return repository.findByApprovalStatus(ApprovalStatus.PENDING);
    }
 
    /**
     * Returns the current approval status as a String.
     */
    
    public String getApplicationStatus(Integer applicationId) {
        LoanApplication app = repository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Error: Application not found."));
        return app.getApprovalStatus().toString();
    }
 
    /**
     * Logic: Application Cancellation
     * Customers can only cancel their application if the Admin has not processed it yet.
     */
    
    public void cancelApplication(Integer applicationId) {
        LoanApplication app = repository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Error: Application not found."));
        // Check if the application is still in PENDING state
        if (app.getApprovalStatus() == ApprovalStatus.PENDING) {
            repository.delete(app);
        } else {
            throw new RuntimeException("Security Error: Cannot cancel an application that is already processed.");
        }
    }
 
    /**
     * Returns the complete list of all loan applications in the system.
     */
    
    public List<LoanApplication> getAllApplications() {
        return repository.findAll();
    }
}