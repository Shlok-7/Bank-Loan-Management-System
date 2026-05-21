package com.BankLoanManagement.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.BankLoanManagement.entities.Banks;

public interface BanksRepo extends JpaRepository<Banks , Integer> {
	List<Banks> findByBankNameContainingIgnoreCaseOrLocationContainingIgnoreCase(String name, String loc);

}
