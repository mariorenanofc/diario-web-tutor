// src/App.js
import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Import separated components
import { AuthContext } from './context/AuthContext';
import Header from './components/Header';
import AuthScreen from './pages/AuthScreen'; // Já está importado
import DashboardPage from './pages/DashboardPage';
import JournalPage from './pages/JournalPage'; // Já está importado
import DailyPlanningPage from './pages/DailyPlanningPage';
import MicroCarrersCanvasPage from './pages/MicroCarresCanvasPage'; // Corrigido o nome do arquivo, como fizemos antes
import ProfilePage from './pages/ProfilePage';

function App() {
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('journal');

  const APP_ID = useMemo(() => typeof __app_id !== 'undefined' ? __app_id : process.env.REACT_APP_FIREBASE_APP_ID || 'default-app-id-dev', []);
  const FIREBASE_CONFIG = useMemo(() => typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : (process.env.REACT_APP_FIREBASE_CONFIG ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) : {}), []);
  const GEMINI_API_KEY = useMemo(() => typeof __gemini_api_key !== 'undefined' ? __gemini_api_key : process.env.REACT_APP_GEMINI_API_KEY || '', []);
  const INITIAL_AUTH_TOKEN = useMemo(() => typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : process.env.REACT_APP_INITIAL_AUTH_TOKEN || '', []);

  useEffect(() => {
    if (Object.keys(FIREBASE_CONFIG).length > 0 && FIREBASE_CONFIG.apiKey) {
      const app = initializeApp(FIREBASE_CONFIG);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          // Se o usuário está logado (mesmo que anonimamente), mantenha na página atual ou redirecione para 'journal'
          if (!currentPage || currentPage === 'authScreen') {
              setCurrentPage('journal'); // Redireciona para o diário se veio da tela de login
          }
        } else {
          setUser(null); // Garante que o user é null se não houver ninguém logado
          setCurrentPage('authScreen'); // Se não está logado, vai para a tela de autenticação
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      console.error("Firebase config não fornecido ou inválido. Verifique suas variáveis de ambiente.");
      setLoading(false);
      setCurrentPage('authScreen'); // Se o Firebase não puder ser inicializado, força a tela de login
    }
  }, [APP_ID, FIREBASE_CONFIG, GEMINI_API_KEY, INITIAL_AUTH_TOKEN]); // Adicione todas as variáveis usadas aqui como dependências

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-100">
        <div className="text-lg font-semibold text-gray-700">Carregando Diário Web...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, db, auth, appId: APP_ID, geminiApiKey: GEMINI_API_KEY }}>
      <div className="min-h-screen bg-stone-100 font-inter text-gray-800 p-4 sm:p-6 lg:p-8">
        <Header setCurrentPage={setCurrentPage} />
        {/* Lógica de renderização de páginas baseada no currentPage e estado do usuário */}
        {user && user.isAnonymous === false ? ( // Usuário logado com conta real
            <div className="mt-8">
                {currentPage === 'journal' && <JournalPage setCurrentPage={setCurrentPage} />}
                {currentPage === 'dashboard' && <DashboardPage />}
                {currentPage === 'profile' && <ProfilePage />}
                {currentPage === 'dailyPlanning' && <DailyPlanningPage />}
                {currentPage === 'microCareers' && <MicroCarrersCanvasPage />}
            </div>
        ) : currentPage === 'authScreen' ? ( // Se a página for AuthScreen ou se não houver usuário logado (nem anônimo)
            <AuthScreen />
        ) : ( // Este caso pega o usuário anônimo e o direciona para a JournalPage, onde pode clicar para logar
            <div className="mt-8">
                {currentPage === 'journal' && <JournalPage setCurrentPage={setCurrentPage} />}
                {/* Outras páginas que usuários anônimos poderiam ver, se houver */}
            </div>
        )}
      </div>
    </AuthContext.Provider>
  );
}

export default App;