package com.BankLoanManagement.services;
 
import org.springframework.stereotype.Service;

import com.BankLoanManagement.entities.Customer;
import com.BankLoanManagement.exceptions.ResourceNotFoundException;
import com.BankLoanManagement.repositories.CustomerRepo;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
 
@Service
public class CustomerService {
	

	private CustomerRepo customerRepo;
	private PasswordEncoder passwordEncoder; // Add this
 
	public CustomerService(CustomerRepo customerRepo, PasswordEncoder passwordEncoder) {
		this.customerRepo = customerRepo;
		this.passwordEncoder = passwordEncoder;
	}
	
	// 1. Register Customer (Updated with BCrypt)
		public Customer registerCustomer(Customer customer) {
			if (customerRepo.existsByEmail(customer.getEmail())) {
				throw new ResourceNotFoundException("Customer email already exists");
			}
			
			if (customerRepo.existsByPhone(customer.getPhone())) {
				throw new ResourceNotFoundException("Customer phone number is already registered.");
			}
			
	        // ENCRYPT THE PASSWORD BEFORE SAVING
	        String encodedPassword = passwordEncoder.encode(customer.getPassword());
	        customer.setPassword(encodedPassword);
	        
			customer.setKycStatus(Customer.KycStatus.PENDING);
			return customerRepo.save(customer);
		}
		
	    // 2. Login Customer (Updated with BCrypt matching)
		public Customer loginCustomer(String email, String rawPassword) {
			Customer customer = customerRepo.findByEmail(email).orElseThrow(() -> 
			    new ResourceNotFoundException("No account found with this email."));
			
			// USE .matches() TO COMPARE THE RAW TEXT WITH THE ENCRYPTED DATABASE HASH
			if (!passwordEncoder.matches(rawPassword, customer.getPassword())) {
				throw new ResourceNotFoundException("Incorrect password. Please try again.");
			}
			
			return customer;
		}
	
	
	// get all customers
	public List<Customer> getAllCustomers(){
		List<Customer> listOfAllCustomers = customerRepo.findAll() ;
		return listOfAllCustomers ;	
	}
	
	
	// get customer by ID
	public Customer getCustomerDetails(Integer customerId) {
		// Searching the database for the customer
		return customerRepo.findById(customerId).orElseThrow(() ->
		    new ResourceNotFoundException("Customer with id " + customerId + " not found!"));
	}
	
	
    // update customer
	public Customer updateCustomerProfile(Integer customerId, Customer updatedDetails) {
		Customer existingCustomer = customerRepo.findById(customerId).orElseThrow(() ->
		    new ResourceNotFoundException("Customer with id " + customerId + " not found!"));
		

		// 1. Update Email: Only check for duplicates if they are changing it to a NEW email
		if (updatedDetails.getEmail() != null && !updatedDetails.getEmail().isBlank()) {
			if (!existingCustomer.getEmail().equals(updatedDetails.getEmail())) {
				if (customerRepo.existsByEmail(updatedDetails.getEmail())) {
					throw new RuntimeException("The email '" + updatedDetails.getEmail() + "' is already taken by another user.");
				}
			}
			existingCustomer.setEmail(updatedDetails.getEmail());
		}
 
		// 2. Update Phone: Only check for duplicates if they are changing it to a NEW phone
		if (updatedDetails.getPhone() != null && !updatedDetails.getPhone().isBlank()) {
			if (!existingCustomer.getPhone().equals(updatedDetails.getPhone())) {
				if (customerRepo.existsByPhone(updatedDetails.getPhone())) {
					throw new RuntimeException("The phone number '" + updatedDetails.getPhone() + "' is already taken.");
				}
			}
			existingCustomer.setPhone(updatedDetails.getPhone());
		}
 
		// No database checks needed! Just overwrite them if they provided new data.
		if (updatedDetails.getName() != null && !updatedDetails.getName().isBlank()) {
			existingCustomer.setName(updatedDetails.getName());
		}
		if (updatedDetails.getAddress() != null && !updatedDetails.getAddress().isBlank()) {
			existingCustomer.setAddress(updatedDetails.getAddress());
		}
		
		// Save the modified customer back to the database
		return customerRepo.save(existingCustomer);
	}
	
	
	// fetch the current KYC verification status (PENDING / VERIFIED) 
	public Customer.KycStatus getKycStatus(Integer customerId) {
		Customer customer = customerRepo.findById(customerId).orElseThrow(() ->
		new ResourceNotFoundException("Customer with id " + customerId + " not found!"));
		
		return customer.getKycStatus();
	}
	
	
	// verify or update the customer's KYC status (ADMIN).
	public Customer updateKycStatus(Integer customerId, Customer.KycStatus newStatus) {
		Customer customer = customerRepo.findById(customerId).orElseThrow(() ->
		new ResourceNotFoundException("Customer with id " + customerId + " not found!"));
		
		customer.setKycStatus(newStatus);
		
		// saving the modified customer back to the database
		return customerRepo.save(customer);
	}
	
//	public Customer getCustomerByEmail(String email) {
//		return customerRepo.findByEmail(email).orElseThrow(()->
//		new ResourceNotFoundException("Customer with email"+email+"not found"));
//	}
	
//	public List<Customer> getCustomerByKycStatus(Customer.KycStatus status) {
//		if(customerRepo.count()==0) {
//			throw new ResourceNotFoundException("No customers");
//		}
//		return customerRepo.findByKycStatus(status);
//	}
 
}