import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCQWvoDxDyVCuLEDiwammjUIVYxVARzJig",
    authDomain: "project-ta-951b4.firebaseapp.com",
    projectId: "project-ta-951b4",
    storageBucket: "project-ta-951b4.firebasestorage.app",
    messagingSenderId: "217854138058",
    appId: "1:217854138058:web:50a5bcd5a61ac1820c4633",
    measurementId: "G-6ML8QQEGNZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Check if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Redirect to dashboard if already logged in
        window.location.href = '../dashboard/';
    }
});

// Sign in function
document.getElementById('signInBtn').addEventListener('click', () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    
    if (!email || !password) {
        alert('Email dan password harus diisi!');
        return;
    }
    
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log('User signed in:', userCredential.user);
            // Redirect to dashboard
            window.location.href = '../dashboard/';
        })
        .catch((error) => {
            console.error('Sign in error:', error.message);
            alert('Login gagal: ' + error.message);
        });
});

// Allow Enter key to submit
document.getElementById('passwordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('signInBtn').click();
    }
});

document.getElementById('emailInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('signInBtn').click();
    }
});
