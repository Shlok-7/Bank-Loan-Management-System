package com.BankLoanManagement.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.BankLoanManagement.entities.LoanApplication;

@Repository
public interface LoanApplicationRepo extends JpaRepository<LoanApplication, Integer> {
 
	// Note the underscore! It means "Look at the Customer object, then find its CustomerId"
	List<LoanApplication> findByCustomer_CustomerId(Integer customerId);
 
    // Must match Entity field 'approvalStatus' and use the Enum type
    List<LoanApplication> findByApprovalStatus(LoanApplication.ApprovalStatus status);
}