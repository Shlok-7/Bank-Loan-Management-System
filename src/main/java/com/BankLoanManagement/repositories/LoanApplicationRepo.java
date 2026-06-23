package com.BankLoanManagement.repositories;
 
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
 
import com.BankLoanManagement.entities.LoanApplication;
 
@Repository
public interface LoanApplicationRepo extends JpaRepository<LoanApplication, Integer> {
 
	// Generates a dynamic query to find all loan applications belonging to a specific customer.
	// The underscore (_) tells Spring to navigate inside the nested 'Customer' entity
	// and filter by its 'customerId' property.
	// SQL Equivalent: SELECT * FROM loan_application WHERE customer_id = ?
	Page<LoanApplication> findByCustomer_CustomerId(Integer customerId, Pageable pageable);
    
	// Generates a dynamic query to filter loan applications by their workflow state (PENDING, APPROVED, REJECTED).
	// Used heavily for admin dashboards to fetch loans that need review.
	// SQL Equivalent: SELECT * FROM loan_application WHERE approval_status = ?
	List<LoanApplication> findByApprovalStatus(LoanApplication.ApprovalStatus status);
 
	// --- NEW METHOD FOR ACTIVE LOAN CHECK ---
	// Generates a boolean check to see if a customer already has an active loan of a specific type.
	// Uses nested property navigation for both Customer ID and Loan Product ID.
	// SQL Equivalent: SELECT COUNT(*) > 0 FROM loan_application WHERE customer_id = ? AND loan_product_id = ? AND approval_status = 'APPROVED'
	boolean existsByCustomer_CustomerIdAndLoanProduct_LoanProductIDAndApprovalStatus(
		Integer customerId,
		Integer loanProductId,
		LoanApplication.ApprovalStatus status
	);
	
	
}