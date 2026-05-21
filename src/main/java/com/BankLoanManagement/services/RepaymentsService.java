package com.BankLoanManagement.services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.BankLoanManagement.entities.LoanApplication;
import com.BankLoanManagement.entities.Repayments;
import com.BankLoanManagement.exceptions.ResourceNotFoundException;
import com.BankLoanManagement.repositories.RepaymentsRepo;


@Service
public class RepaymentsService {
	
	private RepaymentsRepo repaymentRepo;
	
	
	
	//This is constructor injection and this is highly recommended over setter or field
	//Constructor Declaration: Takes the repo as an argument to initialize the class
	public RepaymentsService(RepaymentsRepo repaymentRepo) {
		this.repaymentRepo = repaymentRepo;
	}
	
	
	//This is just returning a trigger for the actual method
	//and once again calculating the same late fee logic so that admin, customer
	//everyone will see the same outstanding fees
	public List<Repayments> getRepaymentSchedule(Integer applicationId) {
	    
	    List<Repayments> schedule = repaymentRepo.findByLoanApplication_ApplicationId(applicationId);
	    LocalDate today = LocalDate.now();
	    
	    for(Repayments emi : schedule) {
	        // THE PENALTY LOGIC: Previously logic was dumb. Now it is corrected
	        if(emi.getPaymentStatus() == Repayments.PaymentStatus.PENDING && today.isAfter(emi.getDueDate())) {	            
	            BigDecimal flatLateFeePerMonth = new BigDecimal("850.00"); 
	            long fullMonthsPassed = ChronoUnit.MONTHS.between(emi.getDueDate(), today);
	            long penaltyCount = fullMonthsPassed + 1;
	            BigDecimal totalLateFee = flatLateFeePerMonth.multiply(BigDecimal.valueOf(penaltyCount));	        
	            // Inflate the object in memory so the frontend displays it
	            emi.setAmountDue(emi.getAmountDue().add(totalLateFee));
	        }
	    }
	    return schedule;
	}
	
//===============================================================================================================================================================================
	
	//OUTSTANDING BALANCE
	//Calculates the total amount remaining to be paid
	public BigDecimal calculateOutStandingBalance(Integer applicationId) throws ResourceNotFoundException{
		//Asks the database for only those emi's whose status = pending;
		List<Repayments> pendingInstallments =  repaymentRepo.findByLoanApplication_ApplicationIdAndPaymentStatus(applicationId, Repayments.PaymentStatus.PENDING);
		
		BigDecimal totalBalance = BigDecimal.ZERO; //Initialization
		LocalDate today = LocalDate.now();
		
		for(Repayments installments : pendingInstallments) {		
			BigDecimal currentDue = installments.getAmountDue();
			
			//The penaulty logic for displaying the correct outstanding balance
			if(installments.getPaymentStatus() == Repayments.PaymentStatus.PENDING && today.isAfter(installments.getDueDate()) ) {
				BigDecimal flatLateFeePerMonth = new BigDecimal("850");
				long fullMonthsPassed = ChronoUnit.MONTHS.between(installments.getDueDate(),today);
				long penaltyCount = fullMonthsPassed + 1;
				BigDecimal totalLateFee = flatLateFeePerMonth.multiply(BigDecimal.valueOf(penaltyCount));
				currentDue = currentDue.add(totalLateFee);
			}
			totalBalance = totalBalance.add(currentDue);
		}
		return totalBalance.setScale(2, java.math.RoundingMode.HALF_UP);
	}
	
	
//===================================================================================================================================================================================
	//FUNCTIONS OF THIS METHOD
    //1. Searches the db with available repayment id
	//2. Checks if payment is already completed
	//3. Grabs the "today" date
	//4. Checks the due date with current date
	//5. if current date if after due date, adds late fee
	//6. After payment, changes the payment status to COMPLETED
	//7. saves the new modified emi (with repaymentId) into the repaymentRepo
	
	//Handles the user clicking pay-now, taking the specific  EMI's ID
	public Repayments processPayment(Integer repaymentId) throws ResourceNotFoundException {
		//Searching the database or the emi
		Repayments reps = repaymentRepo.findById(repaymentId).orElseThrow(() -> 
								new ResourceNotFoundException("Repayment with id "+repaymentId+" not found!"));
		//VALIDATION CHECK: we checking if payment is already completed
		if(reps.getPaymentStatus() == Repayments.PaymentStatus.COMPLETED) {
			throw new ResourceNotFoundException("The EMI has been already paid");
		}
		//THE LOOPHOLE PATCH -> customer must pay the previous emi before paying the current one
		//Asking database if there are any pending emis that were due before this
		//specific emis due date. and it must be zero
		int unpaidOlderEmis = repaymentRepo.countByLoanApplication_ApplicationIdAndPaymentStatusAndDueDateBefore(
				reps.getLoanApplication().getApplicationId(),
				Repayments.PaymentStatus.PENDING,
				reps.getDueDate());
	
		if(unpaidOlderEmis > 0) {
			throw new ResourceNotFoundException("Payment Blocked: You must clear your older pending EMIs before paying this future EMI.");
		}

		//Grabs the exact current date from the server
		LocalDate today = LocalDate.now();
		//Checking if current date (which user is on website) is after the due date,
		//late fee will be applicable.
		//Hardcoding the late fee for now
		// THE PENALTY LOGIC
	    if(reps.getPaymentStatus() == Repayments.PaymentStatus.PENDING && today.isAfter(reps.getDueDate())) {	        
	        BigDecimal flatLateFeePerMonth = new BigDecimal("850.00"); 
	        long fullMonthsPassed = ChronoUnit.MONTHS.between(reps.getDueDate(), today);
	        long penaltyCount = fullMonthsPassed + 1;
	        BigDecimal totalLateFee = flatLateFeePerMonth.multiply(BigDecimal.valueOf(penaltyCount));	        
	        // Overwrite the old amount with the new inflated amount
	        reps.setAmountDue(reps.getAmountDue().add(totalLateFee));
	    }		
		//After payment, changing the emi status from pending to completed
		reps.setPaymentStatus(Repayments.PaymentStatus.COMPLETED);		
		//Setting Payment date
		reps.setPaymentDate(today);
		//saving the modified emi back to repo
		return repaymentRepo.save(reps);	
	}
	
	
//========================================================================================================================================================	
	
	
	//FUNCTIONS OF THIS METHOD: generates repayment schedule
	//Below method will carry out math functions
	//1. Calculate all the maths params using formulae
	//2. Basically generating a new empty emi schedule
	//3. 
	public List<Repayments> getRepaymentSchedule(LoanApplication app) throws ResourceNotFoundException{
		
		// 1. UNPACKING DATA FROM MODULE 3 AND MODULE 2
		// Converting Module 3's Double into your safe BigDecimal
		BigDecimal principal = BigDecimal.valueOf(app.getLoanAmount());
				
				// Reaching into Module 2 (LoanProduct) to get the rules
		double annualInterestRate = app.getLoanProduct().getInterestRate();
		int tenureInMonths = app.getLoanProduct().getTenure();
		
		
		//When integration with module 3 happens, then this method will directly accept the object and then i will unpack the objects
		//converting annual rate into monthly rate
		double monthlyRate = (annualInterestRate/12)/100;
		
		//IMPORTANT calculation for the emi formula
		double mathPower = Math.pow(1 + monthlyRate, tenureInMonths);
		
		//This is the monthly emi
		double emiDouble = (principal.doubleValue() * monthlyRate * mathPower) / (mathPower - 1);
		
		//This is financial accuracy: Converts the calculated double back into 
									//a safe BigDecimal, rounding it to 2 decimal places.
		BigDecimal emiAmount = BigDecimal.valueOf(emiDouble).setScale(2, java.math.RoundingMode.HALF_UP);
		
		//setting the due date for the very first installment right after paying
		LocalDate nextDueDate = LocalDate.now().plusMonths(1);
		
		//Starting a loop that will run exactly for tenureInMonth (will recieve this from Loan Application Module)
		//this will generate new amounts and new dates
		List<Repayments> generatedSchedule = new ArrayList<>();
		
		for(int i = 1;  i <= tenureInMonths ; i++) {
			
			//Creating a blank repayments object in memory to represent one month's emi
			Repayments installment = new Repayments();
			
			//all these setters and getters are provided by LOMBOK
			installment.setLoanApplication(app);
			
			installment.setAmountDue(emiAmount);
			
			installment.setDueDate(nextDueDate);
			
			installment.setPaymentStatus(Repayments.PaymentStatus.PENDING);
			
			Repayments savedInstallment = repaymentRepo.save(installment);
			generatedSchedule.add(savedInstallment);
			
			nextDueDate = nextDueDate.plusMonths(1);
		}
		//After all rows are generated and saved, this queries the db to return the complete, newly created schedule
		return generatedSchedule;
		//THis method is used from the interface;
	}
	
	
//=====================================================================================================================================================================	
	
	
	//CREATING the god mode
	public Repayments manualStatusOverride(Integer repaymentId, Repayments.PaymentStatus newStatus) throws ResourceNotFoundException{
		//Checking if the emi exists in the db
		Repayments emi = repaymentRepo.findById(repaymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Repayment ID not found"));
		emi.setPaymentStatus(newStatus);
		
		//If overriding is completed, also log the date it was forced by the GOD MODE
		if(newStatus == Repayments.PaymentStatus.COMPLETED) {
			emi.setPaymentDate(LocalDate.now());
		} else {
			emi.setPaymentDate(null);
		}
		return repaymentRepo.save(emi);
	}
	
	
	
	//TRYING TO HELP RISHI WITH REPORTING
	public Map<Integer, BigDecimal> generateBulkOutstandingBalanceReport(List<Integer> applicationIds) {
	    
	    // 1. THE BULK FETCH: Hit the database exactly ONCE.
	    List<Repayments> allPendingEmis = repaymentRepo.findByLoanApplication_ApplicationIdInAndPaymentStatus(
	            applicationIds, Repayments.PaymentStatus.PENDING
	    );

	    // 2. THE GROUPING: Organize the list by Application ID
	    Map<Integer, List<Repayments>> emisGroupedByApp = allPendingEmis.stream()
	            .collect(Collectors.groupingBy(emi -> emi.getLoanApplication().getApplicationId()));

	    // 3. THE MATH (Fully Inlined)
	    Map<Integer, BigDecimal> finalReport = new HashMap<>();
	    LocalDate today = LocalDate.now();
	    BigDecimal flatLateFeePerMonth = new BigDecimal("850.00");
	    
	    for (Map.Entry<Integer, List<Repayments>> entry : emisGroupedByApp.entrySet()) {
	        Integer appId = entry.getKey();
	        List<Repayments> emisForThisApp = entry.getValue();
	        
	        BigDecimal totalBalanceForApp = BigDecimal.ZERO;
	        
	        for (Repayments emi : emisForThisApp) {
	            BigDecimal currentDue = emi.getAmountDue();

	            // THE PENALTY LOGIC (Written directly inside the loop)
	            if (emi.getPaymentStatus() == Repayments.PaymentStatus.PENDING && today.isAfter(emi.getDueDate())) {
	                long fullMonthsPassed = ChronoUnit.MONTHS.between(emi.getDueDate(), today);
	                long penaltyCount = fullMonthsPassed + 1;
	                BigDecimal totalLateFee = flatLateFeePerMonth.multiply(BigDecimal.valueOf(penaltyCount));
	                
	                currentDue = currentDue.add(totalLateFee); 
	                // Inflate in memory IN ORDER TO DISPLAY TO FRONT END
	            }
	            
	            totalBalanceForApp = totalBalanceForApp.add(currentDue); 
	        }
	        
	        // Put the final evaluated number into the report map
	        finalReport.put(appId, totalBalanceForApp.setScale(2, java.math.RoundingMode.HALF_UP));
	    }
	    
	    return finalReport;
	}
} 

	
//================================================================================================================================================================
	
	
	
	
	

