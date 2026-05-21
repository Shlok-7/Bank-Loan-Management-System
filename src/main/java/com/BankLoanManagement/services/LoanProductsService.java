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
		
		public List<LoanProducts>getLoanProduct(){
			return lprepo.findAll() ; 		
		}
		// findById does not directly return LoanProduxt it return Optional so use orElse 
		public LoanProducts getLoanProductById(Integer id) {
			return lprepo.findById(id).orElse(null) ; 
		}
		// to add loan product i will require bank id only
	   // we need to create one more method called as setbank as we create a new loan product obj we nedd to map it to particular bank 
		// jpa will give us obj but bankid is premitive so we will map new laonproduct obj and map it with bank with use of setbank method

		// to bank payload with particular bank obj 

		public LoanProducts addLoanProduct(Integer bankId, LoanProducts newProduct) {
		    // 1. Basic numeric validations
		    if (newProduct.getInterestRate() <= 0) throw new ArithmeticException("Interest rate must be > 0");
		    
		    if (newProduct.getMinAmount() >= newProduct.getMaxAmount()) throw new ArithmeticException("Min amount must be < Max amount");
		    
		    if (newProduct.getTenure() <= 0) throw new ArithmeticException("Tenure must be > 0");
 
		    // 2. Find the bank first (we need the bank object for the unique check)
		    Banks bank = dobj.findById(bankId)
		            .orElseThrow(() -> new ResourceNotFoundException("Bank ID: " + bankId + " not present"));
 
		    // 3. Check for exact duplicate within this bank
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
 
		    // 4. Map and Save
		    newProduct.setBank(bank);
		    return lprepo.save(newProduct);
		}

			// UPDATE LOAN PRODUCT based on lpid 
			public LoanProducts updateLoanProduct(Integer id , LoanProducts updateproduct) {
				LoanProducts lpobj = lprepo.findById(id).orElseThrow(()->new ResourceNotFoundException("Loan Product ID: " + id + " not present")) ; 
				// set details that was passed from updateproduct obj to exisitng data to update 
				//lpobj.setBank(updateproduct.getBank());
				lpobj.setLoanProductID(id); // we need to use this and pass this in payload as well elsewise it will map id to null 
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



