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
		  @GeneratedValue(strategy = GenerationType.IDENTITY)
		    @Column(name = "loan_productid" , nullable=false , unique=true)
		    private Integer loanProductID;   

		    @Column(name = "loan_product_name", nullable = false)
		    private String loanProductName;  

		    @Column(name = "max_amount", nullable = false)
		    private Double maxAmount;

		    @Column(name = "min_amount", nullable = false)
		    private Double minAmount;

		    @Column(name = "interest_rate", nullable = false)
		    private Double interestRate;

		    @Column(name = "tenure", nullable = false)
		    private Integer tenure;
	    @ManyToOne
	    @JoinColumn(name = "bankid") 
	    // FK column in DB 
	    @JsonBackReference
	    private Banks bank;

	}

