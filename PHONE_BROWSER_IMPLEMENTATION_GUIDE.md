# Phone & Browser Implementation Guide for FCM Transaction Flow

## 🎯 **CRITICAL FIXES REQUIRED**

The orchestrator server has been updated with all necessary endpoints. Now the phone and browser apps need to implement the missing functionality to complete the FCM transaction flow.

---

## 📱 **PHONE APP TEAM - REQUIRED IMPLEMENTATIONS**

### **1. Browser FCM Token Registration**

**Problem**: Phone app needs to register the browser's FCM token with the orchestrator so the orchestrator can send status updates back to the browser.

**🔧 REQUIRED IMPLEMENTATION:**

Add this method to your phone app's FCM service:

```typescript
// In your phone app's FCM service (e.g., services/fcmService.ts)
async registerBrowserFCMToken(browserDeviceId: string, browserFCMToken: string) {
  try {
    const response = await fetch(`${API_URL}/api/notifications/register-browser-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getPhoneJWT()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        browserDeviceId,
        browserFCMToken,
        phoneDeviceId: this.deviceId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to register browser token: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Browser FCM token registered successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to register browser FCM token:', error);
    throw error;
  }
}
```

**When to call this**: Call this method when the phone app receives a browser FCM token (e.g., during wallet pairing or when the browser sends its token).

### **2. Transaction Approval/Rejection API Calls**

**Problem**: Phone app needs to call the orchestrator's approval/rejection endpoints when user responds to transaction notifications.

**🔧 REQUIRED IMPLEMENTATION:**

Add these methods to your phone app:

```typescript
// In your phone app's transaction service
async approveTransaction(transactionId: string, transactionHash?: string) {
  try {
    const response = await fetch(`${API_URL}/api/transactions/${transactionId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getPhoneJWT()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionHash: transactionHash || null
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to approve transaction: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Transaction approved successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to approve transaction:', error);
    throw error;
  }
}

async rejectTransaction(transactionId: string, reason?: string) {
  try {
    const response = await fetch(`${API_URL}/api/transactions/${transactionId}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getPhoneJWT()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: reason || 'User rejected'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to reject transaction: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Transaction rejected successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to reject transaction:', error);
    throw error;
  }
}
```

**Integration with UI**: Call these methods when user taps "Approve" or "Reject" buttons in your transaction approval dialog.

### **3. Enhanced FCM Message Handling**

**Problem**: Phone app needs to handle transaction approval notifications and extract the transaction data.

**🔧 REQUIRED IMPLEMENTATION:**

Update your FCM message handler to process transaction approval notifications:

```typescript
// In your FCM message handler
handleTransactionApproval(data: any) {
  const { transactionId, to, value, description, expiresAt } = data;
  
  // Show transaction approval dialog
  this.showTransactionDialog({
    transactionId,
    to,
    value,
    description,
    expiresAt,
    onApprove: (transactionHash?: string) => {
      this.approveTransaction(transactionId, transactionHash);
    },
    onReject: (reason?: string) => {
      this.rejectTransaction(transactionId, reason);
    }
  });
}

showTransactionDialog(transaction: any) {
  // Implement your UI dialog here
  // Should show:
  // - Transaction details (to, value, description)
  // - Approve button (calls transaction.onApprove)
  // - Reject button (calls transaction.onReject)
  // - Expiry time
}
```

---

## 🌐 **BROWSER APP TEAM - REQUIRED IMPLEMENTATIONS**

### **1. Paired Phone Device ID Storage**

**Problem**: Browser app needs to store and retrieve the paired phone device ID to link browser FCM tokens to phone devices.

**🔧 REQUIRED IMPLEMENTATION:**

Add these methods to your browser app:

```typescript
// In your browser app's storage service
setPairedPhoneDeviceId(phoneDeviceId: string) {
  localStorage.setItem('paired_phone_device_id', phoneDeviceId);
}

getPairedPhoneDeviceId(): string | null {
  return localStorage.getItem('paired_phone_device_id');
}

// Also store in session storage for immediate access
setPairedPhoneDeviceIdSession(phoneDeviceId: string) {
  sessionStorage.setItem('paired_phone_device_id', phoneDeviceId);
}

getPairedPhoneDeviceIdSession(): string | null {
  return sessionStorage.getItem('paired_phone_device_id');
}
```

### **2. Enhanced FCM Token Registration**

**Problem**: Browser app needs to link its FCM token to the paired phone device when registering with the orchestrator.

**🔧 REQUIRED IMPLEMENTATION:**

Update your browser app's FCM token registration:

```typescript
// In your browser app's FCM service
async registerTokenWithServer(token: string) {
  try {
    const pairedPhoneDeviceId = this.getPairedPhoneDeviceId();
    
    if (!pairedPhoneDeviceId) {
      throw new Error('No paired phone device ID found. Please pair with phone first.');
    }

    const response = await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getBrowserJWT()}`
      },
      body: JSON.stringify({
        deviceToken: token,
        deviceId: this.deviceId,
        deviceInfo: {
          platform: 'web',
          version: '1.0.0',
          model: navigator.userAgent,
          name: 'Browser App'
        },
        // Link to paired phone device
        pairedPhoneDeviceId: pairedPhoneDeviceId
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
```

### **3. Phone FCM Token Registration**

**Problem**: Browser app needs to send its FCM token to the phone app so the phone can register it with the orchestrator.

**🔧 REQUIRED IMPLEMENTATION:**

Add this method to your browser app:

```typescript
// In your browser app's pairing service
async sendFCMTokenToPhone(fcmToken: string) {
  try {
    // This should be called during wallet pairing
    // You can use WebRTC, QR code, or any other communication method
    
    const pairingData = {
      type: 'fcm_token_registration',
      browserDeviceId: this.deviceId,
      browserFCMToken: fcmToken,
      timestamp: Date.now()
    };
    
    // Send to phone via your existing pairing mechanism
    await this.sendPairingData(pairingData);
    
    console.log('FCM token sent to phone for registration');
  } catch (error) {
    console.error('Failed to send FCM token to phone:', error);
    throw error;
  }
}
```

### **4. Enhanced FCM Message Handling**

**Problem**: Browser app needs to handle transaction status updates from the orchestrator.

**🔧 REQUIRED IMPLEMENTATION:**

Update your FCM message handler:

```typescript
// In your browser app's FCM service
handleTransactionStatusUpdate(data: any) {
  const { transactionId, status, transactionHash, error } = data;
  
  console.log('Transaction status update received:', {
    transactionId,
    status,
    transactionHash,
    error
  });
  
  // Update your transaction list/UI
  this.updateTransactionStatus(transactionId, {
    status,
    transactionHash,
    error,
    updatedAt: new Date().toISOString()
  });
  
  // Show notification to user
  this.showStatusNotification(transactionId, status, transactionHash);
}

updateTransactionStatus(transactionId: string, updates: any) {
  // Update your local transaction state
  // This should update your React state, Vue state, or whatever state management you use
}

showStatusNotification(transactionId: string, status: string, transactionHash?: string) {
  // Show a toast notification or update UI to inform user of status change
  const messages = {
    'APPROVED': `Transaction approved${transactionHash ? ` - Hash: ${transactionHash}` : ''}`,
    'REJECTED': 'Transaction rejected',
    'EXPIRED': 'Transaction expired',
    'FAILED': 'Transaction failed'
  };
  
  const message = messages[status] || `Transaction ${status.toLowerCase()}`;
  
  // Show notification (implement based on your UI framework)
  this.showToast(message);
}
```

---

## 🔄 **COMPLETE INTEGRATION FLOW**

Here's how the complete flow should work:

### **1. Initial Setup (Wallet Pairing)**
1. **Browser** generates FCM token
2. **Browser** sends FCM token to **Phone** via pairing mechanism
3. **Phone** receives FCM token and calls `registerBrowserFCMToken()`
4. **Phone** registers its own FCM token with orchestrator
5. **Browser** stores paired phone device ID

### **2. Transaction Creation Flow**
1. **Browser** creates transaction via `/api/transactions`
2. **Orchestrator** sends FCM notification to **Phone**
3. **Phone** receives notification and shows approval dialog
4. **User** approves/rejects on phone
5. **Phone** calls `/api/transactions/{id}/approve` or `/api/transactions/{id}/reject`
6. **Orchestrator** updates transaction status and sends FCM to **Browser**
7. **Browser** receives status update and updates UI

---

## 🧪 **TESTING CHECKLIST**

### **Phone App Testing**
- [ ] FCM token registration with orchestrator works
- [ ] Browser FCM token registration works
- [ ] Transaction approval notifications are received
- [ ] Transaction approval API calls work
- [ ] Transaction rejection API calls work
- [ ] UI shows transaction details correctly

### **Browser App Testing**
- [ ] FCM token registration with orchestrator works
- [ ] Paired phone device ID is stored correctly
- [ ] FCM token is sent to phone during pairing
- [ ] Transaction creation works
- [ ] Transaction status updates are received via FCM
- [ ] UI updates when transaction status changes

### **End-to-End Testing**
- [ ] Complete transaction flow works (create → approve → status update)
- [ ] Complete transaction flow works (create → reject → status update)
- [ ] FCM notifications work in both foreground and background
- [ ] Error handling works (expired transactions, network errors, etc.)

---

## 🚨 **CRITICAL NOTES**

1. **Authentication**: All API calls must include proper JWT tokens
2. **Error Handling**: Implement proper error handling for all network calls
3. **Token Validation**: Validate FCM tokens before sending to orchestrator
4. **Device ID Consistency**: Ensure device IDs are consistent across app restarts
5. **Network Resilience**: Implement retry logic for failed API calls
6. **User Experience**: Show loading states and error messages to users

---

## 📞 **SUPPORT**

If you encounter any issues during implementation:

1. Check the orchestrator logs for error messages
2. Verify FCM token format and validity
3. Ensure all required fields are included in API calls
4. Test with the orchestrator's test endpoints first
5. Use browser dev tools and phone debugging tools to trace the flow

The orchestrator server is now ready and waiting for your implementations!
