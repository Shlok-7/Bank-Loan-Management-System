package com.BankLoanManagement.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.BankLoanManagement.entities.Banks;
import com.BankLoanManagement.entities.LoanProducts;

public interface LoanProductsRepo extends JpaRepository<LoanProducts , Integer>{

		boolean existsByLoanProductNameAndMaxAmountAndMinAmountAndInterestRateAndTenureAndBank(
		        String name, Double max, Double min, Double rate, Integer tenure, Banks bank
		    );
}
