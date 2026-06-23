package com.BankLoanManagement.entities;
 
import jakarta.persistence.*;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
 
//import com.fasterxml.jackson.annotation.JsonProperty;
 
@Entity
@Table(name = "loanapplication")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanApplication {

    @Id
    @Column(name = "application_id")  
    private Integer applicationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_customer_id", nullable = false)  
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_bankid", nullable = false)  
    private Banks bank;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_productid", nullable = false) 
    private LoanProducts loanProduct;

    @Column(name = "loan_amount", nullable = false)
    private Double loanAmount;

    @Column(name = "application_date", nullable = false)
    private LocalDate applicationDate;

    @Column(name = "approval_date")
    private LocalDate approvalDate;

    public enum ApprovalStatus {
        PENDING, APPROVED, REJECTED
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false)
    private ApprovalStatus approvalStatus;
}