package com.BankLoanManagement.entities;
	import com.fasterxml.jackson.annotation.JsonBackReference;

	import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.NoArgsConstructor;

	@Entity
	@Table(name = "loan_product")
	@Data
	@NoArgsConstructor
	@AllArgsConstructor
	public class LoanProducts{
	
		
		  @Id
		    @Column(name = "LoanProductID" , nullable=false , unique=true)
		    private Integer loanProductID;   

		    @Column(name = "LoanProductName", nullable = false)
		    private String loanProductName;  

		    @Column(name = "maxAmount", nullable = false)
		    private Double maxAmount;

		    @Column(name = "minAmount", nullable = false)
		    private Double minAmount;

		    @Column(name = "interestRate", nullable = false)
		    private Double interestRate;

		    @Column(name = "Tenure", nullable = false)
		    private Integer tenure;
	    @ManyToOne
	    @JoinColumn(name = "bankid") 
	    // FK column in DB 
	    @JsonBackReference
	    private Banks bank;

	}

