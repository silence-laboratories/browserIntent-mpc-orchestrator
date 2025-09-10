# Implementation Guide: FCM Transaction Flow

## Step 1: Phone App FCM Token Registration

### 1.1 Update Phone App Notification Service

```typescript
// phoneSSO/services/notificationService.ts

import { Alert } from 'react-native';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { formatEther } from 'viem';

class NotificationService {
  private isInitialized = false;
  private deviceId: string | null = null;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Generate or get device ID
      this.deviceId = await this.getDeviceId();
      
      // Request permission for notifications
      const permission = await this.requestPermission();
      
      if (permission) {
        // Get FCM token
        const token = await this.getFCMToken();
        console.log('FCM Token:', token);
        
        // Register token with orchestrator
        if (token && this.deviceId) {
          await this.registerTokenWithServer(token);
        }
        
        // Set up message listener for foreground messages
        this.setupMessageListener();
        
        this.isInitialized = true;
        console.log('Notification service initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  private async getDeviceId(): Promise<string> {
    // Use existing device ID or generate new one
    // This should be consistent across app restarts
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async registerTokenWithServer(token: string): Promise<void> {
    try {
      const authToken = await this.getAuthToken();
      
      const response = await fetch('http://localhost:8080/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          deviceToken: token,
          deviceId: this.deviceId
        })
      });

      if (response.ok) {
        console.log('FCM token registered with orchestrator server successfully');
      } else {
        console.error('Failed to register FCM token:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error registering FCM token with server:', error);
    }
  }

  private async getAuthToken(): Promise<string> {
    // Get the phone JWT token from your auth context
    // This should be the token received after phone authentication
    return 'your-phone-jwt-token-here';
  }

  private handleNotification(data: NotificationData) {
    if (data.type === 'transaction_approval') {
      this.showTransactionApprovalAlert(data);
    } else {
      Alert.alert(
        data.title || 'Notification',
        data.body || 'You have a new notification'
      );
    }
  }

  private showTransactionApprovalAlert(data: NotificationData) {
    const shortAddress = data.to 
      ? `${data.to.substring(0, 8)}...${data.to.substring(-6)}`
      : 'unknown address';
    
    const amount = data.value 
      ? formatEther(BigInt(data.value))
      : '0';

    Alert.alert(
      'Transaction Approval Required',
      `Approve transaction to ${shortAddress} for ${amount} ETH?`,
      [
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => this.rejectTransaction(data.transactionId!)
        },
        {
          text: 'Approve',
          onPress: () => this.approveTransaction(data.transactionId!)
        }
      ]
    );
  }

  private async approveTransaction(transactionId: string) {
    try {
      // Sign transaction with MPC wallet
      const transactionHash = await this.signTransaction(transactionId);
      
      // Send approval to orchestrator
      const authToken = await this.getAuthToken();
      
      const response = await fetch(`http://localhost:8080/api/transactions/${transactionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          transactionHash: transactionHash,
          deviceId: this.deviceId
        })
      });

      if (response.ok) {
        console.log('Transaction approved successfully');
        Alert.alert('Success', 'Transaction approved and signed');
      } else {
        console.error('Failed to approve transaction:', response.status);
        Alert.alert('Error', 'Failed to approve transaction');
      }
    } catch (error) {
      console.error('Error approving transaction:', error);
      Alert.alert('Error', 'Failed to approve transaction');
    }
  }

  private async rejectTransaction(transactionId: string) {
    try {
      const authToken = await this.getAuthToken();
      
      const response = await fetch(`http://localhost:8080/api/transactions/${transactionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          deviceId: this.deviceId,
          reason: 'Rejected by user'
        })
      });

      if (response.ok) {
        console.log('Transaction rejected successfully');
        Alert.alert('Transaction Rejected', 'The transaction has been rejected');
      } else {
        console.error('Failed to reject transaction:', response.status);
      }
    } catch (error) {
      console.error('Error rejecting transaction:', error);
    }
  }

  private async signTransaction(transactionId: string): Promise<string> {
    // TODO: Implement MPC wallet transaction signing
    // This should use your MPC wallet implementation
    console.log('Signing transaction:', transactionId);
    
    // For now, return a mock transaction hash
    return `0x${Math.random().toString(16).substr(2, 64)}`;
  }
}

export const notificationService = new NotificationService();
```

## Step 2: Browser App Transaction Creation

### 2.1 Update Browser Transaction API

```typescript
// paired-key-vault/src/lib/api.ts

export const transactionAPI = {
  async createTransaction(transactionData: {
    walletId: string;
    to: string;
    value: string;
    data?: string;
    gasLimit?: string;
    gasPrice?: string;
    description?: string;
    deviceId: string;
  }) {
    const response = await api.post('/transactions', transactionData);
    console.log('Transaction created:', response.data.transaction.id);
    
    return response.data; // { transaction: {...} }
  },

  async pollTransactionStatus(transactionId: string, maxAttempts: number = 30) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await api.get(`/transactions/${transactionId}`);
        const transaction = response.data.transaction;
        
        console.log(`Transaction status (attempt ${attempts + 1}):`, transaction.status);
        
        if (transaction.status === 'APPROVED') {
          console.log('Transaction approved with hash:', transaction.transactionHash);
          return transaction;
        } else if (transaction.status === 'REJECTED') {
          console.log('Transaction rejected:', transaction.error);
          throw new Error(`Transaction rejected: ${transaction.error}`);
        } else if (transaction.status === 'EXPIRED') {
          console.log('Transaction expired');
          throw new Error('Transaction expired');
        }
        
        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        console.error('Error polling transaction status:', error);
        throw error;
      }
    }
    
    throw new Error('Transaction polling timeout');
  },

  async getTransactions() {
    const response = await api.get('/transactions');
    return response.data; // { transactions: [...] }
  },

  async getTransaction(transactionId: string) {
    const response = await api.get(`/transactions/${transactionId}`);
    return response.data; // { transaction: {...} }
  },
};
```

### 2.2 Update Browser Transaction Component

```typescript
// paired-key-vault/src/pages/Transaction.tsx

import { useState } from 'react';
import { transactionAPI } from '@/lib/api';
import { useWallet } from '@/contexts/WalletContext';

const Transaction = () => {
  const { selectedWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleCreateTransaction = async (formData: any) => {
    if (!selectedWallet) {
      alert('Please select a wallet first');
      return;
    }

    setLoading(true);
    setStatus('Creating transaction...');

    try {
      // Create transaction
      const result = await transactionAPI.createTransaction({
        walletId: selectedWallet.id,
        to: formData.to,
        value: formData.value,
        description: formData.description,
        deviceId: selectedWallet.deviceId // This links to the phone
      });

      const transactionId = result.transaction.id;
      setStatus('Transaction created. Waiting for phone approval...');

      // Poll for transaction status
      const approvedTransaction = await transactionAPI.pollTransactionStatus(transactionId);
      
      setStatus(`Transaction approved! Hash: ${approvedTransaction.transactionHash}`);
      
      // Show success message
      alert(`Transaction successful!\nHash: ${approvedTransaction.transactionHash}`);
      
    } catch (error) {
      console.error('Transaction failed:', error);
      setStatus(`Transaction failed: ${error.message}`);
      alert(`Transaction failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create Transaction</h1>
      {/* Transaction form */}
      <form onSubmit={handleCreateTransaction}>
        {/* Form fields */}
      </form>
      
      {loading && (
        <div>
          <p>Status: {status}</p>
          <div>Loading...</div>
        </div>
      )}
    </div>
  );
};
```

## Step 3: Test the Complete Flow

### 3.1 Test FCM Token Registration

```bash
# Test FCM token registration (replace with real token)
curl -X POST http://localhost:8080/api/notifications/test-fcm \
  -H "Content-Type: application/json" \
  -d '{
    "deviceToken": "YOUR_REAL_FCM_TOKEN",
    "message": "Test notification"
  }'
```

### 3.2 Test Transaction Creation

```bash
# Test transaction creation (requires authentication)
curl -X POST http://localhost:8080/api/transactions/test \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "test-wallet",
    "to": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "value": "1000000000000000000",
    "deviceId": "test-device"
  }'
```

### 3.3 Test Transaction Approval

```bash
# Test transaction approval (requires authentication)
curl -X POST http://localhost:8080/api/transactions/TX_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "transactionHash": "0xabc123...",
    "deviceId": "test-device"
  }'
```

## Step 4: Debugging Checklist

### Phone App Debugging
- [ ] FCM token is generated and logged
- [ ] FCM token is registered with orchestrator
- [ ] Phone JWT token is valid
- [ ] Notification permissions are granted
- [ ] Foreground message listener is set up

### Browser App Debugging
- [ ] Browser JWT token is valid
- [ ] Wallet is properly linked to device ID
- [ ] Transaction creation succeeds
- [ ] Status polling works correctly
- [ ] Error handling is implemented

### Orchestrator Debugging
- [ ] FCM service is properly configured
- [ ] Device tokens are stored in database
- [ ] Transaction records are created
- [ ] FCM notifications are sent
- [ ] Transaction status updates work

### Network Debugging
- [ ] Phone can reach orchestrator (localhost:8080)
- [ ] Browser can reach orchestrator (localhost:8080)
- [ ] CORS is properly configured
- [ ] Authentication tokens are valid
- [ ] FCM notifications are delivered

## Common Issues and Solutions

### Issue 1: FCM Token Not Found
**Solution**: Ensure phone app registers FCM token with orchestrator

### Issue 2: Authentication Failed
**Solution**: Check JWT tokens and ensure proper authentication flow

### Issue 3: Transaction Not Approved
**Solution**: Verify phone app receives notifications and can approve transactions

### Issue 4: Status Polling Timeout
**Solution**: Check transaction approval flow and database updates

### Issue 5: FCM Notification Not Delivered
**Solution**: Verify FCM configuration and device token registration
