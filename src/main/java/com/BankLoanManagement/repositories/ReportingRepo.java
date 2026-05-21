package com.BankLoanManagement.repositories;

import com.BankLoanManagement.entities.LoanApplication;
import com.BankLoanManagement.entities.Repayments;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReportingRepo extends JpaRepository<LoanApplication, Integer> {

    // =================================================================
    // ==================  ADMIN REPORT 1: LOAN DASHBOARD  =============
    // =================================================================

    @Query("SELECT COUNT(la) FROM LoanApplication la WHERE la.approvalStatus = 'APPROVED'")
    Long countApprovedLoans();

    @Query("SELECT COUNT(la) FROM LoanApplication la WHERE la.approvalStatus = 'PENDING'")
    Long countPendingLoans();

    @Query("SELECT COALESCE(SUM(la.loanAmount), 0) FROM LoanApplication la WHERE la.approvalStatus = 'APPROVED'")
    Double sumTotalAmountDisbursed();

    @Query("SELECT COUNT(DISTINCT la.customer.customerId) FROM LoanApplication la")
    Long countTotalCustomers();

    @Query("SELECT la FROM LoanApplication la " +
           "JOIN FETCH la.customer c " +
           "JOIN FETCH la.bank b " +
           "JOIN FETCH la.loanProduct lp " +
           "ORDER BY la.applicationDate DESC")
    List<LoanApplication> findRecentApplicationsForDashboard();

    // =================================================================
    // ================  ADMIN REPORT 2: REPAYMENT REPORT  =============
    // =================================================================

    @Query("SELECT COALESCE(SUM(r.amountDue), 0) FROM Repayments r")
    BigDecimal sumTotalExpectedRepayments();

    @Query("SELECT COALESCE(SUM(r.amountDue), 0) FROM Repayments r WHERE r.paymentStatus = 'COMPLETED'")
    BigDecimal sumTotalCollectedRepayments();

    @Query("SELECT COUNT(r) FROM Repayments r WHERE r.paymentStatus = 'COMPLETED'")
    Long countCompletedRepayments();

    @Query("SELECT COUNT(r) FROM Repayments r WHERE r.paymentStatus = 'PENDING'")
    Long countPendingRepayments();

    @Query("SELECT r FROM Repayments r " +
           "JOIN FETCH r.loanApplication la " +
           "JOIN FETCH la.customer c " +
           "JOIN FETCH la.bank b " +
           "JOIN FETCH la.loanProduct lp " +
           "ORDER BY r.dueDate ASC")
    List<Repayments> findAllRepaymentsWithFullDetails();

    // =================================================================
    // =============  ADMIN REPORT 3: OUTSTANDING LOAN REPORT  =========
    // =================================================================

    // MODIFIED: Simply fetches all approved loans. Filtering happens in the Service!
    
    @Query("SELECT la FROM LoanApplication la " +
           "JOIN FETCH la.customer c " +
           "JOIN FETCH la.bank b " +
           "JOIN FETCH la.loanProduct lp " +
           "WHERE la.approvalStatus = 'APPROVED'")
    List<LoanApplication> findAllApprovedLoans();

    @Query("SELECT r FROM Repayments r " +
           "WHERE r.loanApplication.applicationId = :applicationId " +
           "AND r.paymentStatus = 'PENDING' " +
           "AND r.dueDate < :today " +
           "ORDER BY r.dueDate ASC")
    List<Repayments> findOverdueRepaymentsByApplicationId(
            @Param("applicationId") Integer applicationId,
            @Param("today") LocalDate today);

    // =================================================================
    // ===============  CUSTOMER REPORT 1: LOAN SUMMARY  ===============
    // =================================================================

    @Query("SELECT COUNT(la) > 0 FROM LoanApplication la WHERE la.customer.customerId = :customerId")
    boolean existsApplicationForCustomer(@Param("customerId") Integer customerId);

    @Query("SELECT COUNT(la) FROM LoanApplication la " +
           "WHERE la.customer.customerId = :customerId AND la.approvalStatus = 'APPROVED'")
    Long countApprovedLoansByCustomer(@Param("customerId") Integer customerId);

    @Query("SELECT la FROM LoanApplication la " +
           "JOIN FETCH la.loanProduct lp " +
           "JOIN FETCH la.bank b " +
           "WHERE la.customer.customerId = :customerId " +
           "ORDER BY la.applicationDate DESC")
    List<LoanApplication> findLoanApplicationsByCustomer(@Param("customerId") Integer customerId);

    @Query("SELECT r.amountDue FROM Repayments r " +
           "JOIN r.loanApplication la " +
           "WHERE la.customer.customerId = :customerId " +
           "AND r.paymentStatus = 'PENDING' " +
           "ORDER BY r.dueDate ASC")
    List<BigDecimal> findNextRepaymentAmountByCustomer(@Param("customerId") Integer customerId);

    @Query("SELECT r.dueDate FROM Repayments r " +
           "JOIN r.loanApplication la " +
           "WHERE la.customer.customerId = :customerId " +
           "AND r.paymentStatus = 'PENDING' " +
           "ORDER BY r.dueDate ASC")
    List<LocalDate> findNextDueDateByCustomer(@Param("customerId") Integer customerId);

    // =================================================================
    // ===========  CUSTOMER REPORT 2: REPAYMENT HISTORY  =============
    // =================================================================

    @Query("SELECT COUNT(r) FROM Repayments r " +
           "JOIN r.loanApplication la " +
           "WHERE la.customer.customerId = :customerId")
    Long countAllRepaymentsByCustomer(@Param("customerId") Integer customerId);

    @Query("SELECT COUNT(r) FROM Repayments r " +
           "JOIN r.loanApplication la " +
           "WHERE la.customer.customerId = :customerId AND r.paymentStatus = 'COMPLETED'")
    Long countCompletedRepaymentsByCustomer(@Param("customerId") Integer customerId);

    @Query("SELECT MAX(r.paymentDate) FROM Repayments r " +
           "JOIN r.loanApplication la " +
           "WHERE la.customer.customerId = :customerId AND r.paymentStatus = 'COMPLETED'")
    Optional<LocalDate> findLatestPaymentDateByCustomer(@Param("customerId") Integer customerId);

    @Query("SELECT MIN(r.dueDate) FROM Repayments r " +
           "JOIN r.loanApplication la " +
           "WHERE la.customer.customerId = :customerId AND r.paymentStatus = 'PENDING'")
    Optional<LocalDate> findNextPaymentDateByCustomer(@Param("customerId") Integer customerId);

    @Query("SELECT r FROM Repayments r " +
           "JOIN FETCH r.loanApplication la " +
           "JOIN FETCH la.loanProduct lp " +
           "WHERE la.customer.customerId = :customerId " +
           "ORDER BY r.dueDate DESC")
    List<Repayments> findRepaymentHistoryByCustomer(@Param("customerId") Integer customerId);

    // =================================================================
    // ===========  CUSTOMER REPORT 3: OUTSTANDING BALANCE  ===========
    // =================================================================

    @Query("SELECT COALESCE(SUM(r.amountDue), 0) FROM Repayments r " +
           "JOIN r.loanApplication la " +
           "WHERE la.customer.customerId = :customerId AND r.paymentStatus = 'PENDING'")
    BigDecimal sumCurrentDueAmountByCustomer(@Param("customerId") Integer customerId);

    @Query("SELECT COALESCE(SUM(r.amountDue), 0) FROM Repayments r " +
           "JOIN r.loanApplication la " +
           "WHERE la.customer.customerId = :customerId " +
           "AND r.paymentStatus = 'PENDING' " +
           "AND r.dueDate < :today")
    BigDecimal sumOverdueBalanceByCustomer(
            @Param("customerId") Integer customerId,
            @Param("today") LocalDate today);

    // ⭐ MODIFIED: Simply fetches all approved loans for customer. Filtering happens in Service!
    @Query("SELECT la FROM LoanApplication la " +
           "JOIN FETCH la.loanProduct lp " +
           "WHERE la.customer.customerId = :customerId " +
           "AND la.approvalStatus = 'APPROVED'")
    List<LoanApplication> findApprovedLoansByCustomer(@Param("customerId") Integer customerId);

    @Query("SELECT MIN(r.dueDate) FROM Repayments r " +
           "WHERE r.loanApplication.applicationId = :applicationId " +
           "AND r.paymentStatus = 'PENDING'")
    Optional<LocalDate> findNextDueDateByApplicationId(@Param("applicationId") Integer applicationId);
}