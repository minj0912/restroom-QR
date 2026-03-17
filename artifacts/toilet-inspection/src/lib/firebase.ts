import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAu4JSsO9w4D5MrGFCTiYRD9H6w33Gzmpw",
  authDomain: "restroom-qr.firebaseapp.com",
  projectId: "restroom-qr",
  storageBucket: "restroom-qr.firebasestorage.app",
  messagingSenderId: "264357357656",
  appId: "1:264357357656:web:144484e92968e87818022d",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
