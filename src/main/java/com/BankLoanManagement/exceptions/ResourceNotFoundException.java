package com.BankLoanManagement.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

// This tells Spring to return a 404 Not Found automatically when this exception is thrown
@ResponseStatus(value = HttpStatus.NOT_FOUND)
public class  ResourceNotFoundException extends RuntimeException {
    
    public ResourceNotFoundException(String message) {
        super(message);
    }
    
}