package com.BankLoanManagement.controllers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.BankLoanManagement.dto.LoginDto;
import com.BankLoanManagement.entities.Customer;
import com.BankLoanManagement.services.CustomerService;

import jakarta.validation.Valid;
 
@CrossOrigin(origins = "*") // Allows your HTML file to communicate with this controller
@RestController 
@RequestMapping("/customers") // setting the base URL path
public class CustomerController {
 
 
    private CustomerService customerService;
 
    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }
 
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> loginCustomer(@RequestBody com.BankLoanManagement.dto.LoginDto loginDto) {
        Map<String, Object> response = new HashMap<>();

        // 1. Hardcoded Admin Check
        if ("admin@nexusbank.com".equals(loginDto.getEmail()) && "admin123".equals(loginDto.getPassword())) {
            response.put("role", "ADMIN");
            response.put("name", "Super Admin");
            return new ResponseEntity<>(response, HttpStatus.OK);
        }

        // 2. Regular Customer Database Check
        Customer loggedInCustomer = customerService.loginCustomer(loginDto.getEmail(), loginDto.getPassword());
        
        response.put("role", "CUSTOMER");
        response.put("customerId", loggedInCustomer.getCustomerId());
        response.put("name", loggedInCustomer.getName());
        
        return new ResponseEntity<>(response, HttpStatus.OK);
    }
  
    // register a new customer
    @PostMapping
    public ResponseEntity<Customer> registerCustomer(@Valid @RequestBody Customer customer) {
            return new ResponseEntity<>(customerService.registerCustomer(customer), HttpStatus.CREATED);
    }
    
    // getAllcustomer
    @GetMapping("/getAllCustomers")
    public ResponseEntity<List<Customer>> getAllCustomers(){
    	List<Customer> listOfCustomers = customerService.getAllCustomers() ;
    	return new ResponseEntity<>(listOfCustomers , HttpStatus.OK) ;
    }
 
    // get customer by ID
    @GetMapping("/{customerId}")
    public ResponseEntity<Customer> getCustomerDetails(@PathVariable Integer customerId) {
     	return new ResponseEntity<>(customerService.getCustomerDetails(customerId), HttpStatus.OK);
    }
    
    // update customer profile details
    @PutMapping("/{customerId}")
    public ResponseEntity<Customer> updateCustomerProfile(@PathVariable Integer customerId, @RequestBody Customer updatedDetails) {
            return new ResponseEntity<>(customerService.updateCustomerProfile(customerId, updatedDetails), HttpStatus.OK);
    }
 
    // fetch the current KYC verification status
    @GetMapping("/{customerId}/kyc-status")
    public ResponseEntity<Customer.KycStatus> getKycStatus(@PathVariable Integer customerId) {
            return new ResponseEntity<>(customerService.getKycStatus(customerId), HttpStatus.OK);
    }
 
    // verify or update the customer's KYC status 4/kyc-status?status=PENDING (ADMIN)
    @PutMapping("/{customerId}/kyc-status")
    public ResponseEntity<Customer> updateKycStatus(
            @PathVariable Integer customerId,
            @RequestParam Customer.KycStatus status) {
            return new ResponseEntity<>(customerService.updateKycStatus(customerId, status), HttpStatus.OK);
 
    }
    
}