package com.BankLoanManagement.services;

import com.BankLoanManagement.entities.LoanApplication;
import com.BankLoanManagement.entities.Repayments;
import com.BankLoanManagement.exceptions.ResourceNotFoundException;
import com.BankLoanManagement.repositories.ReportingRepo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
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

    // =================================================================
    // ==================  ADMIN REPORT 1: LOAN DASHBOARD  =============
    // =================================================================

    public Map<String, Object> getAdminLoanDashboard() {
        try {
            Long approvedCount = reportingRepo.countApprovedLoans();
            Long pendingCount = reportingRepo.countPendingLoans();
            Double totalDisbursed = reportingRepo.sumTotalAmountDisbursed();
            Long totalCustomers = reportingRepo.countTotalCustomers();

            // ⭐ Calculate total outstanding safely in RAM
            List<LoanApplication> allApproved = reportingRepo.findAllApprovedLoans();
            List<Integer> appIds = allApproved.stream().map(LoanApplication::getApplicationId).collect(Collectors.toList());
            Map<Integer, BigDecimal> trueBalances = repaymentsService.generateBulkOutstandingBalanceReport(appIds);
            Double totalOutstanding = trueBalances.values().stream().mapToDouble(BigDecimal::doubleValue).sum();

            List<LoanApplication> recentApps = reportingRepo.findRecentApplicationsForDashboard();
            List<Map<String, Object>> recentPortfolio = new ArrayList<>();

            int limit = Math.min(recentApps.size(), 10);
            for (int i = 0; i < limit; i++) {
                recentPortfolio.add(buildRecentPortfolioRow(recentApps.get(i)));
            }

            Map<String, Object> dashboard = new HashMap<>();
            dashboard.put("totalActiveLoans", approvedCount);
            dashboard.put("pendingApplications", pendingCount);
            dashboard.put("approvedApplications", approvedCount);
            dashboard.put("totalAmountDisbursed", totalDisbursed);
            dashboard.put("totalOutstandingBalance", totalOutstanding);
            dashboard.put("totalCustomers", totalCustomers);
            dashboard.put("recentCustomerPortfolio", recentPortfolio);

            return dashboard;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate Admin Loan Dashboard: " + ex.getMessage());
        }
    }

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

    // =================================================================
    // ================  ADMIN REPORT 2: REPAYMENT REPORT  =============
    // =================================================================

    public Map<String, Object> getAdminRepaymentReport() {
        try {
            BigDecimal totalExpected = reportingRepo.sumTotalExpectedRepayments();
            BigDecimal totalCollected = reportingRepo.sumTotalCollectedRepayments();
            Long completedCount = reportingRepo.countCompletedRepayments();
            Long pendingCount = reportingRepo.countPendingRepayments();

            List<Repayments> allRepayments = reportingRepo.findAllRepaymentsWithFullDetails();
            List<Map<String, Object>> repaymentPerformance = new ArrayList<>();

            for (Repayments r : allRepayments) {
                repaymentPerformance.add(buildRepaymentPerformanceRow(r));
            }

            Map<String, Object> report = new HashMap<>();
            report.put("totalExpectedRepayments", totalExpected);
            report.put("totalCollectedRepayment", totalCollected);
            report.put("numberOfCompletedRepayments", completedCount);
            report.put("numberOfPendingRepayments", pendingCount);
            report.put("detailedRepaymentPerformance", repaymentPerformance);

            return report;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate Admin Repayment Report: " + ex.getMessage());
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

    // =================================================================
    // =============  ADMIN REPORT 3: OUTSTANDING LOAN REPORT  =========
    // =================================================================

    public Map<String, Object> getAdminOutstandingReport() {
        try {
            LocalDate today = LocalDate.now();

            List<LoanApplication> allApprovedLoans = reportingRepo.findAllApprovedLoans();
            List<Integer> appIds = allApprovedLoans.stream().map(LoanApplication::getApplicationId).collect(Collectors.toList());
            Map<Integer, BigDecimal> trueBalances = repaymentsService.generateBulkOutstandingBalanceReport(appIds);

            // ⭐ Filter ONLY loans that actually have a balance > 0 in RAM
            List<LoanApplication> outstandingLoans = new ArrayList<>();
            for (LoanApplication la : allApprovedLoans) {
                if (trueBalances.getOrDefault(la.getApplicationId(), BigDecimal.ZERO).compareTo(BigDecimal.ZERO) > 0) {
                    outstandingLoans.add(la);
                }
            }

            Long overdueCount = (long) outstandingLoans.size();
            
            BigDecimal realTotalOutstanding = outstandingLoans.stream()
                    .map(la -> trueBalances.get(la.getApplicationId()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal largestOutstanding = outstandingLoans.stream()
                    .map(la -> trueBalances.get(la.getApplicationId()))
                    .max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
                    
            BigDecimal avgOutstanding = outstandingLoans.isEmpty() ? BigDecimal.ZERO : 
                    realTotalOutstanding.divide(BigDecimal.valueOf(outstandingLoans.size()), 2, java.math.RoundingMode.HALF_UP);

            List<Map<String, Object>> outstandingPortfolio = new ArrayList<>();
            for (LoanApplication la : outstandingLoans) {
                BigDecimal trueBalance = trueBalances.get(la.getApplicationId());
                outstandingPortfolio.add(buildOutstandingPortfolioRow(la, today, trueBalance));
            }

            // Sort portfolio by balance descending
            outstandingPortfolio.sort((a, b) -> ((BigDecimal) b.get("outstandingBalance")).compareTo((BigDecimal) a.get("outstandingBalance")));

            Map<String, Object> report = new HashMap<>();
            report.put("totalOutstandingBalance", realTotalOutstanding);
            report.put("countOfOverdueLoans", overdueCount);
            report.put("largestOutstandingAmount", largestOutstanding);
            report.put("averageOutstandingBalance", avgOutstanding);
            report.put("detailedOutstandingPortfolio", outstandingPortfolio);

            return report;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate Admin Outstanding Loan Report: " + ex.getMessage());
        }
    }

    private Map<String, Object> buildOutstandingPortfolioRow(LoanApplication la, LocalDate today, BigDecimal trueBalance) {
        List<Repayments> overdueRepayments = reportingRepo.findOverdueRepaymentsByApplicationId(la.getApplicationId(), today);
        long daysOverdue = 0;
        if (!overdueRepayments.isEmpty()) {
            LocalDate oldestDueDate = overdueRepayments.get(0).getDueDate();
            daysOverdue = ChronoUnit.DAYS.between(oldestDueDate, today);
        }

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

    // =================================================================
    // ===============  CUSTOMER REPORT 1: LOAN SUMMARY  ===============
    // =================================================================

    public Map<String, Object> getCustomerLoanSummary(Integer customerId) {
        validateCustomerExists(customerId);
        try {
            List<LoanApplication> customerLoans = reportingRepo.findLoanApplicationsByCustomer(customerId);

            Long activeLoans = reportingRepo.countApprovedLoansByCustomer(customerId);
            Double totalApproved = customerLoans.stream()
                    .filter(la -> "APPROVED".equalsIgnoreCase(String.valueOf(la.getApprovalStatus())))
                    .mapToDouble(LoanApplication::getLoanAmount)
                    .sum();

            List<BigDecimal> nextAmounts = reportingRepo.findNextRepaymentAmountByCustomer(customerId);
            BigDecimal nextRepaymentAmount = nextAmounts.isEmpty() ? BigDecimal.ZERO : nextAmounts.get(0);

            List<LocalDate> nextDates = reportingRepo.findNextDueDateByCustomer(customerId);
            LocalDate nextDueDate = nextDates.isEmpty() ? null : nextDates.get(0);

            List<Integer> appIds = customerLoans.stream()
                    .map(LoanApplication::getApplicationId)
                    .collect(Collectors.toList());
                    
            Map<Integer, BigDecimal> trueBalances = repaymentsService.generateBulkOutstandingBalanceReport(appIds);
            
            BigDecimal remainingPrincipal = trueBalances.values().stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            List<Map<String, Object>> loanDetails = new ArrayList<>();
            for (LoanApplication la : customerLoans) {
                BigDecimal trueBalance = trueBalances.getOrDefault(la.getApplicationId(), BigDecimal.ZERO);
                loanDetails.add(buildCustomerLoanDetailRow(la, nextDueDate, trueBalance));
            }
            
            Map<String, Object> summary = new HashMap<>();
            summary.put("totalActiveLoans", activeLoans);
            summary.put("totalApprovedAmount", totalApproved);
            summary.put("remainingPrincipal", remainingPrincipal);
            summary.put("nextRepaymentAmount", nextRepaymentAmount);
            summary.put("loanDetails", loanDetails);

            return summary;
        } catch (ResourceNotFoundException re) {
            throw re; 
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate Customer Loan Summary: " + ex.getMessage());
        }
    }

    private Map<String, Object> buildCustomerLoanDetailRow(LoanApplication la, LocalDate nextDueDate, BigDecimal trueBalance) {
        Map<String, Object> row = new HashMap<>();
        row.put("applicationId", la.getApplicationId());
        row.put("loanProduct", la.getLoanProduct().getLoanProductName());
        row.put("totalAmount", la.getLoanAmount());
        row.put("interestRate", la.getLoanProduct().getInterestRate());
        row.put("outstandingBalance", trueBalance); 
        row.put("loanTenure", la.getLoanProduct().getTenure());
        row.put("nextDueDate", nextDueDate);
        row.put("loanStatus", la.getApprovalStatus());
        row.put("approvalDate", la.getApprovalDate());
        return row;
    }

    // =================================================================
    // ===========  CUSTOMER REPORT 2: REPAYMENT HISTORY  =============
    // =================================================================

    public Map<String, Object> getCustomerRepaymentHistory(Integer customerId) {
        validateCustomerExists(customerId);
        try {
            Long totalPayments = reportingRepo.countAllRepaymentsByCustomer(customerId);
            Long completedPayments = reportingRepo.countCompletedRepaymentsByCustomer(customerId);
            Optional<LocalDate> latestPaymentDate = reportingRepo.findLatestPaymentDateByCustomer(customerId);
            Optional<LocalDate> nextPaymentDate = reportingRepo.findNextPaymentDateByCustomer(customerId);

            List<Repayments> repayments = reportingRepo.findRepaymentHistoryByCustomer(customerId);
            List<Map<String, Object>> repaymentLog = new ArrayList<>();

            for (Repayments r : repayments) {
                repaymentLog.add(buildRepaymentLogRow(r));
            }

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
            throw new RuntimeException("Failed to generate Customer Repayment History: " + ex.getMessage());
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

    // =================================================================
    // ===========  CUSTOMER REPORT 3: OUTSTANDING BALANCE  ===========
    // =================================================================

    public Map<String, Object> getCustomerOutstandingBalance(Integer customerId) {
        validateCustomerExists(customerId);
        try {
            LocalDate today = LocalDate.now();

            BigDecimal currentDueAmount = reportingRepo.sumCurrentDueAmountByCustomer(customerId);
            BigDecimal overdueBalance = reportingRepo.sumOverdueBalanceByCustomer(customerId, today);

            List<LoanApplication> allCustomerApprovedLoans = reportingRepo.findApprovedLoansByCustomer(customerId);
            List<Integer> appIds = allCustomerApprovedLoans.stream().map(LoanApplication::getApplicationId).collect(Collectors.toList());
            Map<Integer, BigDecimal> trueBalances = repaymentsService.generateBulkOutstandingBalanceReport(appIds);
            
            // ⭐ Filter for balances > 0 in RAM
            List<LoanApplication> outstandingLoans = new ArrayList<>();
            for(LoanApplication la : allCustomerApprovedLoans) {
                if (trueBalances.getOrDefault(la.getApplicationId(), BigDecimal.ZERO).compareTo(BigDecimal.ZERO) > 0) {
                    outstandingLoans.add(la);
                }
            }
            
            BigDecimal realTotalOutstanding = outstandingLoans.stream()
                    .map(la -> trueBalances.get(la.getApplicationId()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            List<Map<String, Object>> outstandingDetails = new ArrayList<>();
            for (LoanApplication la : outstandingLoans) {
                BigDecimal trueBalance = trueBalances.get(la.getApplicationId());
                outstandingDetails.add(buildCustomerOutstandingRow(la, today, trueBalance));
            }
            
            outstandingDetails.sort((a, b) -> ((BigDecimal) b.get("outstandingAmount")).compareTo((BigDecimal) a.get("outstandingAmount")));

            Map<String, Object> balance = new HashMap<>();
            balance.put("totalOutstandingBalance", realTotalOutstanding); 
            balance.put("currentDueAmount", currentDueAmount);
            balance.put("overdueBalance", overdueBalance);
            balance.put("outstandingBalanceDetails", outstandingDetails);

            return balance;
        } catch (ResourceNotFoundException re) {
            throw re;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate Customer Outstanding Balance: " + ex.getMessage());
        }
    }

    private Map<String, Object> buildCustomerOutstandingRow(LoanApplication la, LocalDate today, BigDecimal trueBalance) {
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
        row.put("remainingBalance", trueBalance); 
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