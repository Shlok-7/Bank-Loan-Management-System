package com.BankLoanManagement.service;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.BankLoanManagement.entities.Customer;
import com.BankLoanManagement.services.CustomerService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
public class TestCustomerService {


    @Autowired
    CustomerService customerService; 

    // this variable will hold the reusable dummy customer
    private Customer sharedCustomer;

    @BeforeEach
    public void setup() {
        Customer dummyCustomer = new Customer();
        dummyCustomer.setName("Shared Service User");
        // using timestamp to ensure unique emails/phones so the database doesn't crash on duplicates
        dummyCustomer.setEmail("service" + System.currentTimeMillis() + "@gmail.com");
        dummyCustomer.setPhone(String.valueOf(System.currentTimeMillis()).substring(3));
        dummyCustomer.setAddress("Shared Pune Address");

        // Save it using the service and assign it to our class variable
        sharedCustomer = customerService.registerCustomer(dummyCustomer);
    }

    // 1. test Register Customer 
    @Test
    public void testRegisterCustomer() {
        // we create a new customer specifically to test the registration method
        Customer newCust = new Customer();
        newCust.setName("New Register User");
        newCust.setEmail("new_svc" + System.currentTimeMillis() + "@gmail.com");
        newCust.setPhone("999" + String.valueOf(System.currentTimeMillis()).substring(5));
        newCust.setAddress("Mumbai");

        Customer savedCustomer = customerService.registerCustomer(newCust);

        System.out.println("Registered Customer : " + savedCustomer);
        assertNotNull(savedCustomer.getCustomerId()); // Proves the database assigned an ID
        assertEquals(Customer.KycStatus.PENDING, savedCustomer.getKycStatus()); // Proves business logic was applied
    }
    
    // 2. test Get All Customers
    @Test
    public void testGetAllCustomers() {
    	List<Customer> customerLst = customerService.getAllCustomers();
    	
    	System.out.println("Total Customers in DB : " + customerLst.size());
    	assertNotNull(customerLst);
    	assertTrue(customerLst.size() > 0); // Since setup() runs, we know there is at least 1 customer!
    }

    // 3. test Get Customer Details
    @Test
    public void testGetCustomerDetails() {
        // Fetch using the sharedCustomer's ID
        Customer fetchedCustomer = customerService.getCustomerDetails(sharedCustomer.getCustomerId());
        
        System.out.println("Fetched Customer Data : " + fetchedCustomer);
        assertEquals("Shared Service User", fetchedCustomer.getName());
        assertEquals(sharedCustomer.getEmail(), fetchedCustomer.getEmail());
    }


    // 4. test Update Customer Profile 
    @Test
    public void testUpdateCustomerProfile() {
        Customer updateRequest = new Customer();
        updateRequest.setName("Updated Service Name");
        updateRequest.setAddress("Updated Service Address");
        // Leaving email and phone blank to test safe-updating logic!

        Customer updatedCustomer = customerService.updateCustomerProfile(sharedCustomer.getCustomerId(), updateRequest);

        System.out.println("Updated Customer : " + updatedCustomer);
        assertEquals("Updated Service Name", updatedCustomer.getName());
        assertEquals("Updated Service Address", updatedCustomer.getAddress());
        
        // Verify that the email remained the same, proving the safe-update logic works!
        assertEquals(sharedCustomer.getEmail(), updatedCustomer.getEmail()); 
    }

    // 5. test Get KYC Status
    @Test
    public void testGetKycStatus() {
        Customer.KycStatus status = customerService.getKycStatus(sharedCustomer.getCustomerId());
        
        System.out.println("Fetched KYC Status : " + status);
        assertEquals(Customer.KycStatus.PENDING, status); 
    }

    // 6. test Update KYC Status
    @Test
    public void testUpdateKycStatus() {
        // Act: Change the status to VERIFIED
        Customer verifiedCustomer = customerService.updateKycStatus(sharedCustomer.getCustomerId(), Customer.KycStatus.VERIFIED);

        System.out.println("Verified Customer : " + verifiedCustomer);
        assertEquals(Customer.KycStatus.VERIFIED, verifiedCustomer.getKycStatus());
    }
}