package com.BankLoanManagement.entities;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Entity // Tells spring boot and hibernate that this java class represents a database table.
@Table(name="repayments")
@Data // Lombok annotation which generates all boilerplate code (getters and setters) at compile time
@NoArgsConstructor
@AllArgsConstructor
public class Repayments {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "repayment_id")
	private Integer repaymentId;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "loan_application_application_id", nullable = false)
	private LoanApplication loanApplication;

	
	
	// Stores the date the EMI is scheduled to be paid
	@Column(name = "due_date" , nullable = false)
	private LocalDate dueDate;
	
	// Renamed to 'amountDue' so Lombok generates 'setAmountDue()' to match our Service logic perfectly.
	// Maximum no.of digits is 10 and decimal upto 2 places
	@Column(name="amount_due", nullable = false, precision = 10, scale = 2)
	private BigDecimal amountDue; 
	
	// REMOVED 'nullable = false' because this MUST be blank until the customer actually makes a payment!
	@Column(name="payment_date") 
	private LocalDate paymentDate;
	
	// Defines a custom enumeration type, restricting the values this variable can hold.
	public enum PaymentStatus {
		PENDING, COMPLETED
	}
	
	// Tells hibernate to store enum text (e.g., "PENDING") instead of a numerical index
	@Enumerated(EnumType.STRING)
	@Column(name = "payment_status" , nullable = false)
	private PaymentStatus paymentStatus;
	
}