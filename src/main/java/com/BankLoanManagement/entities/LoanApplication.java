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
@Table(name = "loanapplication") // Matches your new CREATE TABLE name
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanApplication {
 
    @Id
    @Column // Matches SQL: ApplicationId
    private Integer applicationId;
 
    	@ManyToOne(fetch = FetchType.LAZY)
    	@JoinColumn(nullable = false)
    private Customer customer;
 
    	@ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Banks bank;
 
    	// 3. LINKING MODULE 2
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "LoanProductID", nullable = false)
    private LoanProducts loanProduct;
 
    @Column(name = "LoanAmount", nullable = false) // Matches SQL: LoanAmount
    private Double loanAmount;
 
    @Column(name = "applicationDate", nullable = false) // Matches SQL: applicationDate
    private LocalDate applicationDate;
    
    @Column(name = "approval_date")
    private LocalDate approvalDate;
 
    public enum ApprovalStatus {
        PENDING, APPROVED, REJECTED
    }
 
    @Enumerated(EnumType.STRING) 
    @Column(name = "approvalStatus", nullable = false) // Matches SQL: approvalStatus
    private ApprovalStatus approvalStatus;

    public Integer getApplicationId() { 
        return applicationId; 
    }
    public void setApplicationId(Integer applicationId) { 
        this.applicationId = applicationId; 
    }
 
    public ApprovalStatus getApprovalStatus() { 
        return approvalStatus; 
    }
    public void setApprovalStatus(ApprovalStatus approvalStatus) { 
        this.approvalStatus = approvalStatus; 
    }
 
    public void setApplicationDate(LocalDate applicationDate) { 

        this.applicationDate = applicationDate; 
    }

// Add these to LoanApplication.java
    
    }