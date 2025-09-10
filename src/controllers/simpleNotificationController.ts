import { Request, Response } from 'express';
import { firestore } from '../firebase/admin';
import { simpleNotificationService } from '../services/simpleNotificationService';

export const registerFCMToken = async (req: Request, res: Response) => {
  try {
    const { deviceToken, deviceId, deviceInfo } = req.body;
    const userId = (req as any).user_id;

    if (!deviceToken || !deviceId) {
      return res.status(400).json({
        error: 'missing_required_fields',
        message: 'deviceToken and deviceId are required'
      });
    }

    // Validate FCM token format (basic validation)
    if (typeof deviceToken !== 'string' || deviceToken.length < 100) {
      return res.status(400).json({
        error: 'invalid_device_token',
        message: 'Invalid FCM device token format'
      });
    }

    // Store the FCM token in Firestore with enhanced metadata
    await firestore
      .collection('device_tokens')
      .doc(deviceId)
      .set({
        userId,
        deviceToken,
        deviceId,
        deviceInfo: deviceInfo || {},
        isActive: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

    console.log('FCM token registered successfully', { deviceId, userId });
    res.json({ 
      success: true, 
      message: 'FCM token registered successfully',
      deviceId,
      userId
    });
  } catch (error) {
    console.error('Failed to register FCM token:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

export const unregisterFCMToken = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body;
    const userId = (req as any).user_id;

    if (!deviceId) {
      return res.status(400).json({
        error: 'missing_required_fields',
        message: 'deviceId is required'
      });
    }

    // Verify the device belongs to the user
    const deviceDoc = await firestore
      .collection('device_tokens')
      .doc(deviceId)
      .get();

    if (!deviceDoc.exists) {
      return res.status(404).json({
        error: 'device_not_found',
        message: 'Device not found'
      });
    }

    const deviceData = deviceDoc.data();
    if (deviceData?.userId !== userId) {
      return res.status(403).json({
        error: 'unauthorized',
        message: 'Not authorized to unregister this device'
      });
    }

    // Mark device as inactive
    await firestore
      .collection('device_tokens')
      .doc(deviceId)
      .update({
        isActive: false,
        updatedAt: new Date().toISOString()
      });

    console.log('FCM token unregistered successfully', { deviceId, userId });
    res.json({ 
      success: true, 
      message: 'FCM token unregistered successfully',
      deviceId
    });
  } catch (error) {
    console.error('Failed to unregister FCM token:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

export const getDeviceTokens = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user_id;

    // Get all active devices for the user
    const devicesSnapshot = await firestore
      .collection('device_tokens')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    const devices = devicesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        deviceId: data.deviceId,
        deviceInfo: data.deviceInfo,
        lastSeen: data.lastSeen,
        createdAt: data.createdAt
      };
    });

    res.json({ 
      success: true, 
      devices,
      count: devices.length
    });
  } catch (error) {
    console.error('Failed to get device tokens:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

export const sendTransactionNotification = async (req: Request, res: Response) => {
  try {
    const { walletId, transactionId, to, value, description } = req.body;
    const userId = (req as any).user_id;

    if (!walletId || !transactionId || !to || !value) {
      return res.status(400).json({
        error: 'missing_required_fields',
        message: 'walletId, transactionId, to, and value are required'
      });
    }

    // Verify the user has access to this wallet
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

    const wallet = walletDoc.data();
    if (!wallet || wallet.userId !== userId) {
      return res.status(403).json({
        error: 'unauthorized',
        message: 'Not authorized to access this wallet'
      });
    }

    // Get the device token for this wallet
    const deviceTokenDoc = await firestore
      .collection('device_tokens')
      .doc(wallet.deviceId)
      .get();

    if (!deviceTokenDoc.exists) {
      return res.status(404).json({
        error: 'device_not_found',
        message: 'Device not found for this wallet'
      });
    }

    const deviceToken = deviceTokenDoc.data()?.deviceToken;

    if (!deviceToken) {
      return res.status(404).json({
        error: 'no_device_token',
        message: 'No device token found for this wallet'
      });
    }

    // Send notification to the phone
    const success = await simpleNotificationService.sendTransactionApproval(
      deviceToken,
      {
        transactionId,
        to,
        value,
        description: description || ''
      }
    );

    if (success) {
      res.json({ 
        success: true, 
        message: 'Transaction notification sent to phone'
      });
    } else {
      res.status(500).json({ 
        error: 'notification_failed',
        message: 'Failed to send notification to phone'
      });
    }
  } catch (error) {
    console.error('Failed to send transaction notification:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

export const registerBrowserFCMToken = async (req: Request, res: Response) => {
  try {
    const { browserDeviceId, browserFCMToken, phoneDeviceId } = req.body;
    const userId = (req as any).user_id;

    if (!browserDeviceId || !browserFCMToken || !phoneDeviceId) {
      return res.status(400).json({
        error: 'missing_required_fields',
        message: 'browserDeviceId, browserFCMToken, and phoneDeviceId are required'
      });
    }

    // Validate FCM token format (basic validation)
    if (typeof browserFCMToken !== 'string' || browserFCMToken.length < 100) {
      return res.status(400).json({
        error: 'invalid_device_token',
        message: 'Invalid FCM device token format'
      });
    }

    // Store browser FCM token linked to phone device
    await firestore
      .collection('browser_device_tokens')
      .doc(browserDeviceId)
      .set({
        userId,
        browserDeviceId,
        browserFCMToken,
        phoneDeviceId,
        isActive: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

    console.log('Browser FCM token registered successfully', { browserDeviceId, phoneDeviceId, userId });
    res.json({ 
      success: true, 
      message: 'Browser FCM token registered successfully',
      browserDeviceId,
      phoneDeviceId,
      userId
    });
  } catch (error) {
    console.error('Failed to register browser FCM token:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};

export const testNotification = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const userId = (req as any).user_id;

    console.log('Test notification requested', { userId, message });

    // For now, just log the test notification
    // In a real implementation, you would send to all user's devices
    res.json({ 
      success: true, 
      message: 'Test notification logged',
      testMessage: message || 'Default test message'
    });
  } catch (error) {
    console.error('Failed to send test notification:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};
