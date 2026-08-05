import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey:            "AIzaSyAivlrs5NCv_PKy9mivAQXRt1KbF7by8JY",
  authDomain:        "al-nujha-technician.firebaseapp.com",
  databaseURL:       "https://al-nujha-technician-default-rtdb.firebaseio.com",
  projectId:         "al-nujha-technician",
  storageBucket:     "al-nujha-technician.firebasestorage.app",
  messagingSenderId: "510810298849",
  appId:             "1:510810298849:web:75ef4bc272a4873b5f5aa0",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getDatabase(app);
