package com.BankLoanManagement.controllers;
 
import com.BankLoanManagement.entities.LoanApplication;
import com.BankLoanManagement.services.LoanApplicationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
 
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/loan-applications")
public class LoanApplicationController {
 
    @Autowired
    private LoanApplicationService service;
 
    // --- CUSTOMER ENDPOINTS ---[cite: 2]
 
    @PostMapping("/apply")
    public ResponseEntity<LoanApplication> apply(@RequestBody LoanApplication app) {
    	System.out.println("Received ID from Postman: " + app.getApplicationId());
        return ResponseEntity.ok(service.applyForLoan(app));
    }

 
    @GetMapping("/customer/{customerId}")
    public ResponseEntity<Page<LoanApplication>> getByCustomer(@PathVariable Integer customerId, Pageable pageable) {
        return ResponseEntity.ok(service.getApplicationsByCustomer(customerId,pageable));
    }
 
  
    @GetMapping("/status/{applicationId}")
    public ResponseEntity<String> getStatus(@PathVariable Integer applicationId) {
        // This calls your service method which handles the Enum-to-String conversion safely
        String status = service.getApplicationStatus(applicationId); 
        return ResponseEntity.ok(status);
    }
 
    @DeleteMapping("/cancel/{applicationId}")
    public ResponseEntity<String> cancel(@PathVariable Integer applicationId) {
        service.cancelApplication(applicationId);
        return ResponseEntity.ok("Application cancelled successfully.");
    }
 
    // --- ADMIN ENDPOINTS ---[cite: 2]
 
    @GetMapping("/admin/pending")
    public ResponseEntity<List<LoanApplication>> getPending() {
        return ResponseEntity.ok(service.getPendingApplications());
    }

    // to approve the application of loan.
    @PutMapping("/admin/review/{applicationId}")
    public ResponseEntity<LoanApplication> review(@PathVariable Integer applicationId, @RequestParam String action) {
        if ("APPROVE".equalsIgnoreCase(action)) {
            return ResponseEntity.ok(service.approveLoan(applicationId));
        }
        // Logic for REJECTED can be added similarly
        return ResponseEntity.badRequest().build();
    }
 
    @GetMapping("/admin/{applicationId}")
    public ResponseEntity<LoanApplication> getDetails(@PathVariable Integer applicationId) {
        // We already have logic in Service to find by ID
        LoanApplication details = service.getAllApplications().stream()
                .filter(a -> a.getApplicationId().equals(applicationId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Application not found"));
        return ResponseEntity.ok(details);
    }
 
    @GetMapping("/admin/all")
    public ResponseEntity<List<LoanApplication>> getAll() {
        return ResponseEntity.ok(service.getAllApplications());
    }
}