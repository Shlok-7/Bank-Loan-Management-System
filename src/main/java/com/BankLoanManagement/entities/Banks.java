package com.BankLoanManagement.entities;
import java.util.List; 
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


	@Entity
	@Table(name = "bank")
	@Data
	@NoArgsConstructor
	@AllArgsConstructor
	public class Banks {

	    @Id
	    @Column(name = "BankID")
	    private Integer bankID;

	    @Column(name = "BankName")
	    private String bankName;

	    @Column(name = "BranchCode")
	    private String branchCode;

	    @Column(name = "BranchAddress")
	    private String branchAddress;

	    @Column(name = "ContactNumber")
	    private String contactNumber;

	    @Column(name = "Location")
	    private String location;
	    

	    @OneToMany(mappedBy = "bank", cascade = CascadeType.ALL)
	    @JsonManagedReference
	    private List<LoanProducts> loanProducts;
	    
	    
	}
