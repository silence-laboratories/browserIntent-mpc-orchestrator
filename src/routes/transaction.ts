import express from 'express';
import { 
  createTransaction, 
  getTransactions, 
  getTransaction, 
  getTransactionStatus,
  approveTransaction, 
  rejectTransaction,
  registerAgent,
  agentSignRequest,
  approveAgentRequest,
  rejectAgentRequest,
  getAgentStatus
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

// Agent Registration (Browser App)
router.post('/register-agent', requireBrowserJWT, registerAgent);

// Agent Sign Request (No authentication - uses agentToken)
router.post('/agent-sign-request', agentSignRequest);

// Agent Status Check (No authentication - uses agentToken)
router.post('/agent-status', getAgentStatus);

// Agent Request Actions (Phone App)
router.post('/agent-requests/:agentRequestId/approve', requirePhoneJWT, approveAgentRequest);
router.post('/agent-requests/:agentRequestId/reject', requirePhoneJWT, rejectAgentRequest);

export default router;