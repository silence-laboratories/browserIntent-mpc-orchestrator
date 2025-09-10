import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Load Firebase service account from JSON file
const serviceAccountPath = path.join(__dirname, '..', '..', 'broswerintent-mpc-wallet-firebase-admin.json');

try {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
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
