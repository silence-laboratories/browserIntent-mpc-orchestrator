import express from 'express';
import { getUserWallets, getWalletCount } from '../controllers/walletController';
import { requireFirebaseAuth } from '../middleware/authFirebase';

const router = express.Router();

// Get all wallets for the authenticated user (now using Firebase ID token)
router.get('/wallets', requireFirebaseAuth, getUserWallets);

// Get wallet count for the authenticated user (now using Firebase ID token)
router.get('/wallets/count', requireFirebaseAuth, getWalletCount);

export default router;
