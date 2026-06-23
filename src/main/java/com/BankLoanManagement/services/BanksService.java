package com.BankLoanManagement.services;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.BankLoanManagement.entities.Banks;
import com.BankLoanManagement.entities.LoanProducts;
import com.BankLoanManagement.exceptions.ResourceNotFoundException;
import com.BankLoanManagement.repositories.BanksRepo;

@Service
public class BanksService {

    @Autowired
    private BanksRepo repoObject;

    // Fixed name to getbank() to match your BanksController call
    public List<Banks> getbank() {
        return repoObject.findAll();
    }

    // Changed Long.valueOf(id) to just id, since your Entity uses Integer
    public Banks getBankAt(Integer id) throws Exception {
        return repoObject.findById(id)
                .orElseThrow(() -> new Exception("Bank not found with id " + id));
    }

    public Banks addBankId(Banks newBank) {
        Banks saved = repoObject.save(newBank);
        System.out.println("BankId: " + saved.getBankID() + " newly Added");
        return saved;
    }

    public String deleteBankId(Integer id) {
        if (repoObject.existsById(id)) {
            repoObject.deleteById(id);
            return "Bank with ID " + id + " deleted successfully.";
        } else {
            return "Bank with ID " + id + " not found.";
        }
    }
    //admin
    public Banks updatedBankId(Integer id, Banks updatedData) throws Exception {
//        return repoObject.findById(id).map(existingBank -> {
//            existingBank.setBankName(updatedData.getBankName());
//            existingBank.setBranchCode(updatedData.getBranchCode());
//            existingBank.setBranchAddress(updatedData.getBranchAddress());
//            existingBank.setContactNumber(updatedData.getContactNumber());
//            existingBank.setLocation(updatedData.getLocation());
//            return repoObject.save(existingBank);
//        }).orElseThrow(() -> new Exception("Bank not found with id " + id));
    	Banks existingBank = repoObject.findById(id).orElseThrow(() -> new Exception("Bank not found with id " + id));
		
    	//updates each attributes values
    	 		existingBank.setBankName(updatedData.getBankName());
            existingBank.setBranchCode(updatedData.getBranchCode());
            existingBank.setBranchAddress(updatedData.getBranchAddress());
            existingBank.setContactNumber(updatedData.getContactNumber());
            existingBank.setLocation(updatedData.getLocation());
            //save the updated values in database
            repoObject.save(existingBank);
            //return the updated values
    	return existingBank;
    }
//    
//    public Banks updatedBankId(Integer id, Banks updatedData) throws ResourceNotFoundException{
//		//retrives the data by id if id does not exist 
//		Banks existingBank = repoObject.findById(Integer.valueOf(id)).orElseThrow(() -> new NoBankIdFoundException("Bank not found with id " + id));
//	//updates each attributes values
//	 existingBank.setBankName(updatedData.getBankName());
//        existingBank.setBranchCode(updatedData.getBranchCode());
//        existingBank.setBranchAddress(updatedData.getBranchAddress());
//        existingBank.setContactNumber(updatedData.getContactNumber());
//        existingBank.setLocation(updatedData.getLocation());
//        //save the updated values in database
//        repoObject.save(existingBank);
//        //return the updated values
//	return existingBank;
//	}

    public List<Banks> searchBanks(String query) {
        if (query != null && !query.trim().isEmpty()) {
            return repoObject.findByBankNameContainingIgnoreCaseOrLocationContainingIgnoreCase(query, query);
        }
        return repoObject.findAll();
    }
    
    // Service to display all loan products after reciveing bank id from user 
    
    public List<LoanProducts>getLoanProductByBankId(Integer id) throws Exception {
    	Banks bobj = repoObject.findById(id).orElseThrow(()-> new Exception("Bank not found")) ; 
    	return bobj.loanProducts ; 
    }
    
}