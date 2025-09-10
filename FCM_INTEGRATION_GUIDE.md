# FCM-Integrated Transaction Flow: Complete Integration Guide

## Overview

This guide provides comprehensive documentation for implementing the FCM-integrated transaction flow between browser, phone, and orchestrator server. The system enables secure transaction creation from a browser app, notification delivery to a phone app, and transaction signing/approval on the phone.

## Architecture

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│   Browser   │    │   Orchestrator   │    │    Phone    │
│     App     │    │     Server       │    │     App     │
└─────────────┘    └──────────────────┘    └─────────────┘
       │                     │                     │
       │ 1. Authenticate     │                     │
       │─────────────────────▶│                     │
       │                     │                     │
       │ 2. Create Tx        │                     │
       │─────────────────────▶│                     │
       │                     │ 3. FCM Notification │
       │                     │─────────────────────▶│
       │                     │                     │
       │                     │ 4. Approve/Reject   │
       │                     │◀─────────────────────│
       │                     │                     │
       │ 5. Poll Status      │                     │
       │◀────────────────────│                     │
```

## Phase 1: Phone App Setup

### 1.1 Firebase Configuration

**Required Dependencies:**
```json
{
  "dependencies": {
    "firebase": "^10.x.x",
    "firebase/messaging": "^10.x.x"
  }
}
```

**Firebase Configuration:**
```javascript
// firebase-config.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
```

### 1.2 FCM Token Registration

```javascript
// fcm-service.js
class FCMService {
  constructor() {
    this.messaging = getMessaging();
    this.deviceId = this.generateDeviceId();
  }

  async initialize() {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Get FCM token
      const token = await this.getFCMToken();
      console.log('FCM Token:', token);

      // Register token with orchestrator
      await this.registerTokenWithServer(token);

      // Set up message listener
      this.setupMessageListener();

      return token;
    } catch (error) {
      console.error('FCM initialization failed:', error);
      throw error;
    }
  }

  async getFCMToken() {
    try {
      const token = await getToken(this.messaging, {
        vapidKey: 'YOUR_VAPID_KEY'
      });
      return token;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      throw error;
    }
  }

  async registerTokenWithServer(token) {
    try {
      const response = await fetch('https://your-orchestrator.com/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getPhoneJWT()}`
        },
        body: JSON.stringify({
          deviceToken: token,
          deviceId: this.deviceId,
          deviceInfo: {
            platform: 'ios', // or 'android'
            version: '1.0.0',
            model: 'iPhone 14', // Get from device
            name: 'My Phone'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to register token: ${response.status}`);
      }

      const result = await response.json();
      console.log('FCM token registered successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to register FCM token:', error);
      throw error;
    }
  }

  setupMessageListener() {
    onMessage(this.messaging, (payload) => {
      console.log('Message received:', payload);
      this.handleNotification(payload);
    });
  }

  handleNotification(payload) {
    const { data, notification } = payload;
    
    switch (data.type) {
      case 'transaction_approval':
        this.handleTransactionApproval(data);
        break;
      case 'transaction_status':
        this.handleTransactionStatus(data);
        break;
      case 'wallet_pairing':
        this.handleWalletPairing(data);
        break;
      case 'security_alert':
        this.handleSecurityAlert(data);
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  handleTransactionApproval(data) {
    // Show transaction approval dialog
    this.showTransactionDialog({
      transactionId: data.transactionId,
      to: data.to,
      value: data.value,
      description: data.description,
      expiresAt: data.expiresAt
    });
  }

  showTransactionDialog(transaction) {
    // Implement your UI dialog here
    // This should show transaction details and approve/reject buttons
    const dialog = {
      title: 'Transaction Approval Required',
      message: `Send ${this.formatEther(transaction.value)} ETH to ${this.shortenAddress(transaction.to)}?`,
      transaction: transaction,
      onApprove: () => this.approveTransaction(transaction.transactionId),
      onReject: () => this.rejectTransaction(transaction.transactionId)
    };

    // Show your custom dialog/modal
    this.showModal(dialog);
  }

  async approveTransaction(transactionId) {
    try {
      // Sign transaction with MPC wallet
      const signedTx = await this.signTransaction(transactionId);
      
      // Send approval to orchestrator
      const response = await fetch(`https://your-orchestrator.com/api/transactions/${transactionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getPhoneJWT()}`
        },
        body: JSON.stringify({
          transactionHash: signedTx.hash,
          signature: signedTx.signature
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to approve transaction: ${response.status}`);
      }

      const result = await response.json();
      console.log('Transaction approved:', result);
      
      // Show success message
      this.showSuccessMessage('Transaction approved and submitted!');
      
    } catch (error) {
      console.error('Failed to approve transaction:', error);
      this.showErrorMessage('Failed to approve transaction');
    }
  }

  async rejectTransaction(transactionId) {
    try {
      const response = await fetch(`https://your-orchestrator.com/api/transactions/${transactionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getPhoneJWT()}`
        },
        body: JSON.stringify({
          reason: 'Rejected by user'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to reject transaction: ${response.status}`);
      }

      const result = await response.json();
      console.log('Transaction rejected:', result);
      
      // Show success message
      this.showSuccessMessage('Transaction rejected');
      
    } catch (error) {
      console.error('Failed to reject transaction:', error);
      this.showErrorMessage('Failed to reject transaction');
    }
  }

  generateDeviceId() {
    // Generate a unique device ID
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getPhoneJWT() {
    // Get the phone JWT token from your auth service
    return localStorage.getItem('phoneJWT') || sessionStorage.getItem('phoneJWT');
  }

  formatEther(wei) {
    return (BigInt(wei) / BigInt(10 ** 18)).toString();
  }

  shortenAddress(address) {
    return `${address.substring(0, 8)}...${address.substring(-6)}`;
  }
}

// Usage
const fcmService = new FCMService();
fcmService.initialize().then(() => {
  console.log('FCM service initialized successfully');
}).catch(error => {
  console.error('FCM service initialization failed:', error);
});
```

### 1.3 Authentication Flow

```javascript
// auth-service.js
class AuthService {
  async phoneLogin(firebaseIdToken) {
    try {
      const response = await fetch('https://your-orchestrator.com/api/auth/phone-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_token: firebaseIdToken
        })
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Store JWT token
      localStorage.setItem('phoneJWT', result.token);
      
      return result;
    } catch (error) {
      console.error('Phone login failed:', error);
      throw error;
    }
  }
}
```

## Phase 2: Browser App Setup

### 2.1 Authentication Flow

```javascript
// browser-auth-service.js
class BrowserAuthService {
  async browserLogin(firebaseIdToken) {
    try {
      const response = await fetch('https://your-orchestrator.com/api/auth/browser-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_token: firebaseIdToken
        }),
        credentials: 'include' // Important for cookie storage
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Browser login failed:', error);
      throw error;
    }
  }
}
```

### 2.2 Transaction Creation

```javascript
// transaction-service.js
class TransactionService {
  async createTransaction(transactionData) {
    try {
      const response = await fetch('https://your-orchestrator.com/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include JWT cookie
        body: JSON.stringify({
          walletId: transactionData.walletId,
          to: transactionData.to,
          value: transactionData.value,
          data: transactionData.data || '0x',
          gasLimit: transactionData.gasLimit || '21000',
          gasPrice: transactionData.gasPrice || '20000000000',
          description: transactionData.description
        })
      });

      if (!response.ok) {
        throw new Error(`Transaction creation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Transaction created:', result);
      
      // Start polling for status
      this.pollTransactionStatus(result.transaction.id);
      
      return result;
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  }

  async pollTransactionStatus(transactionId) {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`https://your-orchestrator.com/api/transactions/${transactionId}/status`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const result = await response.json();
        const { status, transactionHash, error } = result.transaction;

        switch (status) {
          case 'APPROVED':
            this.handleTransactionApproved(transactionId, transactionHash);
            return;
          case 'REJECTED':
            this.handleTransactionRejected(transactionId, error);
            return;
          case 'EXPIRED':
            this.handleTransactionExpired(transactionId);
            return;
          case 'FAILED':
            this.handleTransactionFailed(transactionId, error);
            return;
          case 'PENDING':
            // Continue polling
            break;
          default:
            console.log('Unknown transaction status:', status);
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          this.handleTransactionTimeout(transactionId);
        }
      } catch (error) {
        console.error('Error polling transaction status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          this.handleTransactionTimeout(transactionId);
        }
      }
    };

    // Start polling
    poll();
  }

  handleTransactionApproved(transactionId, transactionHash) {
    console.log('Transaction approved:', { transactionId, transactionHash });
    // Show success message to user
    this.showSuccessMessage(`Transaction approved! Hash: ${transactionHash}`);
  }

  handleTransactionRejected(transactionId, error) {
    console.log('Transaction rejected:', { transactionId, error });
    // Show rejection message to user
    this.showErrorMessage(`Transaction rejected: ${error}`);
  }

  handleTransactionExpired(transactionId) {
    console.log('Transaction expired:', transactionId);
    // Show expiration message to user
    this.showErrorMessage('Transaction expired. Please try again.');
  }

  handleTransactionFailed(transactionId, error) {
    console.log('Transaction failed:', { transactionId, error });
    // Show failure message to user
    this.showErrorMessage(`Transaction failed: ${error}`);
  }

  handleTransactionTimeout(transactionId) {
    console.log('Transaction polling timeout:', transactionId);
    // Show timeout message to user
    this.showErrorMessage('Transaction status check timeout. Please check manually.');
  }

  showSuccessMessage(message) {
    // Implement your success message display
    console.log('Success:', message);
  }

  showErrorMessage(message) {
    // Implement your error message display
    console.error('Error:', message);
  }
}

// Usage
const transactionService = new TransactionService();

// Create a transaction
transactionService.createTransaction({
  walletId: 'wallet_123',
  to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  value: '1000000000000000000', // 1 ETH in wei
  description: 'Payment for services'
}).then(result => {
  console.log('Transaction initiated:', result);
}).catch(error => {
  console.error('Transaction failed:', error);
});
```

## Phase 3: API Endpoints Reference

### Authentication Endpoints

#### Browser Login
```http
POST /api/auth/browser-login
Content-Type: application/json

{
  "id_token": "firebase_id_token_from_browser"
}
```

**Response:**
```json
{
  "ok": true
}
```

#### Phone Login
```http
POST /api/auth/phone-login
Content-Type: application/json

{
  "id_token": "firebase_id_token_from_phone"
}
```

**Response:**
```json
{
  "ok": true,
  "token": "phone_jwt_token",
  "user_id": "user_123",
  "expiresIn": "24h"
}
```

### FCM Token Management

#### Register FCM Token (Phone)
```http
POST /api/notifications/register-token
Authorization: Bearer phone_jwt_token
Content-Type: application/json

{
  "deviceToken": "fcm_device_token",
  "deviceId": "device_123",
  "deviceInfo": {
    "platform": "ios",
    "version": "1.0.0",
    "model": "iPhone 14",
    "name": "My Phone"
  }
}
```

#### Unregister FCM Token (Phone)
```http
POST /api/notifications/unregister-token
Authorization: Bearer phone_jwt_token
Content-Type: application/json

{
  "deviceId": "device_123"
}
```

#### Get Device Tokens (Phone)
```http
GET /api/notifications/devices
Authorization: Bearer phone_jwt_token
```

### Transaction Endpoints

#### Create Transaction (Browser)
```http
POST /api/transactions
Content-Type: application/json

{
  "walletId": "wallet_123",
  "to": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "value": "1000000000000000000",
  "data": "0x",
  "gasLimit": "21000",
  "gasPrice": "20000000000",
  "description": "Payment for services"
}
```

**Response:**
```json
{
  "transaction": {
    "id": "tx_1234567890_abc123",
    "walletId": "wallet_123",
    "to": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "value": "1000000000000000000",
    "status": "PENDING",
    "notificationSent": true,
    "expiresAt": "2024-01-01T12:30:00.000Z",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Get Transaction Status (Browser)
```http
GET /api/transactions/tx_1234567890_abc123/status
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "tx_1234567890_abc123",
    "status": "APPROVED",
    "transactionHash": "0x1234567890abcdef...",
    "expiresAt": "2024-01-01T12:30:00.000Z",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:05:00.000Z"
  }
}
```

#### Approve Transaction (Phone)
```http
POST /api/transactions/tx_1234567890_abc123/approve
Authorization: Bearer phone_jwt_token
Content-Type: application/json

{
  "transactionHash": "0x1234567890abcdef...",
  "signature": "0xabcdef123456..."
}
```

#### Reject Transaction (Phone)
```http
POST /api/transactions/tx_1234567890_abc123/reject
Authorization: Bearer phone_jwt_token
Content-Type: application/json

{
  "reason": "Insufficient funds"
}
```

## Phase 4: Error Handling

### Common Error Responses

```json
{
  "error": "missing_required_fields",
  "message": "walletId, to, and value are required"
}
```

```json
{
  "error": "invalid_address",
  "message": "Invalid Ethereum address"
}
```

```json
{
  "error": "transaction_expired",
  "message": "Transaction has expired"
}
```

```json
{
  "error": "unauthorized",
  "message": "Not authorized to use this wallet"
}
```

### Error Handling Best Practices

1. **Network Errors**: Implement retry logic with exponential backoff
2. **Authentication Errors**: Redirect to login page
3. **Validation Errors**: Show user-friendly error messages
4. **Transaction Timeouts**: Provide manual status check option
5. **FCM Errors**: Fallback to polling if notifications fail

## Phase 5: Security Considerations

### JWT Token Security
- Tokens expire after 24 hours
- Use HTTPS for all API calls
- Store tokens securely (HttpOnly cookies for browser, secure storage for phone)
- Implement token refresh mechanism

### FCM Token Security
- Validate FCM token format
- Associate tokens with user accounts
- Implement token rotation
- Monitor for suspicious activity

### Transaction Security
- Validate all transaction parameters
- Implement rate limiting
- Log all transaction activities
- Use MPC for transaction signing

## Phase 6: Testing

### Test FCM Token Registration
```bash
curl -X POST https://your-orchestrator.com/api/notifications/register-token \
  -H "Authorization: Bearer your_phone_jwt" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceToken": "YOUR_FCM_TOKEN",
    "deviceId": "test_device_123",
    "deviceInfo": {
      "platform": "ios",
      "version": "1.0.0"
    }
  }'
```

### Test Transaction Creation
```bash
curl -X POST https://your-orchestrator.com/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "test_wallet_123",
    "to": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "value": "1000000000000000000",
    "description": "Test transaction"
  }'
```

### Test Transaction Approval
```bash
curl -X POST https://your-orchestrator.com/api/transactions/tx_123/approve \
  -H "Authorization: Bearer your_phone_jwt" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionHash": "0x1234567890abcdef...",
    "signature": "0xabcdef123456..."
  }'
```

## Phase 7: Production Deployment

### Environment Variables
```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_TTL=24h

# Server Configuration
PORT=3000
NODE_ENV=production
```

### Monitoring and Logging
- Implement structured logging
- Monitor FCM delivery rates
- Track transaction success rates
- Set up alerts for failures

### Performance Optimization
- Implement connection pooling
- Use caching for frequently accessed data
- Optimize database queries
- Implement rate limiting

This comprehensive guide provides everything needed to implement the FCM-integrated transaction flow in production. Follow the phases sequentially and test thoroughly before deploying to production.
