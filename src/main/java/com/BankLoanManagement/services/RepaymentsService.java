package com.BankLoanManagement.services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.BankLoanManagement.entities.LoanApplication;
import com.BankLoanManagement.entities.Repayments;
import com.BankLoanManagement.exceptions.ResourceNotFoundException;
import com.BankLoanManagement.repositories.LoanApplicationRepo;
import com.BankLoanManagement.repositories.RepaymentsRepo;

@Service
public class RepaymentsService {
	
	@Autowired
	private LoanApplicationRepo loanApplicationRepo;
	
	private RepaymentsRepo repaymentRepo;
	
	// Constructor Declaration: Takes the repo as an argument to initialize the class
	// This is constructor injection and is highly recommended over setter or field injection
	public RepaymentsService(RepaymentsRepo repaymentRepo) {
		this.repaymentRepo = repaymentRepo;
	}
	

	// HELPER METHOD: Extracts the repeated penalty math so it's only written once

	private void applyLateFeeIfApplicable(Repayments emi, LocalDate today) {
		if(emi.getPaymentStatus() == Repayments.PaymentStatus.PENDING && today.isAfter(emi.getDueDate())) {	            
			BigDecimal flatLateFeePerMonth = new BigDecimal("850.00"); 
			long fullMonthsPassed = ChronoUnit.MONTHS.between(emi.getDueDate(), today);
			long penaltyCount = fullMonthsPassed + 1;
			BigDecimal totalLateFee = flatLateFeePerMonth.multiply(BigDecimal.valueOf(penaltyCount));	        
			
			// Inflate the object in memory
			emi.setAmountDue(emi.getAmountDue().add(totalLateFee));
		}
	}

	// ===================================================================================================================================
	
	// This is just inflating RAM for the UI, saving nothing in the Database
	// and once again calculating the same late fee logic so that admin, customer
	// everyone will see the same outstanding fees
	public List<Repayments> getRepaymentSchedule(Integer applicationId) throws ResourceNotFoundException {
	    
	    List<Repayments> schedule = repaymentRepo.findByLoanApplication_ApplicationId(applicationId);
	    
	    // EXCEPTION HANDLING: If the schedule is empty, the Application ID might be invalid
	    if (schedule == null || schedule.isEmpty()) {
	        throw new ResourceNotFoundException("No repayment schedule found for Application ID: " + applicationId);
	    }
	    
	    LocalDate today = LocalDate.now();
	    
	    for(Repayments emi : schedule) {
	        // THE PENALTY LOGIC: Previously logic was dumb. Now it is corrected
	        // Inflate the object in memory so the frontend displays it
	        applyLateFeeIfApplicable(emi, today);
	    }
	    return schedule;
	}
	
	// =========================================================================================
	
	// OUTSTANDING BALANCE
	// Calculates the total amount remaining to be paid
	public BigDecimal calculateOutStandingBalance(Integer applicationId) throws ResourceNotFoundException {
		// Asks the database for only those emi's whose status = pending
		List<Repayments> pendingInstallments = repaymentRepo.findByLoanApplication_ApplicationIdAndPaymentStatus(applicationId, Repayments.PaymentStatus.PENDING);
		
		BigDecimal totalBalance = BigDecimal.ZERO; // Initialization
		LocalDate today = LocalDate.now();
		
		for(Repayments installments : pendingInstallments) {		
			// The penalty logic for displaying the correct outstanding balance
			applyLateFeeIfApplicable(installments, today);
			
			BigDecimal currentDue = installments.getAmountDue();
			totalBalance = totalBalance.add(currentDue);
		}
		return totalBalance.setScale(2, java.math.RoundingMode.HALF_UP);
	}
	
	// =========================================================================================
	
	// FUNCTIONS OF THIS METHOD:
	// 1. Searches the db with available repayment id
	// 2. Checks if payment is already completed
	// 3. Grabs the "today" date
	// 4. Checks the due date with current date
	// 5. If current date is after due date, adds Late fee
	// 6. After payment, changes the payment status to COMPLETED
	// 7. Saves the new modified emi (with repaymentId) into the repaymentRepo
	
	// Handles the user clicking pay-now, taking the specific EMI's ID
	public Repayments processPayment(Integer repaymentId) throws ResourceNotFoundException {
		// Searching the database for the emi. 
		// EXCEPTION HANDLING: Throws ResourceNotFoundException if ID doesn't exist
		Repayments reps = repaymentRepo.findById(repaymentId).orElseThrow(() -> 
								new ResourceNotFoundException("Repayment with id "+repaymentId+" not found!"));
		
		// VALIDATION CHECK: we checking if payment is already completed
		if(reps.getPaymentStatus() == Repayments.PaymentStatus.COMPLETED) {
			throw new ResourceNotFoundException("The EMI has been already paid");
		}
		
		// Asking database if there are any pending emis that were due before this
		// specific emis due date, and it must be zero
		int unpaidOlderEmis = repaymentRepo.countByLoanApplication_ApplicationIdAndPaymentStatusAndDueDateBefore(
				reps.getLoanApplication().getApplicationId(),
				Repayments.PaymentStatus.PENDING,
				reps.getDueDate());
		
		if(unpaidOlderEmis > 0) {
			throw new ResourceNotFoundException("Payment Blocked: You must clear your older pending EMIs before paying this future EMI.");
		}
		// Grabs the exact current date from the server
		LocalDate today = LocalDate.now();
		// THE PENALTY LOGIC
		// Overwrite the old amount with the new inflated amount
		applyLateFeeIfApplicable(reps, today);
	    		
		// After payment, changing the emi status from pending to completed
		reps.setPaymentStatus(Repayments.PaymentStatus.COMPLETED);		
		// Setting Payment date
		reps.setPaymentDate(today);
		// saving the modified emi back to repo
		return repaymentRepo.save(reps);	
	}
	
	// =========================================================================================	
	
	// FUNCTIONS OF THIS METHOD: generates repayment schedule
	// Below method will carry out math functions:
	// 1. Calculate all the maths params using formulae
	// 2. Basically generating a new empty emi schedule
	public List<Repayments> getRepaymentSchedule(LoanApplication app) throws ResourceNotFoundException {
		
		// 1. UNPACKING DATA FROM MODULE 3 AND MODULE 2
		// Converting Module 3's Double into your safe BigDecimal
		BigDecimal principal = BigDecimal.valueOf(app.getLoanAmount());
				
		// Reaching into Module 2 (LoanProduct) to get the rules
		double annualInterestRate = app.getLoanProduct().getInterestRate();
		int tenureInMonths = app.getLoanProduct().getTenure();
		
		// When integration with module 3 happens, then this method will 
		//directly accept the object and then i will unpack the objects
		// converting annual rate into monthly rate
		double monthlyRate = (annualInterestRate/12)/100;
		
		// IMPORTANT calculation for the emi formula
		double mathPower = Math.pow(1 + monthlyRate, tenureInMonths);
		
		// This is the monthly emi
		double emiDouble = (principal.doubleValue() * monthlyRate * mathPower) / (mathPower - 1);
		
		// This is financial accuracy: Converts the calculated double back into 
		// a safe BigDecimal, rounding it to 2 decimal places.
		BigDecimal emiAmount = BigDecimal.valueOf(emiDouble).setScale(2, java.math.RoundingMode.HALF_UP);
		
		// setting the due date for the very first installment right after paying
		LocalDate nextDueDate = LocalDate.now().plusMonths(1);
		
		// Starting a loop that will run exactly for tenureInMonth (will receive this from Loan Application Module)
		// this will generate new amounts and new dates
		List<Repayments> generatedSchedule = new ArrayList<>();
		for(int i = 1;  i <= tenureInMonths ; i++) {
			// Creating a blank repayments object in memory to represent one month's emi
			Repayments installment = new Repayments();
			
			// all these setters and getters are provided by LOMBOK
			installment.setLoanApplication(app);
			installment.setAmountDue(emiAmount);
			installment.setDueDate(nextDueDate);
			installment.setPaymentStatus(Repayments.PaymentStatus.PENDING);
			
			Repayments savedInstallment = repaymentRepo.save(installment);
			generatedSchedule.add(savedInstallment);
			
			nextDueDate = nextDueDate.plusMonths(1);
		}
		// After all rows are generated and saved, this queries the db to return the complete, newly created schedule
		return generatedSchedule;
	}
	
	// =========================================================================================================================================	
	
	// CREATING the admin functionality
	public Repayments manualStatusOverride(Integer repaymentId, Repayments.PaymentStatus newStatus) throws ResourceNotFoundException {
		// Checking if the emi exists in the db
		// EXCEPTION HANDLING: Throws ResourceNotFoundException if ID doesn't exist
		Repayments emi = repaymentRepo.findById(repaymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Repayment ID " + repaymentId + " not found"));
		emi.setPaymentStatus(newStatus);
		
		// If overriding is completed, also log the date it was forced by the GOD MODE
		if(newStatus == Repayments.PaymentStatus.COMPLETED) {
			emi.setPaymentDate(LocalDate.now());
		} else {
			emi.setPaymentDate(null);
		}
		return repaymentRepo.save(emi);
	}
	
	// ==========================================================================================================================================
	
	// TRYING TO HELP Module 6 - Rishi WITH REPORTING
	public Map<Integer, BigDecimal> generateBulkOutstandingBalanceReport(List<Integer> applicationIds) {
	    
	    // 1. THE BULK FETCH: Hit the database exactly ONCE.
		// Gives all Pending emis
	    List<Repayments> allPendingEmis = repaymentRepo.findByLoanApplication_ApplicationIdInAndPaymentStatus(
	            applicationIds, Repayments.PaymentStatus.PENDING
	    );

	    // 2. THE GROUPING: Organize the list by Application ID
	    // application Id --> List of all pending repayments
	    Map<Integer, List<Repayments>> emisGroupedByApp = allPendingEmis.stream()
	            .collect(Collectors.groupingBy(emi -> emi.getLoanApplication().getApplicationId()));

	    // 3. THE MATH (Fully Inlined)
	    Map<Integer, BigDecimal> finalReport = new HashMap<>();
	    LocalDate today = LocalDate.now();
	    
	    for (Map.Entry<Integer, List<Repayments>> entry : emisGroupedByApp.entrySet()) {
	    	// Get an applicationId
	        Integer appId = entry.getKey();
	        
	        // Create a list pending repayments for this particular application Id
	        List<Repayments> emisForThisApp = entry.getValue();
	        
	        BigDecimal totalBalanceForApp = BigDecimal.ZERO;
	        
	        // Iterate through that emis and calculate particular Outstanding + lateFee for that emi
	        for (Repayments emi : emisForThisApp) {
	            // THE PENALTY LOGIC (Written directly inside the loop)
	            // Inflate in memory IN ORDER TO DISPLAY TO FRONT END
	            applyLateFeeIfApplicable(emi, today);
	            BigDecimal currentDue = emi.getAmountDue();
	            totalBalanceForApp = totalBalanceForApp.add(currentDue); 
	        }
	        // Put the final evaluated number into the report map
	        // this is map like applicationId -> totalOutstandingBalance
	        finalReport.put(appId, totalBalanceForApp.setScale(2, java.math.RoundingMode.HALF_UP));
	    }
	    
	    return finalReport;
	}
	
	public Page<LoanApplication> getCustomerApplications(Integer customerId, Pageable pageable){
		return loanApplicationRepo.findByCustomer_CustomerId(customerId,pageable);
	}
	
	// NEW: Admin method to fetch ALL repayments across the entire bank
		public Page<Repayments> getAllRepaymentsForAdmin(Pageable pageable) {
			// findAll is built into JpaRepository automatically!
			return repaymentRepo.findAll(pageable); 
		}
		
		
	//NEW ADMIN METHOD
		//Finding the emis by application ID
		public Repayments getRepaymentByIdForSearch(Integer repaymentId) {
	        Optional<Repayments> repayment = repaymentRepo.findById(repaymentId);
	        
	        // Return the repayment if found, or null if it doesn't exist.
	        // (Your controller will handle the null to send a 404/Empty response)
	        return repayment.orElse(null);
	    }
		
		
	    public Page<Repayments> findByApplicationId(Long applicationId, Pageable pageable) {
	        // This connects the Controller to the Repository method we just added
	        return repaymentRepo.findByLoanApplication_ApplicationId(applicationId, pageable);
	    }
	}

