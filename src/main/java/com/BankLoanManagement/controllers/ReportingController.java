package com.BankLoanManagement.controllers;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.BankLoanManagement.services.ReportingService;

@RestController
@CrossOrigin(origins = "http://127.0.0.1:5500")
public class ReportingController {
	
	// obj declaration 
	private final ReportingService reportingService;
 
    @Autowired
    public ReportingController(ReportingService reportingService) {
        this.reportingService = reportingService;
    }
 
//============================= ADMIN API's ======================================================
    
    //General Admin Dashboard
      @GetMapping("/admin/reports/loans")
    public ResponseEntity<Map<String, Object>> getAdminLoanDashboard() {
        Map<String, Object> report = reportingService.getAdminLoanDashboard();
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
 
    //ADMIN 2: Repayment Report

    @GetMapping("/admin/reports/repayments")
    public ResponseEntity<Map<String, Object>> getAdminRepaymentReport() {
        Map<String, Object> report = reportingService.getAdminRepaymentReport();
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
 
    // ADMIN 3: Outstanding Loan
    
    @GetMapping("/admin/reports/outstanding-loans")
    public ResponseEntity<Map<String, Object>> getAdminOutstandingReport() {
        Map<String, Object> report = reportingService.getAdminOutstandingReport();
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
 
// =========================== CUSTOMER Apis =========================================
 
    // CUSTOMER 1: User Loan 
     
    @GetMapping("/user/{customerId}/reports/loans")
    public ResponseEntity<Map<String, Object>> getCustomerLoanSummary(@PathVariable Integer customerId) {
        Map<String, Object> report = reportingService.getCustomerLoanSummary(customerId);
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
 
    //CUSTOMER 2: User Repayment
    
    @GetMapping("/user/{customerId}/reports/repayments")
    public ResponseEntity<Map<String, Object>> getCustomerRepaymentHistory(@PathVariable Integer customerId) {
        Map<String, Object> report = reportingService.getCustomerRepaymentHistory(customerId);
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
 
    // CUSTOMER 3: User Outstanding
     
    @GetMapping("/user/{customerId}/reports/outstanding-loans")
    public ResponseEntity<Map<String, Object>> getCustomerOutstandingBalance(@PathVariable Integer customerId) {
        Map<String, Object> report = reportingService.getCustomerOutstandingBalance(customerId);
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
}
