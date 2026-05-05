// ================================================================
// CONFIGURAÇÃO FIREBASE — Gestão Clínica Oftalmológica v5.0
// Substitua pelos seus dados reais do Firebase Console
// ================================================================

const firebaseConfig = {
  apiKey: "AIzaSyDSUaWzB0e-v51yBQSBEPX-KU5LiP9MUQg",
  authDomain: "saas-oftalmo15.firebaseapp.com",
  databaseURL: "https://saas-oftalmo15-default-rtdb.firebaseio.com",
  projectId: "saas-oftalmo15",
  storageBucket: "saas-oftalmo15.firebasestorage.app",
  messagingSenderId: "543647426403",
  appId: "1:543647426403:web:88ba45d9eeab016cc6d556",
};

// Inicializar Firebase (SDK compat v9)
firebase.initializeApp(firebaseConfig);

// Instâncias globais
const auth = firebase.auth();
const db = firebase.database();
