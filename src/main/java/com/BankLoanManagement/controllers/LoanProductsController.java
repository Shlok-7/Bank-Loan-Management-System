package com.BankLoanManagement.controllers;


	import java.util.List;

	import org.springframework.beans.factory.annotation.Autowired;
	import org.springframework.http.HttpStatus;
	import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
	import org.springframework.web.bind.annotation.GetMapping;
	import org.springframework.web.bind.annotation.PathVariable;
	import org.springframework.web.bind.annotation.PostMapping;
	import org.springframework.web.bind.annotation.PutMapping;
	import org.springframework.web.bind.annotation.RequestBody;
	import org.springframework.web.bind.annotation.RestController;

import com.BankLoanManagement.entities.LoanProducts;
import com.BankLoanManagement.services.LoanProductsService;

@CrossOrigin(origins = "*")
@RestController
	public class LoanProductsController {
		@Autowired
		LoanProductsService lpservice ; 
		//get all loan products 
		@GetMapping("/getLoanProducts")
		public ResponseEntity<List<LoanProducts>> getLoanProducts(){
			List<LoanProducts> list = lpservice.getLoanProduct() ; 
			return new ResponseEntity<>(list , HttpStatus.OK) ; 
	 	}
		// get loan products by id
		@GetMapping("/getLoanProductById/{id}")
		public ResponseEntity<LoanProducts>getLoanProductById(@PathVariable int id){
			LoanProducts lp = lpservice.getLoanProductById(id) ;
			return new ResponseEntity<>(lp , HttpStatus.OK);
		}
		// method to add loan product 
		@PostMapping("/addLoanProduct/{bankid}")
		public ResponseEntity<LoanProducts> addLoanProduct(@PathVariable int bankid , @RequestBody LoanProducts newloanproduct ){
			 LoanProducts lp = lpservice.addLoanProduct(bankid, newloanproduct) ; 
			return  new ResponseEntity<>(lp, HttpStatus.OK) ; 
		}
		// update
		@PutMapping("/updateLoanProduct/{id}")
		public ResponseEntity<LoanProducts> updateLoanProduct(@PathVariable int id , @RequestBody LoanProducts updateproduct){
			LoanProducts lp = lpservice.updateLoanProduct(id , updateproduct);
			return  new ResponseEntity<>(lp , HttpStatus.CREATED) ; 
		}
		// delete  
		@DeleteMapping("/deleteLoanProduct/{id}")
		public ResponseEntity<String>deleteLoanProduct(@PathVariable int id){
			lpservice.deleteloanproduct(id);
			return new ResponseEntity<>("Data deleted Succesfully..." , HttpStatus.OK) ; 
		}

	}
