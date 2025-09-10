import express from 'express';
import { 
  registerFCMToken, 
  unregisterFCMToken, 
  getDeviceTokens,
  sendTransactionNotification, 
  testNotification,
  registerBrowserFCMToken
} from '../controllers/simpleNotificationController';
import { requirePhoneJWT, requireBrowserJWT } from '../middleware/authJWT';

const router = express.Router();

// Test endpoint (no authentication required)
router.post('/test', (req, res) => {
  const { deviceToken, message } = req.body;

  if (!deviceToken) {
    return res.status(400).json({
      error: 'missing_device_token',
      message: 'deviceToken is required'
    });
  }

  console.log('Testing FCM notification:', { deviceToken, message });

  // For now, just log the test notification
  res.json({ 
    success: true, 
    message: 'Test notification logged',
    testMessage: message || 'Default test message',
    deviceToken: deviceToken.substring(0, 20) + '...' // Only show first 20 chars for security
  });
});

// FCM Token Management (Phone App)
router.post('/register-token', requirePhoneJWT, registerFCMToken);
router.post('/unregister-token', requirePhoneJWT, unregisterFCMToken);
router.get('/devices', requirePhoneJWT, getDeviceTokens);

// Browser FCM Token Registration (Phone App calls this to register browser token)
router.post('/register-browser-token', requirePhoneJWT, registerBrowserFCMToken);

// Transaction Notifications (Browser App)
router.post('/transaction', requireBrowserJWT, sendTransactionNotification);

// Test notification (Browser App)
router.post('/test-notification', requireBrowserJWT, testNotification);

export default router;
