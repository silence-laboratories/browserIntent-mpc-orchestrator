import express from 'express';
import { 
  createTransaction, 
  getTransactions, 
  getTransaction, 
  getTransactionStatus,
  approveTransaction, 
  rejectTransaction 
} from '../controllers/transactionController';
import { requireBrowserJWT, requirePhoneJWT } from '../middleware/authJWT';

const router = express.Router();

// Test endpoint (no authentication required)
router.post('/transactions/test', (req, res) => {
  console.log('Test transaction endpoint called:', req.body);
  res.json({ 
    success: true, 
    message: 'Test transaction endpoint working',
    data: req.body 
  });
});

// Test endpoint with authentication check
router.post('/transactions/test-auth', requireBrowserJWT, (req, res) => {
  console.log('Authenticated test transaction endpoint called:', req.body);
  res.json({ 
    success: true, 
    message: 'Authenticated test transaction endpoint working',
    data: req.body,
    userId: (req as any).user_id
  });
});

// Transaction Management (Browser App)
router.post('/transactions', requireBrowserJWT, createTransaction);
router.get('/transactions', requireBrowserJWT, getTransactions);
router.get('/transactions/:transactionId', requireBrowserJWT, getTransaction);
router.get('/transactions/:transactionId/status', requireBrowserJWT, getTransactionStatus);

// Transaction Actions (Phone App)
router.post('/transactions/:transactionId/approve', requirePhoneJWT, approveTransaction);
router.post('/transactions/:transactionId/reject', requirePhoneJWT, rejectTransaction);

export default router;