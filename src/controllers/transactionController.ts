import { Request, Response } from 'express';
import { logger } from '../middleware/logger';
import { firestore } from '../firebase/admin';
import { isAddress, formatEther } from 'viem';
import { simpleNotificationService } from '../services/simpleNotificationService';

interface Transaction {
  id: string;
  walletId: string;
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'FAILED';
  transactionHash?: string;
  error?: string;
  deviceId: string;
  userId: string;
  notificationSent: boolean;
  notificationSentAt?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

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

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { walletId, to, value, data, gasLimit, gasPrice, description } = req.body;
    const userId = (req as any).user_id;

    // Validate required fields
    if (!walletId || !to || !value) {
      return res.status(400).json({
        error: 'missing_required_fields',
        message: 'walletId, to, and value are required'
      });
    }

    // Validate Ethereum address
    if (!isAddress(to)) {
      return res.status(400).json({
        error: 'invalid_address',
        message: 'Invalid Ethereum address'
      });
    }

    // Validate value is positive
    try {
      const valueBigInt = BigInt(value);
      if (valueBigInt <= 0n) {
        return res.status(400).json({
          error: 'invalid_value',
          message: 'Transaction value must be positive'
        });
      }
    } catch {
      return res.status(400).json({
        error: 'invalid_value',
        message: 'Invalid transaction value format'
      });
    }

    // Get wallet from Firestore
    const walletDoc = await firestore
      .collection('wallets')
      .doc(walletId)
      .get();

    if (!walletDoc.exists) {
      return res.status(404).json({
        error: 'wallet_not_found',
        message: 'Wallet not found'
      });
    }

    const wallet = walletDoc.data() as Wallet;

    // Verify user owns this wallet
    if (wallet.userId !== userId) {
      return res.status(403).json({
        error: 'unauthorized',
        message: 'Not authorized to use this wallet'
      });
    }

    // Set transaction expiration (30 minutes from now)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Create transaction record
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      walletId,
      to,
      value,
      data: data || '0x',
      gasLimit: gasLimit || '21000',
      gasPrice: gasPrice || '20000000000',
      description,
      status: 'PENDING',
      deviceId: wallet.deviceId,
      userId,
      notificationSent: false,
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save transaction to Firestore
    await firestore
      .collection('transactions')
      .doc(transaction.id)
      .set(transaction);

    // Send notification to phone app via Firebase Cloud Messaging
    let notificationSuccess = false;
    try {
      console.log('🔍 [TRANSACTION] Looking up phone device token for wallet', {
        transactionId: transaction.id,
        walletId,
        phoneDeviceId: wallet.deviceId,
        timestamp: new Date().toISOString()
      });

      // Get the device token for this wallet
      const deviceTokenDoc = await firestore
        .collection('device_tokens')
        .doc(wallet.deviceId)
        .get();

      if (deviceTokenDoc.exists) {
        const deviceData = deviceTokenDoc.data();
        const deviceToken = deviceData?.deviceToken;
        
        console.log('📱 [TRANSACTION] Phone device token found', {
          transactionId: transaction.id,
          walletId,
          phoneDeviceId: wallet.deviceId,
          hasDeviceToken: !!deviceToken,
          isActive: deviceData?.isActive,
          deviceInfo: deviceData?.deviceInfo,
          timestamp: new Date().toISOString()
        });
        
        if (deviceToken && deviceData?.isActive) {
          console.log('🚀 [TRANSACTION] Sending FCM notification to phone', {
            transactionId: transaction.id,
            walletId,
            phoneDeviceId: wallet.deviceId,
            deviceToken: deviceToken.substring(0, 20) + '...',
            to,
            value,
            description: description || '',
            timestamp: new Date().toISOString()
          });

          // Send FCM notification to phone
          notificationSuccess = await simpleNotificationService.sendTransactionApproval(
            deviceToken,
            {
              transactionId: transaction.id,
              to: to,
              value: value,
              description: description || ''
            }
          );

          if (notificationSuccess) {
            // Update transaction with notification status
            await firestore
              .collection('transactions')
              .doc(transaction.id)
              .update({
                notificationSent: true,
                notificationSentAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });

            console.log('✅ [TRANSACTION] FCM notification sent successfully and transaction updated', {
              transactionId: transaction.id,
              walletId,
              phoneDeviceId: wallet.deviceId,
              notificationSent: true,
              timestamp: new Date().toISOString()
            });
          } else {
            console.error('❌ [TRANSACTION] Failed to send FCM notification for transaction', {
              transactionId: transaction.id,
              walletId,
              phoneDeviceId: wallet.deviceId,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          console.warn('⚠️ [TRANSACTION] No active device token found for wallet', {
            transactionId: transaction.id,
            walletId,
            phoneDeviceId: wallet.deviceId,
            hasDeviceToken: !!deviceToken,
            isActive: deviceData?.isActive,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        console.warn('⚠️ [TRANSACTION] No device token document found for wallet', {
          transactionId: transaction.id,
          walletId,
          phoneDeviceId: wallet.deviceId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (notificationError) {
      console.error('❌ [TRANSACTION] Failed to send notification - Error occurred', {
        transactionId: transaction.id,
        walletId,
        phoneDeviceId: wallet.deviceId,
        error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      // Don't fail the request if notification fails
    }

    console.log('Transaction created:', { transactionId: transaction.id, walletId });

    res.status(201).json({ 
      transaction: {
        ...transaction,
        notificationSent: notificationSuccess
      }
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const { walletId, status } = req.query;
    
    let query: any = firestore.collection('transactions');
    
    if (walletId) {
      query = query.where('walletId', '==', walletId);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const transactions = snapshot.docs.map((doc: any) => doc.data());
    
    res.json({ transactions });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

export const getTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    
    const doc = await firestore
      .collection('transactions')
      .doc(transactionId)
      .get();
    
    if (!doc.exists) {
      return res.status(404).json({
        error: 'transaction_not_found',
        message: 'Transaction not found'
      });
    }
    
    const transaction = doc.data();
    res.json({ transaction });
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

export const approveTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { transactionHash, signature } = req.body;
    const userId = (req as any).user_id;

    if (!transactionHash) {
      return res.status(400).json({
        error: 'missing_required_fields',
        message: 'transactionHash is required'
      });
    }

    // Get transaction
    const transactionDoc = await firestore
      .collection('transactions')
      .doc(transactionId)
      .get();

    if (!transactionDoc.exists) {
      return res.status(404).json({
        error: 'transaction_not_found',
        message: 'Transaction not found'
      });
    }

    const transaction = transactionDoc.data() as Transaction;

    // Verify user owns this transaction
    if (transaction.userId !== userId) {
      return res.status(403).json({
        error: 'unauthorized',
        message: 'Not authorized to approve this transaction'
      });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({
        error: 'invalid_status',
        message: `Transaction is ${transaction.status.toLowerCase()}, cannot approve`
      });
    }

    // Check if transaction has expired
    if (new Date(transaction.expiresAt) < new Date()) {
      // Update transaction status to expired
      await firestore
        .collection('transactions')
        .doc(transactionId)
        .update({
          status: 'EXPIRED',
          error: 'Transaction expired',
          updatedAt: new Date().toISOString()
        });

      return res.status(400).json({
        error: 'transaction_expired',
        message: 'Transaction has expired'
      });
    }

    // Update transaction status with the hash from phone
    await firestore
      .collection('transactions')
      .doc(transactionId)
      .update({
        status: 'APPROVED',
        transactionHash: transactionHash,
        signature: signature,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

    // Send FCM notification to browser
    try {
      console.log('🔍 [APPROVAL] Looking up browser FCM token for status update', {
        transactionId,
        browserDeviceId: transaction.deviceId,
        status: 'APPROVED',
        transactionHash,
        timestamp: new Date().toISOString()
      });

      const browserTokenDoc = await firestore
        .collection('browser_device_tokens')
        .doc(transaction.deviceId)
        .get();

      if (browserTokenDoc.exists) {
        const browserData = browserTokenDoc.data();
        
        console.log('🌐 [APPROVAL] Browser FCM token found, sending status update', {
          transactionId,
          browserDeviceId: transaction.deviceId,
          hasBrowserToken: !!browserData?.browserFCMToken,
          status: 'APPROVED',
          transactionHash,
          timestamp: new Date().toISOString()
        });

        await simpleNotificationService.sendTransactionStatusUpdate(
          browserData?.browserFCMToken,
          transactionId,
          'APPROVED',
          transactionHash
        );
        
        console.log('✅ [APPROVAL] FCM status update sent to browser for approved transaction', {
          transactionId,
          browserDeviceId: transaction.deviceId,
          status: 'APPROVED',
          transactionHash,
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn('⚠️ [APPROVAL] No browser FCM token found for device', {
          transactionId,
          browserDeviceId: transaction.deviceId,
          status: 'APPROVED',
          timestamp: new Date().toISOString()
        });
      }
    } catch (notificationError) {
      console.error('❌ [APPROVAL] Failed to send browser notification for approved transaction', {
        transactionId,
        browserDeviceId: transaction.deviceId,
        status: 'APPROVED',
        error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      // Don't fail the request if notification fails
    }

    console.log('Transaction approved:', { transactionId, transactionHash });
    res.json({ 
      success: true,
      transaction: {
        ...transaction,
        status: 'APPROVED',
        transactionHash: transactionHash,
        signature: signature,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error approving transaction:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

export const rejectTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user_id;

    // Get transaction
    const transactionDoc = await firestore
      .collection('transactions')
      .doc(transactionId)
      .get();

    if (!transactionDoc.exists) {
      return res.status(404).json({
        error: 'transaction_not_found',
        message: 'Transaction not found'
      });
    }

    const transaction = transactionDoc.data() as Transaction;

    // Verify user owns this transaction
    if (transaction.userId !== userId) {
      return res.status(403).json({
        error: 'unauthorized',
        message: 'Not authorized to reject this transaction'
      });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({
        error: 'invalid_status',
        message: `Transaction is ${transaction.status.toLowerCase()}, cannot reject`
      });
    }

    // Check if transaction has expired
    if (new Date(transaction.expiresAt) < new Date()) {
      // Update transaction status to expired
      await firestore
        .collection('transactions')
        .doc(transactionId)
        .update({
          status: 'EXPIRED',
          error: 'Transaction expired',
          updatedAt: new Date().toISOString()
        });

      return res.status(400).json({
        error: 'transaction_expired',
        message: 'Transaction has expired'
      });
    }

    // Update transaction status
    await firestore
      .collection('transactions')
      .doc(transactionId)
      .update({
        status: 'REJECTED',
        error: reason || 'Transaction rejected by user',
        rejectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

    // Send FCM notification to browser
    try {
      const browserTokenDoc = await firestore
        .collection('browser_device_tokens')
        .doc(transaction.deviceId)
        .get();

      if (browserTokenDoc.exists) {
        const browserData = browserTokenDoc.data();
        await simpleNotificationService.sendTransactionStatusUpdate(
          browserData?.browserFCMToken,
          transactionId,
          'REJECTED'
        );
        console.log('FCM status update sent to browser for rejected transaction:', transactionId);
      } else {
        console.warn('No browser FCM token found for device:', transaction.deviceId);
      }
    } catch (notificationError) {
      console.error('Failed to send browser notification for rejected transaction:', notificationError);
      // Don't fail the request if notification fails
    }

    console.log('Transaction rejected:', { transactionId, reason });
    res.json({ 
      success: true,
      transaction: {
        ...transaction,
        status: 'REJECTED',
        error: reason || 'Transaction rejected by user',
        rejectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error rejecting transaction:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

export const getTransactionStatus = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const userId = (req as any).user_id;
    
    const doc = await firestore
      .collection('transactions')
      .doc(transactionId)
      .get();
    
    if (!doc.exists) {
      return res.status(404).json({
        error: 'transaction_not_found',
        message: 'Transaction not found'
      });
    }
    
    const transaction = doc.data() as Transaction;

    // Verify user owns this transaction
    if (transaction.userId !== userId) {
      return res.status(403).json({
        error: 'unauthorized',
        message: 'Not authorized to view this transaction'
      });
    }

    // Check if transaction has expired
    if (transaction.status === 'PENDING' && new Date(transaction.expiresAt) < new Date()) {
      // Update transaction status to expired
      await firestore
        .collection('transactions')
        .doc(transactionId)
        .update({
          status: 'EXPIRED',
          error: 'Transaction expired',
          updatedAt: new Date().toISOString()
        });

      transaction.status = 'EXPIRED';
      transaction.error = 'Transaction expired';
    }
    
    res.json({ 
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
        transactionHash: transaction.transactionHash,
        error: transaction.error,
        expiresAt: transaction.expiresAt,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      }
    });
  } catch (error) {
    console.error('Error getting transaction status:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};
