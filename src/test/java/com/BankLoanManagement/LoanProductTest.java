package com.BankLoanManagement;
	import static org.junit.jupiter.api.Assertions.*;

	import java.util.List;
	import org.junit.jupiter.api.BeforeEach;
	import org.junit.jupiter.api.Test;
	import org.springframework.beans.factory.annotation.Autowired;
	import org.springframework.boot.test.context.SpringBootTest;
	import org.springframework.transaction.annotation.Transactional;

	import com.BankLoanManagement.entities.Banks;
	import com.BankLoanManagement.entities.LoanProducts;
	import com.BankLoanManagement.repositories.BanksRepo;
	import com.BankLoanManagement.repositories.LoanProductsRepo;
import com.BankLoanManagement.services.LoanProductsService;

	@SpringBootTest
	@Transactional 
	public class LoanProductTest {

		    @Autowired
		    private LoanProductsService loanProductsService;

		    @Autowired
		    private BanksRepo banksRepo;

		    @Autowired
		    private LoanProductsRepo loanProductsRepo;

		    private Integer targetBankId;

		    @BeforeEach
		    public void setUp() {
		        // Dynamically find any existing bank from your DB to attach loans to
		        List<Banks> existingBanks = banksRepo.findAll();
		        if (!existingBanks.isEmpty()) {
		            // Grab the first ID (e.g., your existing bank from the screenshot)
		            targetBankId = existingBanks.get(0).getBankID(); 
		        } else {
		            // Fallback setup if your DB was completely empty
		            Banks defaultBank = new Banks();
		            defaultBank.setBankName("Test Baseline Bank");
		            targetBankId = banksRepo.save(defaultBank).getBankID();
		        }
		    }

		    // TEST FOR: getLoanProduct()
		    @Test
		    public void testGetLoanProduct() {
		        List<LoanProducts> products = loanProductsService.getLoanProduct();
		        
		        assertNotNull(products);
		        assertTrue(products.size() > 0, "Database should contain existing loan products");
		    }

		    // TEST FOR: getLoanProductById(Integer id)
		    @Test
		    public void testGetLoanProductById() {
		      
		        LoanProducts lp = createProduct(104, "Test Speed Loan", 10.0, 5000.0, 50000.0, 12);
		        lp.setBank(banksRepo.findById(targetBankId).get());
		        loanProductsRepo.save(lp);

		        // Act
		        LoanProducts found = loanProductsService.getLoanProductById(104);

		        // Assert
		        assertNotNull(found);
		        assertEquals("Test Speed Loan", found.getLoanProductName());
		    }

		    //  TEST FOR: addLoanProduct
		    @Test
		    public void testAddLoanProduct() {
		        LoanProducts newProduct = createProduct(992, "Test Agri Loan", 6.5, 10000.0, 200000.0, 36);

		        LoanProducts saved = loanProductsService.addLoanProduct(targetBankId, newProduct);

		        assertNotNull(saved);
		        assertEquals(992, saved.getLoanProductID());
		        assertEquals("Test Agri Loan", saved.getLoanProductName());
		    }

		    //  TEST FOR: updateLoanProduct
		    @Test
		    public void testUpdateLoanProduct() {
		        // Setup original record
		        LoanProducts lp = createProduct(9993, "Old Setup Name", 12.0, 1000.0, 10000.0, 24);
		        lp.setBank(banksRepo.findById(targetBankId).get());
		        loanProductsRepo.save(lp);

		        
		        LoanProducts updatedDetails = createProduct(9993, "New Updated Name", 14.5, 2000.0, 15000.0, 36);

		     
		        LoanProducts result = loanProductsService.updateLoanProduct(9993, updatedDetails);

		
		        assertEquals("New Updated Name", result.getLoanProductName());
		        assertEquals(14.5, result.getInterestRate());
		        assertEquals(36, result.getTenure());
		    }

		    //TEST FOR: deleteloanproduct
		    @Test
		    public void testDeleteLoanProduct() {
		      
		        LoanProducts lp = createProduct(9994, "Transient Loan", 8.0, 5000.0, 20000.0, 12);
		        lp.setBank(banksRepo.findById(targetBankId).get());
		        loanProductsRepo.save(lp);

		        loanProductsService.deleteloanproduct(9994);

		        assertFalse(loanProductsRepo.findById(9994).isPresent());
		    }

		    private LoanProducts createProduct(Integer id, String name, double rate, double min, double max, int tenure) {
		        LoanProducts lp = new LoanProducts();
		        lp.setLoanProductID(id); 
		        lp.setLoanProductName(name);
		        lp.setInterestRate(rate);
		        lp.setMinAmount(min);
		        lp.setMaxAmount(max);
		        lp.setTenure(tenure);
		        return lp;
		    }
		}
	


