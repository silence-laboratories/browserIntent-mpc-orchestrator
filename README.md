# BrowserIntent MPC Orchestrator

A secure Node.js/Express orchestrator service for managing Multi-Party Computation (MPC) wallet operations between browser and mobile applications. This service handles authentication, device pairing, and key generation workflows for the BrowserIntent MPC wallet system.

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
   git clone <repository-url>
   cd BrowserIntent-mpc-orchestrator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file**
   ```env
   # Server Configuration
   PORT=8080
   CORS_ORIGIN=http://localhost:3000
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_TTL=24h
   
   # Firebase Configuration
   GOOGLE_APPLICATION_CREDENTIALS=./path/to/your/firebase-admin.json
   FIREBASE_PROJECT_ID=your-firebase-project-id
   
   # Optional: Server URL for keygen
   SERVER_URL=http://localhost:8080
   ```

5. **Set up Firebase credentials**
   - Download your Firebase service account key from Google Cloud Console
   - Place it in a secure location (not in the repository)
   - Update `GOOGLE_APPLICATION_CREDENTIALS` in your `.env` file

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

The server will start on `http://localhost:8080` (or the port specified in your `.env` file).

## 📚 API Documentation

### Authentication Endpoints

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

### Device Pairing Endpoints

#### Start Pairing Session
```http
POST /api/start_pairing
Authorization: Bearer <browser_jwt_token>
```

#### Get Session Details
```http
GET /api/session/:sessionId
Authorization: Bearer <jwt_token>
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

### Key Generation Endpoints

#### Start Key Generation
```http
POST /api/start_keygen
Authorization: Bearer <jwt_token>
```

#### Get Key Generation Session
```http
GET /api/keygen/:sessionId
Authorization: Bearer <jwt_token>
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
  "publicKey": "generated_public_key"
}
```

### Notification Endpoints

#### Get Notifications
```http
GET /api/notifications
Authorization: Bearer <phone_jwt_token>
```

#### Mark Notification as Read
```http
POST /api/notifications/:notificationId/read
Authorization: Bearer <phone_jwt_token>
```

## 🔒 Security Features

### Authentication & Authorization
- Firebase Authentication integration
- JWT token-based session management
- Separate tokens for browser and phone clients
- Token refresh mechanism

### Rate Limiting
- Configurable rate limits on all endpoints
- Prevents abuse and brute force attacks

### Input Validation
- Zod schema validation for all inputs
- Type-safe request handling

### CORS Protection
- Configurable CORS origins
- Support for local development and mobile apps
- Secure credential handling

### Security Headers
- Helmet.js for security headers
- Content Security Policy (CSP)
- Protection against common web vulnerabilities

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



## 📝 Logging

The application uses Pino for structured logging with the following levels:
- `debug`: Development debugging information
- `info`: General application information
- `warn`: Warning messages
- `error`: Error messages

Logs are formatted for development and production environments.

## 🧪 Development

### Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build TypeScript to JavaScript
npm start        # Start production server
npm test         # Run tests (not implemented yet)
```

## 🚨 Security Considerations

1. **Never commit sensitive files**: The `.gitignore` is configured to exclude:
   - Environment files (`.env*`)
   - Firebase credentials (`*-firebase-admin.json`)
   - Service account keys

2. **Use strong JWT secrets**: Generate a cryptographically secure random string for `JWT_SECRET`

3. **Secure Firebase credentials**: Store service account keys in a secure location outside the repository



## 🔄 Version History

- **v1.0.0**: Initial release with authentication, pairing, and key generation features
