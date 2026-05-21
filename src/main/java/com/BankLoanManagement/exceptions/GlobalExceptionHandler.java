package com.BankLoanManagement.exceptions;
 
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

 
@RestControllerAdvice // tells Spring this class intercepts exceptions globally
public class GlobalExceptionHandler {
 
    // 1. handle our specific custom exception
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleResourceNotFoundException(ResourceNotFoundException exception) {
        
        return new ResponseEntity<>(exception.getMessage(), HttpStatus.NOT_FOUND);
    }
 
    // 2. handle generic/unexpected exceptions (The "Catch-All")
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleGlobalException(Exception exception) {
        
        return new ResponseEntity<>(exception.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
    // 3. arithmetic exception
    @ExceptionHandler(ArithmeticException.class)
    public ResponseEntity<String> handleArithmeticException(ArithmeticException exception){
    	    return new ResponseEntity <>(exception.getMessage() , HttpStatus.NOT_FOUND) ; 
    }
}