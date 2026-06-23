package com.BankLoanManagement.controllers;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.BankLoanManagement.entities.Banks;
import com.BankLoanManagement.entities.LoanProducts;
import com.BankLoanManagement.services.BanksService;
@CrossOrigin(origins = "*")
@RestController
public class BanksController {

    @Autowired
    private BanksService servObject;

    // Getting all the Banks
    //customer
    @GetMapping("/getAllBanks")
    public ResponseEntity<List<Banks>> getAllBanks() {
        List<Banks> l = servObject.getbank();
        return new ResponseEntity<>(l, HttpStatus.OK);
    }

    //admin
    // Getting the Bank Details by BankId
    @GetMapping("/getBank/{id}")
    public ResponseEntity<?> getBank(@PathVariable Integer id) {
        try {
            Banks existed = servObject.getBankAt(id);
            return new ResponseEntity<>(existed, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }
    
    // Get Loan Product By particular bank ID 
    
   @GetMapping("/getProductByBankId/{id}")
   public ResponseEntity<List<LoanProducts>>getProductByBankId(@PathVariable Integer id) throws Exception{
	   List<LoanProducts> lplist = servObject.getLoanProductByBankId(id);
	   return new ResponseEntity<>(lplist , HttpStatus.OK) ; 
   }

    	//admin
    // Adding the New Bank Details
    @PostMapping("/addBank")
    public ResponseEntity<Banks> addBank(@RequestBody Banks newBank) {
        Banks addedBank = servObject.addBankId(newBank);
        return new ResponseEntity<>(addedBank, HttpStatus.ACCEPTED);
    }

    	//admin
    // Updating the Bank Details 
    @PatchMapping("/updateBank/{id}")
    public ResponseEntity<?> updateBankId(@PathVariable Integer id, @RequestBody Banks updatedBankData) {
        try {
            Banks updatedBank = servObject.updatedBankId(id, updatedBankData);
            return new ResponseEntity<>(updatedBank, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    //admin
    // Deleting a Bank by Id
    @DeleteMapping("/deleteBank/{id}")
    public ResponseEntity<String> deleteBankId(@PathVariable Integer id) {
        String strMessage = servObject.deleteBankId(id);
        if (strMessage.contains("not found")) {
            return new ResponseEntity<>(strMessage, HttpStatus.NOT_FOUND);
        }
        return new ResponseEntity<>(strMessage, HttpStatus.OK);
    }

    //Customer
    // Getting the Search Results by query
    @GetMapping("/search")
    public ResponseEntity<?> searchBanks(@RequestParam("query") String query) {
        List<Banks> results = servObject.searchBanks(query);
        return new ResponseEntity<>(results, HttpStatus.OK);
    }
    
    
}