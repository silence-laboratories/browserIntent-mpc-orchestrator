import express from 'express';
import { getUserWallets, getWalletCount } from '../controllers/walletController';
import { requireBrowserJWT } from '../middleware/authJWT';

const router = express.Router();

// Get all wallets for the authenticated user
router.get('/wallets', requireBrowserJWT, getUserWallets);

// Get wallet count for the authenticated user (lighter endpoint)
router.get('/wallets/count', requireBrowserJWT, getWalletCount);

export default router;
