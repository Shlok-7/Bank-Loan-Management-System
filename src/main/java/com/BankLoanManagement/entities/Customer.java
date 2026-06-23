package com.BankLoanManagement.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity 
@Table(name="Customer")
@Data 
@NoArgsConstructor
@AllArgsConstructor
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="customer_id")
    private Integer customerId; 

    @NotBlank(message = "Name cannot be empty")
    @Column(name= "name" , nullable = false, length = 100)
    private String name;

    @Email(message = "Must be a valid email address")
    @NotBlank(message = "Email is required")
    @Column(name = "email" , nullable = false, unique = true, length = 100)
    private String email;
    
    //@JsonIgnore
    @NotBlank(message = "Password cannot be empty")
    @Column(name = "password",nullable = false, length = 100)
    private String password;

    @NotBlank(message = "Phone number cannot be empty")
    @Pattern(regexp = "^\\d{10}$", message = "Phone number must be exactly 10 digits")
    @Column(name = "phone",nullable = false,unique=true, length = 15)
    private String phone;

    @NotBlank(message = "Address cannot be empty")
    @Column(name = "address",nullable = false, length = 500) 
    private String address;

    public enum KycStatus {
        PENDING, VERIFIED
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "kyc_status"  ,nullable = false)
    private KycStatus kycStatus;

}