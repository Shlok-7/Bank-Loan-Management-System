package com.BankLoanManagement.controllers;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.BankLoanManagement.entities.Repayments;
import com.BankLoanManagement.services.RepaymentsService;



@RestController //Tells spring that this class receives the web requests and automatically converts the returned java data into json
@RequestMapping("/getRepayments")//Sets the base URL path. Every endpoint in this file will 
								//	automatically start with "http://localhost:8091/getRepayments".

public class RepaymentsController {

		private RepaymentsService repaymentService;
		
		@Autowired
		public RepaymentsController(RepaymentsService repaymentService) {
			this.repaymentService = repaymentService;
		}
		
		//STARTING TO WRITE ENDPOINTS
		@GetMapping("/{applicationId}")
		public ResponseEntity<List<Repayments>> getRepaymentSchedule(@PathVariable Integer applicationId){
			return new ResponseEntity<>(repaymentService.getRepaymentSchedule(applicationId),HttpStatus.OK);
		}
		
		@GetMapping("/balance/{applicationId}")
		public ResponseEntity<BigDecimal> getOutstandingBalance(@PathVariable Integer applicationId){
			return new ResponseEntity<>(repaymentService.calculateOutStandingBalance(applicationId),HttpStatus.OK);
		}
		
		@PostMapping("/pay/{repaymentId}")
		public ResponseEntity<Repayments> processPayment(@PathVariable Integer repaymentId){
			try {
				return new ResponseEntity<>(repaymentService.processPayment(repaymentId),HttpStatus.OK);
			} catch(RuntimeException e) {
				e.printStackTrace();
				return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
			}
		}
		//// Spring Annotation: Listens for HTTP POST requests targeting "/getRepayments/generate". This is the hidden endpoint meant for Module 3 to call.
		@PostMapping("/generate")
		public ResponseEntity<List<Repayments>> triggerScheduleGeneration(
				@RequestParam Integer applicationId,
				@RequestParam BigDecimal principal,
				@RequestParam double interestRate,
				@RequestParam int tenure){
			
			return new ResponseEntity<>(repaymentService.getRepaymentSchedule(applicationId),HttpStatus.OK);
		}
		
		//put mapping for god mode
		@PutMapping("/admin/override/{repaymentId}")
		public ResponseEntity<?> overrideRepaymentStatus(
				@PathVariable Integer repaymentId,
				@RequestParam("status") String status){
			
			Repayments.PaymentStatus newStatus = Repayments.PaymentStatus.valueOf(status.toUpperCase());
			Repayments updatedEmi = repaymentService.manualStatusOverride(repaymentId, newStatus);
			
			return ResponseEntity.ok(updatedEmi);
		}
		
		//TRYING TO HELP RISHI
	    @PostMapping("/reports/outstanding-balances")
	    public ResponseEntity<Map<Integer, BigDecimal>> getBalancesForReport(@RequestBody List<Integer> applicationIds) {
	        
	        Map<Integer, BigDecimal> report = repaymentService.generateBulkOutstandingBalanceReport(applicationIds);
	        
	        return ResponseEntity.ok(report);
	    }
		
		
}
