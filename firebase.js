import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9Ui0oVlfb81ADeZL8p3lK4gng38-yHiA",
  authDomain: "ojeda-sorteos.firebaseapp.com",
  projectId: "ojeda-sorteos",
  storageBucket: "ojeda-sorteos.firebasestorage.app",
  messagingSenderId: "1005427624246",
  appId: "1:1005427624246:web:91fbd8c17bd15a68468b97"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const storage = getStorage(app);

export { db, storage };