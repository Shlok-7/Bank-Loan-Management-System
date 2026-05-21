package com.BankLoanManagement.repositories;
 
import java.util.Optional;
import java.util.List;
 
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.BankLoanManagement.entities.Customer;

 

@Repository 
public interface CustomerRepo extends JpaRepository<Customer, Integer> {
    
   Optional<Customer> findByEmail(String email);
   
   boolean existsByPhone(String phone);
   
   boolean existsByEmail(String email);
   

 
  
   
 
//   List<Customer> findByKycStatus(Customer.KycStatus status);
}