package com.BankLoanManagement.controllers;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.BankLoanManagement.services.ReportingService;

@RestController
public class ReportingController {
	// Single service for all reporting - injected via constructor
    private final ReportingService reportingService;
 
    /**
     * Constructor injection - Spring provides the ReportingService automatically.
     * This matches the style used by RepaymentsController in this project.
     *
     * @param reportingService - the service that processes all report logic
     */
    @Autowired
    public ReportingController(ReportingService reportingService) {
        this.reportingService = reportingService;
    }
 
    // =================================================================
    // ==================  ADMIN ENDPOINTS  ============================
    // =================================================================
    
    /**
     * ADMIN ENDPOINT 1: General Admin Loan Dashboard
     *
     * URL: GET http://localhost:8091/admin/reports/loans
     *
     * Purpose: Give the admin a high-level overview of the entire loan system.
     *
     * Response JSON contains:
     * {
     *   "totalActiveLoans": 4,
     *   "pendingApplications": 2,
     *   "approvedApplications": 4,
     *   "totalAmountDisbursed": 3500000.00,
     *   "totalOutstandingBalance": 3060000.00,
     *   "totalCustomers": 5,
     *   "recentCustomerPortfolio": [
     *       { "applicationId": 123, "customerName": "Rahul", "bankName": "SBI",
     *         "productType": "Home Loan", "requestedAmount": 500000.0,
     *         "approvedAmount": 500000.0, "kycStatus": "VERIFIED",
     *         "applicationStatus": "APPROVED", "loanApprovalDate": "2024-01-20" }
     *   ]
     * }
     *
     * HTTP Status: 200 OK on success
     */
    @GetMapping("/admin/reports/loans")
    public ResponseEntity<Map<String, Object>> getAdminLoanDashboard() {
        Map<String, Object> report = reportingService.getAdminLoanDashboard();
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
 
    /**
     * ADMIN ENDPOINT 2: Repayment Report
     *
     * URL: GET http://localhost:8091/admin/reports/repayments
     *
     * Purpose: Track all EMI payment records across all loans in the system.
     *
     * Response JSON contains:
     * {
     *   "totalExpectedRepayments": 500000.00,
     *   "totalCollectedRepayment": 280000.00,
     *   "numberOfCompletedRepayments": 18,
     *   "numberOfPendingRepayments": 22,
     *   "detailedRepaymentPerformance": [
     *       { "repaymentId": 1, "customerName": "Priya", "applicationId": 456,
     *         "bankName": "HDFC", "productType": "Personal Loan",
     *         "emiAmount": 9500.00, "amountDue": 9500.00,
     *         "paymentDate": "2024-03-15", "dueDate": "2024-03-20",
     *         "paymentStatus": "COMPLETED" }
     *   ]
     * }
     *
     * HTTP Status: 200 OK on success
     */
    @GetMapping("/admin/reports/repayments")
    public ResponseEntity<Map<String, Object>> getAdminRepaymentReport() {
        Map<String, Object> report = reportingService.getAdminRepaymentReport();
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
 
    /**
     * ADMIN ENDPOINT 3: Outstanding Loan Report
     *
     * URL: GET http://localhost:8091/admin/reports/outstanding-loans
     *
     * Purpose: Monitor loans with remaining balances and flag overdue payments.
     *
     * Response JSON contains:
     * {
     *   "totalOutstandingBalance": 3060000.00,
     *   "countOfOverdueLoans": 3,
     *   "largestOutstandingAmount": 2200000.00,
     *   "averageOutstandingBalance": 765000.00,
     *   "detailedOutstandingPortfolio": [
     *       { "customerName": "Rahul", "customerId": 1, "applicationId": 123,
     *         "bankName": "SBI", "productType": "Home Loan",
     *         "originalLoanAmount": 2500000.0, "outstandingBalance": 2200000.0,
     *         "interestRate": 8.75, "daysOverdue": 31, "loanStatus": "APPROVED" }
     *   ]
     * }
     *
     * HTTP Status: 200 OK on success
     */
    @GetMapping("/admin/reports/outstanding-loans")
    public ResponseEntity<Map<String, Object>> getAdminOutstandingReport() {
        Map<String, Object> report = reportingService.getAdminOutstandingReport();
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
 
    // =================================================================
    // ==================  CUSTOMER ENDPOINTS  =========================
    // =================================================================
 
    /**
     * CUSTOMER ENDPOINT 1: User Loan Summary
     *
     * URL: GET http://localhost:8091/user/{customerId}/reports/loans
     * Example: GET http://localhost:8091/user/1/reports/loans
     *
     * Purpose: Give a specific customer an overview of all their loans.
     *
     * Path Variable: customerId - the customer's ID (Integer, must exist in DB)
     *
     * Response JSON contains:
     * {
     *   "totalActiveLoans": 2,
     *   "totalApprovedAmount": 700000.0,
     *   "remainingPrincipal": 550000.0,
     *   "nextRepaymentAmount": 9500.00,
     *   "loanDetails": [
     *       { "applicationId": 123, "loanProduct": "Home Loan",
     *         "totalAmount": 500000.0, "interestRate": 8.75,
     *         "emiAmount": 550000.0, "loanTenure": 240,
     *         "nextDueDate": "2024-06-20", "loanStatus": "APPROVED" }
     *   ]
     * }
     *
     * HTTP Status: 200 OK on success, 404 if customer not found
     */
    @GetMapping("/user/{customerId}/reports/loans")
    public ResponseEntity<Map<String, Object>> getCustomerLoanSummary(
            @PathVariable Integer customerId) {
        Map<String, Object> report = reportingService.getCustomerLoanSummary(customerId);
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
 
    /**
     * CUSTOMER ENDPOINT 2: User Repayment History
     *
     * URL: GET http://localhost:8091/user/{customerId}/reports/repayments
     * Example: GET http://localhost:8091/user/1/reports/repayments
     *
     * Purpose: Show a specific customer their complete EMI payment history.
     *
     * Path Variable: customerId - the customer's ID
     *
     * Response JSON contains:
     * {
     *   "totalPaymentsMade": 24,
     *   "numberOfCompletedPayments": 5,
     *   "latestPaymentDate": "2024-05-15",
     *   "nextPaymentDate": "2024-06-20",
     *   "detailedRepaymentLog": [
     *       { "repaymentId": 1, "loanProduct": "Personal Loan",
     *         "dueDate": "2024-05-20", "amountDue": 9500.00,
     *         "paymentDate": "2024-05-18", "paymentStatus": "COMPLETED" }
     *   ]
     * }
     *
     * HTTP Status: 200 OK on success, 404 if customer not found
     */
    @GetMapping("/user/{customerId}/reports/repayments")
    public ResponseEntity<Map<String, Object>> getCustomerRepaymentHistory(
            @PathVariable Integer customerId) {
        Map<String, Object> report = reportingService.getCustomerRepaymentHistory(customerId);
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
 
    /**
     * CUSTOMER ENDPOINT 3: User Outstanding Balance
     *
     * URL: GET http://localhost:8091/user/{customerId}/reports/outstanding-loans
     * Example: GET http://localhost:8091/user/1/reports/outstanding-loans
     *
     * Purpose: Show a specific customer how much they still owe and what is overdue.
     *
     * Path Variable: customerId - the customer's ID
     *
     * Response JSON contains:
     * {
     *   "totalOutstandingBalance": 550000.0,
     *   "currentDueAmount": 9500.00,
     *   "overdueBalance": 9500.00,
     *   "outstandingBalanceDetails": [
     *       { "applicationId": 123, "principalAmount": 500000.0,
     *         "remainingBalance": 550000.0, "outstandingAmount": 550000.0,
     *         "daysOverdue": 15, "nextDueDate": "2024-06-20",
     *         "loanStatus": "APPROVED" }
     *   ]
     * }
     *
     * HTTP Status: 200 OK on success, 404 if customer not found
     */
    @GetMapping("/user/{customerId}/reports/outstanding-loans")
    public ResponseEntity<Map<String, Object>> getCustomerOutstandingBalance(
            @PathVariable Integer customerId) {
        Map<String, Object> report = reportingService.getCustomerOutstandingBalance(customerId);
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
}
