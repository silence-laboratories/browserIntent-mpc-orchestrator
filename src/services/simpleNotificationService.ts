import { getMessaging } from 'firebase-admin/messaging';

interface TransactionNotificationData {
  transactionId: string;
  to: string;
  value: string;
  description?: string;
  expiresAt?: string;
}

interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SimpleNotificationService {
  private messaging = getMessaging();

  /**
   * Send a simple notification to a device
   */
  async sendNotification(deviceToken: string, title: string, body: string, data?: any): Promise<NotificationResult> {
    try {
      console.log('🚀 [FCM] Starting notification send process', {
        deviceToken: deviceToken.substring(0, 20) + '...',
        title,
        body,
        dataType: data?.type || 'unknown',
        timestamp: new Date().toISOString()
      });

      const message = {
        token: deviceToken,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'transaction_approval',
            priority: 'high' as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: 'transaction_approval',
            },
          },
          headers: {
            'apns-priority': '10',
          },
        },
      };

      console.log('📤 [FCM] Sending message to Firebase', {
        messageId: 'pending',
        targetDevice: deviceToken.substring(0, 20) + '...',
        notificationTitle: title,
        dataPayload: data
      });

      const response = await this.messaging.send(message);
      
      console.log('✅ [FCM] Notification sent successfully', {
        messageId: response,
        deviceToken: deviceToken.substring(0, 20) + '...',
        title,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ [FCM] Failed to send notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        deviceToken: deviceToken.substring(0, 20) + '...',
        title,
        timestamp: new Date().toISOString(),
        errorDetails: error
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send transaction approval notification with retry logic
   */
  async sendTransactionApproval(deviceToken: string, transactionData: TransactionNotificationData): Promise<boolean> {
    console.log('📱 [FCM] Preparing transaction approval notification for phone', {
      transactionId: transactionData.transactionId,
      to: transactionData.to,
      value: transactionData.value,
      description: transactionData.description,
      deviceToken: deviceToken.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    });

    const shortAddress = `${transactionData.to.substring(0, 8)}...${transactionData.to.substring(-6)}`;
    const amount = this.formatEther(transactionData.value);
    const expiresIn = transactionData.expiresAt ? this.getTimeUntilExpiry(transactionData.expiresAt) : '30 minutes';

    const notificationData = {
      type: 'transaction_approval',
      transactionId: transactionData.transactionId,
      to: transactionData.to,
      value: transactionData.value,
      description: transactionData.description || '',
      expiresAt: transactionData.expiresAt || '',
      action: 'approve_reject',
    };

    console.log('📋 [FCM] Transaction approval notification details', {
      transactionId: transactionData.transactionId,
      shortAddress,
      amount: `${amount} ETH`,
      expiresIn,
      notificationTitle: 'Transaction Approval Required',
      notificationBody: `Approve transaction to ${shortAddress} for ${amount} ETH (expires in ${expiresIn})`
    });

    const result = await this.sendNotification(
      deviceToken,
      'Transaction Approval Required',
      `Approve transaction to ${shortAddress} for ${amount} ETH (expires in ${expiresIn})`,
      notificationData
    );

    if (result.success) {
      console.log('✅ [FCM] Transaction approval notification sent to phone successfully', {
        transactionId: transactionData.transactionId,
        messageId: result.messageId,
        deviceToken: deviceToken.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ [FCM] Failed to send transaction approval notification to phone', {
        transactionId: transactionData.transactionId,
        error: result.error,
        deviceToken: deviceToken.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
    }

    return result.success;
  }

  /**
   * Send transaction status update notification
   */
  async sendTransactionStatusUpdate(deviceToken: string, transactionId: string, status: string, transactionHash?: string): Promise<boolean> {
    console.log('🌐 [FCM] Preparing transaction status update notification for browser', {
      transactionId,
      status,
      transactionHash: transactionHash || 'none',
      deviceToken: deviceToken.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    });

    const statusMessages = {
      'APPROVED': 'Transaction approved and submitted to blockchain',
      'REJECTED': 'Transaction rejected',
      'EXPIRED': 'Transaction expired',
      'FAILED': 'Transaction failed'
    };

    const title = `Transaction ${status.toLowerCase()}`;
    const body = statusMessages[status as keyof typeof statusMessages] || `Transaction ${status.toLowerCase()}`;

    const notificationData = {
      type: 'transaction_status',
      transactionId,
      status,
      transactionHash: transactionHash || '',
      action: 'view_details',
    };

    console.log('📋 [FCM] Transaction status update notification details', {
      transactionId,
      status,
      title,
      body,
      transactionHash: transactionHash || 'none'
    });

    const result = await this.sendNotification(deviceToken, title, body, notificationData);
    
    if (result.success) {
      console.log('✅ [FCM] Transaction status update notification sent to browser successfully', {
        transactionId,
        status,
        messageId: result.messageId,
        deviceToken: deviceToken.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ [FCM] Failed to send transaction status update notification to browser', {
        transactionId,
        status,
        error: result.error,
        deviceToken: deviceToken.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
    }

    return result.success;
  }

  /**
   * Send wallet pairing notification
   */
  async sendWalletPairingNotification(deviceToken: string, walletName: string, deviceInfo: any): Promise<boolean> {
    const deviceName = deviceInfo?.name || deviceInfo?.model || 'Unknown device';
    
    const notificationData = {
      type: 'wallet_pairing',
      walletName,
      deviceInfo: JSON.stringify(deviceInfo),
      action: 'confirm_pairing',
    };

    const result = await this.sendNotification(
      deviceToken,
      'New Wallet Pairing Request',
      `Confirm pairing for wallet "${walletName}" from ${deviceName}`,
      notificationData
    );

    return result.success;
  }

  /**
   * Send security alert notification
   */
  async sendSecurityAlert(deviceToken: string, alertType: string, details: string): Promise<boolean> {
    const notificationData = {
      type: 'security_alert',
      alertType,
      details,
      action: 'review_security',
    };

    const result = await this.sendNotification(
      deviceToken,
      'Security Alert',
      details,
      notificationData
    );

    return result.success;
  }

  /**
   * Format wei to ether
   */
  private formatEther(wei: string): string {
    try {
      const weiBigInt = BigInt(wei);
      const ether = Number(weiBigInt) / Math.pow(10, 18);
      return ether.toFixed(6);
    } catch (error) {
      return '0';
    }
  }

  /**
   * Get time until expiry in human readable format
   */
  private getTimeUntilExpiry(expiresAt: string): string {
    try {
      const expiryTime = new Date(expiresAt).getTime();
      const now = Date.now();
      const diffMs = expiryTime - now;
      
      if (diffMs <= 0) return 'expired';
      
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'less than 1 minute';
      if (diffMins < 60) return `${diffMins} minutes`;
      
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hours`;
    } catch (error) {
      return '30 minutes';
    }
  }

  /**
   * Validate FCM token format
   */
  validateToken(token: string): boolean {
    // Basic FCM token validation
    return typeof token === 'string' && token.length >= 100 && token.length <= 2000;
  }

  /**
   * Send notification to multiple devices
   */
  async sendMulticastNotification(deviceTokens: string[], title: string, body: string, data?: any): Promise<NotificationResult[]> {
    try {
      // Send notifications to each device individually since sendMulticast might not be available
      const results: NotificationResult[] = [];
      
      for (const token of deviceTokens) {
        const result = await this.sendNotification(token, title, body, data);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Failed to send multicast notification:', error);
      return deviceTokens.map(() => ({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }
}

export const simpleNotificationService = new SimpleNotificationService();
