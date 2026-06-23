package com.BankLoanManagement.services;

	import org.springframework.beans.factory.annotation.Autowired;
	import org.springframework.stereotype.Service;

import com.BankLoanManagement.entities.Banks;
import com.BankLoanManagement.entities.LoanProducts;
import com.BankLoanManagement.exceptions.ResourceNotFoundException;
import com.BankLoanManagement.repositories.BanksRepo;
import com.BankLoanManagement.repositories.LoanProductsRepo;

import java.util.* ; 

	@Service
	public class LoanProductsService {
		@Autowired
		LoanProductsRepo lprepo ; 
		@Autowired 
		BanksRepo dobj ; 
		// get All Loan Products in system 
		public List<LoanProducts>getLoanProduct(){
			return lprepo.findAll() ; 		
		}
	  // get a particular loan product by id 
		public LoanProducts getLoanProductById(Integer id) {
			return lprepo.findById(id).orElse(null) ; 
		}
		
		// Add loan product in system provided by particular bank 
		public LoanProducts addLoanProduct(Integer bankId, LoanProducts newProduct) {
		    // Basic validations
		    if (newProduct.getInterestRate() <= 0) throw new ArithmeticException("Interest rate must be > 0");
		    
		    if (newProduct.getMinAmount() >= newProduct.getMaxAmount()) throw new ArithmeticException("Min amount must be < Max amount");
		    
		    if (newProduct.getTenure() <= 0) throw new ArithmeticException("Tenure must be > 0");
 
		    //  Find the bank 
		    Banks bank = dobj.findById(bankId)
		            .orElseThrow(() -> new ResourceNotFoundException("Bank ID: " + bankId + " not present"));
 
		    //  Check for exact duplicate within this bank
		    boolean alreadyExists = lprepo.existsByLoanProductNameAndMaxAmountAndMinAmountAndInterestRateAndTenureAndBank(
		            newProduct.getLoanProductName(),
		            newProduct.getMaxAmount(),
		            newProduct.getMinAmount(),
		            newProduct.getInterestRate(),
		            newProduct.getTenure(),
		            bank
		    );
 
		    if (alreadyExists) {
		        throw new RuntimeException("An identical '"+ newProduct.getLoanProductName() +"' already exists for this bank.");
		    }
 
		    //  Save
		    newProduct.setBank(bank);
		    return lprepo.save(newProduct);
		}

			// UPDATE LOAN PRODUCT based on loanproduct id 
			public LoanProducts updateLoanProduct(Integer id , LoanProducts updateproduct) {
				LoanProducts lpobj = lprepo.findById(id).orElseThrow(()->new ResourceNotFoundException("Loan Product ID: " + id + " not present")) ; 
				lpobj.setLoanProductID(id); 
				lpobj.setInterestRate(updateproduct.getInterestRate());
				lpobj.setLoanProductName(updateproduct.getLoanProductName());
				lpobj.setMaxAmount(updateproduct.getMaxAmount());
				lpobj.setMinAmount(updateproduct.getMinAmount());
				lpobj.setTenure(updateproduct.getTenure());
				lprepo.save(lpobj) ; 
				return lpobj ; 

			}
			// DELETE LOAN PRODUCT 
			public void deleteloanproduct(Integer id)  {
			  LoanProducts lp = lprepo.findById(id).orElseThrow(()->new ResourceNotFoundException("Loan Product ID: " + id + " not present")) ; 
			  lprepo.deleteById(id);
			}
		

	}



