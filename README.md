# BrowserIntent MPC Orchestrator

A secure Node.js/Express orchestrator service for managing MPC wallet operations between browser and mobile applications. This service handles authentication, device pairing, and key generation workflows for the BrowserIntent MPC wallet system.

## 🚀 Features

- **🔐 Secure Authentication**: Firebase-based authentication with JWT tokens
- **📱 Device Pairing**: Secure pairing between browser and mobile devices
- **🔑 Key Generation**: Orchestrated MPC key generation sessions
- **📊 Real-time Notifications**: Push notifications for keygen requests
- **🛡️ Security First**: Rate limiting, CORS protection, and input validation
- **📝 Comprehensive Logging**: Structured logging with Pino
- **🔧 TypeScript**: Full TypeScript support with type safety

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Browser   │◄──►│ Orchestrator │◄──►│    Phone    │
│  (Web App)  │    │   Service    │    │  (Mobile)   │
└─────────────┘    └──────────────┘    └─────────────┘
```

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with Authentication enabled
- Google Cloud service account credentials

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone 
   cd BrowserIntent-mpc-orchestrator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```


4. **Configure your `.env` file**
   ```env
   PORT=3010
   CORS_ORIGIN=http://localhost:3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_TTL=24h
# Firebase Configuration
GOOGLE_APPLICATION_CREDENTIALS=/path/to/broswerintent-mpc-wallet-firebase-admin.json
   SERVER_URL=http://localhost:3010
   ```

5. **Set up Firebase credentials**
   - Download your Firebase service account key from Google Cloud Console
   - Extract the values from the JSON file and set them as environment variables

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

The server will start on `http://localhost:3010` (or the port specified in your `.env` file).

## 📚 Complete API Documentation

### Health Check
```http
GET /health
```

### Authentication Endpoints (`/api/auth/*`)

#### Browser Login
```http
POST /api/auth/browser
Content-Type: application/json

{
  "id_token": "firebase_id_token_from_browser"
}
```

#### Phone Login
```http
POST /api/auth/phone
Content-Type: application/json

{
  "id_token": "firebase_id_token_from_phone"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <jwt_token>
```

### Device Pairing Endpoints (`/api/*`)

#### Start Pairing Session
```http
POST /api/start_pairing
Authorization: Bearer <browser_jwt_token>
```

#### Get Session Details (Browser)
```http
GET /api/session/:sessionId
Authorization: Bearer <browser_jwt_token>
```

#### Get Session Status (Phone)
```http
GET /api/session/:sessionId/status
Authorization: Bearer <phone_jwt_token>
```

#### Claim Session (Phone)
```http
POST /api/claim_session
Authorization: Bearer <phone_jwt_token>
Content-Type: application/json

{
  "sessionId": "uuid",
  "nonce": "session_nonce",
  "deviceId": "phone_device_id"
}
```

### Key Generation Endpoints (`/api/*`)

#### Start Key Generation (Browser)
```http
POST /api/start_keygen
Authorization: Bearer <browser_jwt_token>
```

#### Start Key Generation (Phone)
```http
POST /api/start_keygen_phone
Authorization: Bearer <phone_jwt_token>
```

#### Get Key Generation Session
```http
GET /api/keygen/:sessionId
Authorization: Bearer <browser_jwt_token>
```

#### Complete Key Generation
```http
POST /api/complete_keygen
Authorization: Bearer <phone_jwt_token>
Content-Type: application/json

{
  "sessionId": "uuid",
  "keygenData": { /* keygen data */ }
}
```

#### Key Generation Done
```http
POST /api/keygen_done
Authorization: Bearer <phone_jwt_token>
Content-Type: application/json

{
  "sessionId": "uuid",
  "keyId": "generated_key_id",
  "publicKey": "generated_public_key",
  "address": "wallet_address"
}
```

#### Get Notifications (Phone)
```http
GET /api/notifications
Authorization: Bearer <phone_jwt_token>
```

#### Mark Notification as Read
```http
POST /api/notifications/:notificationId/read
Authorization: Bearer <phone_jwt_token>
```

### Wallet Endpoints (`/api/wallets/*`)

#### Get User Wallets
```http
GET /api/wallets
Authorization: Bearer <browser_jwt_token>
```

#### Get Wallet Count
```http
GET /api/wallets/count
Authorization: Bearer <browser_jwt_token>
```

### Transaction Endpoints (`/api/transactions/*`)

#### Create Transaction
```http
POST /api/transactions
Authorization: Bearer <browser_jwt_token>
Content-Type: application/json

{
  "walletId": "wallet_id",
  "to": "recipient_address",
  "value": "0.1",
  "data": "0x",
  "gasLimit": "21000",
  "expiresAt": "2024-01-01T00:00:00Z"
}
```

#### Get All Transactions
```http
GET /api/transactions
Authorization: Bearer <browser_jwt_token>
```

#### Get Specific Transaction
```http
GET /api/transactions/:transactionId
Authorization: Bearer <browser_jwt_token>
```

#### Get Transaction Status
```http
GET /api/transactions/:transactionId/status
Authorization: Bearer <browser_jwt_token>
```

#### Approve Transaction
```http
POST /api/transactions/:transactionId/approve
Authorization: Bearer <phone_jwt_token>
Content-Type: application/json

{
  "transactionHash": "0x..."
}
```

#### Reject Transaction
```http
POST /api/transactions/:transactionId/reject
Authorization: Bearer <phone_jwt_token>
```

### Notification Management Endpoints (`/api/notifications/*`)

#### Register FCM Token (Phone)
```http
POST /api/notifications/register-token
Authorization: Bearer <phone_jwt_token>
Content-Type: application/json

{
  "deviceToken": "fcm_device_token",
  "deviceId": "device_id",
  "deviceInfo": {
    "platform": "ios",
    "version": "1.0.0"
  }
}
```

#### Unregister FCM Token (Phone)
```http
POST /api/notifications/unregister-token
Authorization: Bearer <phone_jwt_token>
Content-Type: application/json

{
  "deviceId": "device_id"
}
```

#### Get Device Tokens
```http
GET /api/notifications/devices
Authorization: Bearer <phone_jwt_token>
```

#### Register Browser FCM Token
```http
POST /api/notifications/register-browser-token
Authorization: Bearer <phone_jwt_token>
Content-Type: application/json

{
  "browserDeviceId": "browser_device_id",
  "browserFCMToken": "browser_fcm_token",
  "phoneDeviceId": "phone_device_id"
}
```

#### Send Transaction Notification (Browser)
```http
POST /api/notifications/transaction
Authorization: Bearer <browser_jwt_token>
Content-Type: application/json

{
  "walletId": "wallet_id",
  "transactionId": "transaction_id"
}
```

#### Test Notification (Development Only)
```http
POST /api/notifications/test
Content-Type: application/json

{
  "deviceToken": "fcm_token",
  "message": "test message"
}
```

#### Test Notification with Auth (Browser)
```http
POST /api/notifications/test-notification
Authorization: Bearer <browser_jwt_token>
Content-Type: application/json

{
  "message": "test message"
}
```

### Test Endpoints (Development Only)

#### Test Transaction Endpoint
```http
POST /api/transactions/test
Content-Type: application/json

{
  "test": "data"
}
```

#### Test Transaction with Auth
```http
POST /api/transactions/test-auth
Authorization: Bearer <browser_jwt_token>
Content-Type: application/json

{
  "test": "data"
}
```

## 🔧 Environment Variables

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3010` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-jwt-key-here` |
| `JWT_TTL` | JWT token lifetime | `24h` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase JSON file | `/path/to/firebase-admin.json` |
| `SERVER_URL` | Server URL for keygen | `http://localhost:3010` |


## 🏗️ Project Structure

```
src/
├── config/           # Configuration management
├── controllers/      # Request handlers
├── firebase/         # Firebase integration
├── middleware/       # Express middleware
├── routes/           # API route definitions
├── utils/            # Utility functions
└── server.ts         # Main application entry point
```


## 🧪 Development

### Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build TypeScript to JavaScript
npm start        # Start production server
npm test         # Run tests (not implemented yet)
```


## 🔄 Version History

- **v1.0.0**: Initial release with authentication, pairing, and key generation features
