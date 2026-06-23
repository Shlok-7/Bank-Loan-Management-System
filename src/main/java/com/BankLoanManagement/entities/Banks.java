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
	    @Column(name = "bankid")
	    private Integer bankID;

	    @Column(name = "bank_name")
	    private String bankName;

	    @Column(name = "branch_code")
	    private String branchCode;

	    @Column(name = "branch_address")
	    private String branchAddress;

	    @Column(name = "contact_number")
	    private String contactNumber;

	    @Column(name = "location")
	    private String location;
	    

	    @OneToMany(mappedBy = "bank", cascade = CascadeType.ALL)
	    @JsonManagedReference
	    public  List<LoanProducts> loanProducts;
	    
	    
	}
