package com.BankLoanManagement.repositories;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.BankLoanManagement.entities.Repayments;



@Repository //Extends jpa repo, giving us methods like save(), findById()
//<Repayments, Integer> Specifies repayments as the entity and the Integer as the data type of primary key
public interface RepaymentsRepo extends JpaRepository <Repayments, Integer>{
	
	// Custom Query Method declaration: Spring automatically generates the SQL to find 
	//all Repayments matching the given applicationId.
	
	// Used in: getRepaymentScheduleByAppId()
    List<Repayments> findByLoanApplication_ApplicationId(Integer applicationId);

    // Used in: calculateOutStandingBalance()
    List<Repayments> findByLoanApplication_ApplicationIdAndPaymentStatus(
            Integer applicationId, Repayments.PaymentStatus status);

    // Used in: processPayment() (The Loophole Patch)
    int countByLoanApplication_ApplicationIdAndPaymentStatusAndDueDateBefore(
            Integer applicationId, Repayments.PaymentStatus status, LocalDate dueDate);
    
 // Notice the "In" keyword. This translates to an SQL "WHERE application_id IN (1, 2, 3...)"
    List<Repayments> findByLoanApplication_ApplicationIdInAndPaymentStatus(
            List<Integer> applicationIds, 
            Repayments.PaymentStatus status
    );
    
    Page<Repayments> findByLoanApplication_ApplicationId(Long applicationId, Pageable pageable);
    
    
    

}
