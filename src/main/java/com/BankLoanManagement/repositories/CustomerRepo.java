package com.BankLoanManagement.repositories;
 
import java.util.Optional;
import java.util.List;
 
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.BankLoanManagement.entities.Customer;

 
@Repository // Extends JPA repo, giving us out-of-the-box methods like save(), findById(), findAll()

public interface CustomerRepo extends JpaRepository<Customer, Integer> {
    
   boolean existsByName(String name);
 
   boolean existsByEmail(String email);
 
   boolean existsByPhone(String phone);
 
   boolean existsByAddress(String address);    
  
   
   

   List<Customer> findByKycStatus(Customer.KycStatus status);
   Optional<Customer> findByEmail(String email);
}