import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// 1. Parsing Service Account dari environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

// 2. Inisialisasi aplikasi hanya jika belum ada aplikasi yang berjalan
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// 3. Export instance yang sudah diinisialisasi
export const adminAuth = getAuth();
export const adminDb = getFirestore();