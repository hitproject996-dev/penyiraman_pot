import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

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

// Check authentication
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('dashboardPage').hidden = false;
        document.getElementById('loginMessage').hidden = true;
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('welcomeMessage').textContent = `Welcome back, ${user.email}!`;
        window.scrollTo(0, 0);
    } else {
        document.getElementById('dashboardPage').hidden = true;
        document.getElementById('loginMessage').hidden = false;
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }
});

// Sign out function
document.getElementById('signOutBtn').addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log('User signed out');
        window.location.href = '/';
    }).catch((error) => {
        console.error(error);
    });
});