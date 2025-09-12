import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Initialize Firebase Admin SDK
try {
  // Method 1: Use JSON file path from environment variable
  if (process.env.FIREBASE_CREDENTIALS_PATH) {
    const serviceAccountPath = process.env.FIREBASE_CREDENTIALS_PATH;
    initializeApp({
      credential: cert(serviceAccountPath),
      projectId: "broswerintent-mpc-wallet"
    });
    console.log('Firebase Admin SDK initialized with JSON file:', serviceAccountPath);
  }
  // Method 2: Use default credentials (Google Cloud Application Default Credentials)
  else {
    initializeApp({
      projectId: "broswerintent-mpc-wallet"
    });
    console.log('Firebase Admin SDK initialized with default credentials');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  
  // Fallback: Initialize without credentials for development
  try {
    initializeApp({
      projectId: "broswerintent-mpc-wallet"
    });
    console.log('Firebase Admin SDK initialized without credentials (development mode)');
  } catch (fallbackError) {
    console.error('Failed to initialize Firebase Admin SDK even without credentials:', fallbackError);
  }
}

export const firebaseAuth = getAuth();
export const firestore = getFirestore();
