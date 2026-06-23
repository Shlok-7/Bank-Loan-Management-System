package com.BankLoanManagement.services;

import com.BankLoanManagement.entities.LoanApplication;
import com.BankLoanManagement.entities.Repayments;
import com.BankLoanManagement.exceptions.ResourceNotFoundException;
import com.BankLoanManagement.repositories.ReportingRepo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ReportingService {

    private final ReportingRepo reportingRepo;
    private final RepaymentsService repaymentsService;

    @Autowired
    public ReportingService(ReportingRepo reportingRepo, RepaymentsService repaymentsService) {
        this.reportingRepo = reportingRepo;
        this.repaymentsService = repaymentsService;
    }

// ==================  ADMIN 1: Loan Dashboard ===================================================================

    public Map<String, Object> getAdminLoanDashboard() {
        try {
            Long approvedCount = reportingRepo.countApprovedLoans();
            Long pendingCount = reportingRepo.countPendingLoans();
            Double totalDisbursed = Optional.ofNullable(reportingRepo.sumTotalAmountDisbursed()).orElse(0.0);
            Long totalCustomers = reportingRepo.countTotalCustomers();

//------------------------- totalOutstanding ----------------------------------
            List<LoanApplication> allApproved = reportingRepo.findAllApprovedLoans();
            List<Integer> appIds = allApproved.stream().map(LoanApplication::getApplicationId).collect(Collectors.toList());
            Map<Integer, BigDecimal> trueBalances = repaymentsService.generateBulkOutstandingBalanceReport(appIds);
            
            Double totalOutstanding = trueBalances.values().stream()
                    .mapToDouble(BigDecimal::doubleValue)
                    .sum();
//--------------------------------------------------------------------------------
            List<Map<String, Object>> recentPortfolio = reportingRepo.findRecentApplicationsForDashboard().stream()
                    .limit(10)
                    .map(this::buildRecentPortfolioRow)
                    .collect(Collectors.toList());

            Map<String, Object> dashboard = new HashMap<>();
       //   dashboard.put("totalActiveLoans", approvedCount);
            dashboard.put("pendingApplications", pendingCount);
            dashboard.put("approvedApplications", approvedCount);
            dashboard.put("totalAmountDisbursed", totalDisbursed);
            dashboard.put("totalOutstandingBalance", totalOutstanding);
            dashboard.put("totalCustomers", totalCustomers);
            dashboard.put("recentCustomerPortfolio", recentPortfolio);

            return dashboard;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate Admin Loan Dashboard: " + ex.getMessage(), ex);
        }
    }
// ---------------- build portfolio for recentPortfolio --------------
    private Map<String, Object> buildRecentPortfolioRow(LoanApplication la) {
        Map<String, Object> row = new HashMap<>();
        row.put("applicationId", la.getApplicationId());
        row.put("customerName", la.getCustomer().getName());
        row.put("bankName", la.getBank().getBankName());
        row.put("productType", la.getLoanProduct().getLoanProductName());
        row.put("requestedAmount", la.getLoanAmount());
        row.put("kycStatus", la.getCustomer().getKycStatus());
        row.put("applicationStatus", la.getApprovalStatus());
        row.put("loanApprovalDate", la.getApprovalDate());
        return row;
    }

// ================  ADMIN 2: REPAYMENT ===================================================================================================

    public Map<String, Object> getAdminRepaymentReport() {
        try {
            BigDecimal totalExpected = Optional.ofNullable(reportingRepo.sumTotalExpectedRepayments()).orElse(BigDecimal.ZERO);
            BigDecimal totalCollected = Optional.ofNullable(reportingRepo.sumTotalCollectedRepayments()).orElse(BigDecimal.ZERO);
            Long completedCount = reportingRepo.countCompletedRepayments();
            Long pendingCount = reportingRepo.countPendingRepayments();

            List<Map<String, Object>> repaymentPerformance = reportingRepo.findAllRepaymentsWithFullDetails().stream()
                    .map(this::buildRepaymentPerformanceRow)
                    .collect(Collectors.toList());

            Map<String, Object> report = new HashMap<>();
            report.put("totalExpectedRepayments", totalExpected);
            report.put("totalCollectedRepayment", totalCollected);
            report.put("numberOfCompletedRepayments", completedCount);
            report.put("numberOfPendingRepayments", pendingCount);
            report.put("detailedRepaymentPerformance", repaymentPerformance);

            return report;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate Admin Repayment Report: " + ex.getMessage(), ex);
        }
    }

    private Map<String, Object> buildRepaymentPerformanceRow(Repayments r) {
        Map<String, Object> row = new HashMap<>();
        row.put("repaymentId", r.getRepaymentId());
        row.put("customerName", r.getLoanApplication().getCustomer().getName());
        row.put("applicationId", r.getLoanApplication().getApplicationId());
        row.put("bankName", r.getLoanApplication().getBank().getBankName());
        row.put("productType", r.getLoanApplication().getLoanProduct().getLoanProductName());
        row.put("emiAmount", r.getAmountDue());   
        row.put("amountDue", r.getAmountDue());
        row.put("paymentDate", r.getPaymentDate());
        row.put("dueDate", r.getDueDate());
        row.put("paymentStatus", r.getPaymentStatus());
        return row;
    }

// ========================  ADMIN 3: OUTSTANDING LOAN ==============================

    public Map<String, Object> getAdminOutstandingReport() {
        try {
            LocalDate today = LocalDate.now();

            List<LoanApplication> allApprovedLoans = reportingRepo.findAllApprovedLoans();
            List<Integer> appIds = allApprovedLoans.stream().map(LoanApplication::getApplicationId).collect(Collectors.toList());
            Map<Integer, BigDecimal> trueBalances = repaymentsService.generateBulkOutstandingBalanceReport(appIds);

            // Filter out fully paid off loan items early
            List<LoanApplication> outstandingLoans = allApprovedLoans.stream()
                    .filter(la -> trueBalances.getOrDefault(la.getApplicationId(), BigDecimal.ZERO).compareTo(BigDecimal.ZERO) > 0)
                    .collect(Collectors.toList());
            
            //1 realTotalOutstanding
            BigDecimal realTotalOutstanding = outstandingLoans.stream()
                    .map(la -> trueBalances.get(la.getApplicationId()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            //3 largestOutstanding
            BigDecimal largestOutstanding = outstandingLoans.stream()
                    .map(la -> trueBalances.get(la.getApplicationId()))
                    .max(BigDecimal::compareTo)
                    .orElse(BigDecimal.ZERO);
            
            //4 avgOutstanding        
            BigDecimal avgOutstanding = outstandingLoans.isEmpty() ? BigDecimal.ZERO : 
                    realTotalOutstanding.divide(BigDecimal.valueOf(outstandingLoans.size()), 2, java.math.RoundingMode.HALF_UP);

            //2 trueOverdueCount
            long trueOverdueCount = 0;
            List<Map<String, Object>> outstandingPortfolio = new ArrayList<>();
            
            for (LoanApplication la : outstandingLoans) {
                BigDecimal trueBalance = trueBalances.get(la.getApplicationId());
                                          //-- 5 build portfolio
                Map<String, Object> row = buildOutstandingPortfolioRow(la, today, trueBalance);
                outstandingPortfolio.add(row);
                
                // Calculate the count based on actual overdue age tracking metrics
                if ((long) row.get("daysOverdue") > 0) {
                    trueOverdueCount++;
                }
            }
            //----------

            //6 Sort portfolio by balance descending cleanly using explicit type mapping conversions
            outstandingPortfolio.sort((a, b) -> ((BigDecimal) b.get("outstandingBalance")).compareTo((BigDecimal) a.get("outstandingBalance")));

            Map<String, Object> report = new HashMap<>();
            report.put("totalOutstandingBalance", realTotalOutstanding);
            report.put("countOfOverdueLoans", trueOverdueCount); 
            report.put("largestOutstandingAmount", largestOutstanding);
            report.put("averageOutstandingBalance", avgOutstanding);
            report.put("detailedOutstandingPortfolio", outstandingPortfolio);

            return report;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate Admin Outstanding Loan Report: " + ex.getMessage(), ex);
        }
    }

 // ---------------- 5 build portfolio for OutstandingPortfolio --------------
    private Map<String, Object> buildOutstandingPortfolioRow(LoanApplication la, LocalDate today, BigDecimal trueBalance) {
    	
    	// -------- find the daysOverdue of a loan 
        List<Repayments> overdueRepayments = reportingRepo.findOverdueRepaymentsByApplicationId(la.getApplicationId(), today);
        long daysOverdue = 0;
        if (!overdueRepayments.isEmpty()) {
            LocalDate oldestDueDate = overdueRepayments.get(0).getDueDate();
            daysOverdue = ChronoUnit.DAYS.between(oldestDueDate, today);
        }
        //-------

        Map<String, Object> row = new HashMap<>();
        row.put("customerName", la.getCustomer().getName());
        row.put("customerId", la.getCustomer().getCustomerId());
        row.put("applicationId", la.getApplicationId());
        row.put("bankName", la.getBank().getBankName());
        row.put("productType", la.getLoanProduct().getLoanProductName());
        row.put("originalLoanAmount", la.getLoanAmount());
        row.put("outstandingBalance", trueBalance); 
        row.put("interestRate", la.getLoanProduct().getInterestRate());
        row.put("daysOverdue", daysOverdue);
        row.put("loanStatus", la.getApprovalStatus());
        row.put("approvalDate", la.getApprovalDate());
        return row;
    }

// ====================== CUSTOMER 1: LOAN SUMMARY ==============================================================

    public Map<String, Object> getCustomerLoanSummary(Integer customerId) {
        validateCustomerExists(customerId);
        try {
            List<LoanApplication> customerLoans = reportingRepo.findLoanApplicationsByCustomer(customerId);

            Long activeLoans = reportingRepo.countApprovedLoansByCustomer(customerId);
            
           // totalApprovedAmount
            Double totalApproved = customerLoans.stream()
                    .filter(la -> "APPROVED".equalsIgnoreCase(String.valueOf(la.getApprovalStatus())))
                    .mapToDouble(LoanApplication::getLoanAmount)
                    .sum();

            BigDecimal totalRepaymentAmount = Optional.ofNullable(reportingRepo.sumTotalRepaymentAmountByCustomer(customerId)).orElse(BigDecimal.ZERO);

            List<BigDecimal> nextAmounts = reportingRepo.findNextRepaymentAmountByCustomer(customerId);
            BigDecimal nextRepaymentAmount = nextAmounts.isEmpty() ? BigDecimal.ZERO : nextAmounts.get(0);

            List<LocalDate> nextDates = reportingRepo.findNextDueDateByCustomer(customerId);
            LocalDate nextDueDate = nextDates.isEmpty() ? null : nextDates.get(0);
           //--------remaining principle
            List<Integer> appIds = customerLoans.stream()
                    .map(LoanApplication::getApplicationId)
                    .collect(Collectors.toList());
                    
            Map<Integer, BigDecimal> trueBalances = repaymentsService.generateBulkOutstandingBalanceReport(appIds);
            
            BigDecimal remainingPrincipal = trueBalances.values().stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            List<Map<String, Object>> loanDetails = new ArrayList<>();
            for (LoanApplication la : customerLoans) {
                BigDecimal trueBalance = trueBalances.getOrDefault(la.getApplicationId(), BigDecimal.ZERO);
                
                // Total repayment lookup strategy handled per target entry point instance mapping 
                BigDecimal loanTotalRepayment = Optional.ofNullable(reportingRepo.sumTotalRepaymentAmountByApplicationId(la.getApplicationId())).orElse(BigDecimal.ZERO);
                
                loanDetails.add(buildCustomerLoanDetailRow(la, nextDueDate, trueBalance, loanTotalRepayment));
            }
            
            Map<String, Object> summary = new HashMap<>();
            summary.put("totalActiveLoans", activeLoans);
            summary.put("totalApprovedAmount", totalApproved);
            summary.put("totalRepaymentAmount", totalRepaymentAmount); 
            summary.put("remainingPrincipal", remainingPrincipal);
            summary.put("nextRepaymentAmount", nextRepaymentAmount);
            summary.put("loanDetails", loanDetails);

            return summary;
        } catch (ResourceNotFoundException re) {
            throw re; 
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate Customer Loan Summary: " + ex.getMessage(), ex);
        }
    }

    private Map<String, Object> buildCustomerLoanDetailRow(LoanApplication la, LocalDate nextDueDate, BigDecimal trueBalance, BigDecimal loanTotalRepayment) {
        Map<String, Object> row = new HashMap<>();
        row.put("applicationId", la.getApplicationId());
        row.put("loanProduct", la.getLoanProduct().getLoanProductName());
        row.put("totalAmount", la.getLoanAmount());
        row.put("totalRepaymentAmount", loanTotalRepayment); 
        row.put("interestRate", la.getLoanProduct().getInterestRate());
        row.put("outstandingBalance", trueBalance); 
        row.put("loanTenure", la.getLoanProduct().getTenure());
        row.put("nextDueDate", nextDueDate);
        row.put("loanStatus", la.getApprovalStatus());
        row.put("approvalDate", la.getApprovalDate());
        return row;
    }

   // ====================== CUSTOMER 2: REPAYMENT HISTORY ==============================

    public Map<String, Object> getCustomerRepaymentHistory(Integer customerId) {
        validateCustomerExists(customerId);
        try {
            Long totalPayments = reportingRepo.countAllRepaymentsByCustomer(customerId);
            Long completedPayments = reportingRepo.countCompletedRepaymentsByCustomer(customerId);
            Optional<LocalDate> latestPaymentDate = reportingRepo.findLatestPaymentDateByCustomer(customerId);
            Optional<LocalDate> nextPaymentDate = reportingRepo.findNextPaymentDateByCustomer(customerId);

            List<Map<String, Object>> repaymentLog = reportingRepo.findRepaymentHistoryByCustomer(customerId).stream()
                    .map(this::buildRepaymentLogRow)
                    .collect(Collectors.toList());

            Map<String, Object> history = new HashMap<>();
            history.put("totalPaymentsMade", totalPayments);
            history.put("numberOfCompletedPayments", completedPayments);
            history.put("latestPaymentDate", latestPaymentDate.orElse(null));
            history.put("nextPaymentDate", nextPaymentDate.orElse(null));
            history.put("detailedRepaymentLog", repaymentLog);

            return history;
        } catch (ResourceNotFoundException re) {
            throw re;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate Customer Repayment History: " + ex.getMessage(), ex);
        }
    }

    private Map<String, Object> buildRepaymentLogRow(Repayments r) {
        Map<String, Object> row = new HashMap<>();
        row.put("repaymentId", r.getRepaymentId());
        row.put("loanProduct", r.getLoanApplication().getLoanProduct().getLoanProductName());
        row.put("dueDate", r.getDueDate());
        row.put("amountDue", r.getAmountDue());
        row.put("paymentDate", r.getPaymentDate());
        row.put("paymentStatus", r.getPaymentStatus());
        return row;
    }

 // ===========================  CUSTOMER 3: OUTSTANDING BALANCE  ===================================

    public Map<String, Object> getCustomerOutstandingBalance(Integer customerId) {
        validateCustomerExists(customerId);
        try {
            LocalDate today = LocalDate.now();

         // will pass 'today' so it will grab past due + currently due installments
         // BigDecimal currentDueAmount = Optional.ofNullable(reportingRepo.sumCurrentDueAmountByCustomer(customerId, today)).orElse(BigDecimal.ZERO);
       
            // passed deadline  
            BigDecimal overdueBalance = Optional.ofNullable(reportingRepo.sumOverdueBalanceByCustomer(customerId, today)).orElse(BigDecimal.ZERO);
          // total repayment of approved loajs
            BigDecimal totalRepaymentAmount = Optional.ofNullable(reportingRepo.sumTotalRepaymentAmountByCustomer(customerId)).orElse(BigDecimal.ZERO);

            // outstanding logic starts
            List<LoanApplication> allCustomerApprovedLoans = reportingRepo.findApprovedLoansByCustomer(customerId);
            List<Integer> appIds = allCustomerApprovedLoans.stream().map(LoanApplication::getApplicationId).collect(Collectors.toList());
            Map<Integer, BigDecimal> trueBalances = repaymentsService.generateBulkOutstandingBalanceReport(appIds);
            
            List<LoanApplication> outstandingLoans = allCustomerApprovedLoans.stream()
                    .filter(la -> trueBalances.getOrDefault(la.getApplicationId(), BigDecimal.ZERO).compareTo(BigDecimal.ZERO) > 0)
                    .collect(Collectors.toList());
            
            // complete oustanding of all loan, 
            BigDecimal realTotalOutstanding = outstandingLoans.stream()
                    .map(la -> trueBalances.get(la.getApplicationId()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            List<Map<String, Object>> outstandingDetails = new ArrayList<>();
            for (LoanApplication la : outstandingLoans) {
                BigDecimal trueBalance = trueBalances.get(la.getApplicationId());
                BigDecimal loanTotalRepayment = Optional.ofNullable(reportingRepo.sumTotalRepaymentAmountByApplicationId(la.getApplicationId())).orElse(BigDecimal.ZERO);
                outstandingDetails.add(buildCustomerOutstandingRow(la, today, trueBalance, loanTotalRepayment));
            }
            
            outstandingDetails.sort((a, b) -> ((BigDecimal) b.get("outstandingAmount")).compareTo((BigDecimal) a.get("outstandingAmount")));

            Map<String, Object> balance = new HashMap<>();
            balance.put("totalRepaymentAmount", totalRepaymentAmount); 
            balance.put("totalOutstandingBalance", realTotalOutstanding); 
       //   balance.put("currentDueAmount", currentDueAmount);
            balance.put("overdueBalance", overdueBalance);
            balance.put("outstandingBalanceDetails", outstandingDetails);

            return balance;
        } catch (ResourceNotFoundException re) {
            throw re;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate Customer Outstanding Balance: " + ex.getMessage(), ex);
        }
    }

    private Map<String, Object> buildCustomerOutstandingRow(LoanApplication la, LocalDate today, BigDecimal trueBalance, BigDecimal loanTotalRepayment) {
        List<Repayments> overdueRepayments = reportingRepo.findOverdueRepaymentsByApplicationId(la.getApplicationId(), today);
        long daysOverdue = 0;
        if (!overdueRepayments.isEmpty()) {
            LocalDate oldestDueDate = overdueRepayments.get(0).getDueDate();
            daysOverdue = ChronoUnit.DAYS.between(oldestDueDate, today);
        }

        Optional<LocalDate> nextDueDate = reportingRepo.findNextDueDateByApplicationId(la.getApplicationId());

        Map<String, Object> row = new HashMap<>();
        row.put("applicationId", la.getApplicationId());
        row.put("principalAmount", la.getLoanAmount());
        row.put("totalRepaymentAmount", loanTotalRepayment); 
        row.put("outstandingAmount", trueBalance); 
        row.put("daysOverdue", daysOverdue);
        row.put("nextDueDate", nextDueDate.orElse(null));
        row.put("loanStatus", la.getApprovalStatus());
        return row;
    }

    private void validateCustomerExists(Integer customerId) {
        if (customerId == null || customerId <= 0) {
            throw new ResourceNotFoundException("Invalid customer ID: " + customerId
                    + ". Please provide a valid positive customer ID.");
        }
        boolean exists = reportingRepo.existsApplicationForCustomer(customerId);
        if (!exists) {
            throw new ResourceNotFoundException("No loan records found for customer ID: "
                    + customerId + ". Please check the customer ID and try again.");
        }
    }
}