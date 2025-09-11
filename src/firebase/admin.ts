import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';


// Load Firebase service account from JSON file
try {
  const serviceAccount={
    "type": "service_account",
    "project_id": "broswerintent-mpc-wallet",
    "private_key_id": process.env.PRIVATE_KEY_ID,
    "private_key": process.env.PRIVATE_KEY,
    "client_email": process.env.CLIENT_EMAIL,
    "client_id": process.env.CLIENT_ID,
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40broswerintent-mpc-wallet.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
  };
  
  initializeApp({
    credential: cert(serviceAccount as any),
    projectId: process.env.PROJECT_ID
  });
  
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  // Initialize without credentials for development
  try {
    initializeApp();
    console.log('Firebase Admin SDK initialized without credentials');
  } catch (fallbackError) {
    console.error('Failed to initialize Firebase Admin SDK even without credentials:', fallbackError);
  }
}

export const firebaseAuth = getAuth();
export const firestore = getFirestore();
