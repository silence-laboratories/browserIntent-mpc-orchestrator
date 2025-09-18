import { Request, Response } from 'express';
import { firestore } from '../firebase/admin';
import { logger } from '../middleware/logger';

interface Wallet {
  id: string;
  keyId: string;
  publicKey: string;
  address: string;
  deviceId: string;
  userId: string;
  name: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export const getUserWallets = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user_id;

    logger.info({
      message: 'getUserWallets endpoint called',
      userId,
      url: req.url,
      method: req.method
    });

    // Get all wallets for the user
    const walletsSnapshot = await firestore
      .collection('wallets')
      .where('userId', '==', userId)
      .get();

    const wallets = walletsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        keyId: data.keyId,
        publicKey: data.publicKey,
        address: data.address,
        deviceId: data.deviceId,
        userId: data.userId,
        name: data.name,
        description: data.description,
        tags: data.tags,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as Wallet;
    });

    logger.info({
      message: 'getUserWallets completed successfully',
      userId,
      walletCount: wallets.length
    });

    res.json({
      success: true,
      wallets,
      count: wallets.length
    });
  } catch (error) {
    logger.error({
      message: 'getUserWallets failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: (req as any).user_id
    });
    
    res.status(500).json({ 
      error: 'internal_error',
      message: 'Failed to retrieve user wallets'
    });
  }
};

export const getWalletCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user_id;

    logger.info({
      message: 'getWalletCount endpoint called',
      userId,
      url: req.url,
      method: req.method
    });

    // Get count of wallets for the user
    const walletsSnapshot = await firestore
      .collection('wallets')
      .where('userId', '==', userId)
      .get();

    const count = walletsSnapshot.size;

    logger.info({
      message: 'getWalletCount completed successfully',
      userId,
      walletCount: count
    });

    res.json({
      success: true,
      count,
      hasWallets: count > 0
    });
  } catch (error) {
    logger.error({
      message: 'getWalletCount failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: (req as any).user_id
    });
    
    res.status(500).json({ 
      error: 'internal_error',
      message: 'Failed to retrieve wallet count'
    });
  }
};
