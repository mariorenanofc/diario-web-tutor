import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Import separated components
import { AuthContext } from "./context/AuthContext";
import Header from "./components/Header";
import AuthScreen from "./pages/AuthScreen";
import DashboardPage from "./pages/DashboardPage";
import JournalPage from "./pages/JournalPage";
import DailyPlanningPage from "./pages/DailyPlanningPage";
import MicroCareersCanvasPage from "./pages/MicroCareersCanvasPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("journal");

  // NOVO: Estado para gerenciar o tema (light/dark)
  const [theme, setTheme] = useState(() => {
    // Inicializa o tema a partir do localStorage ou 'light' por padrão
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme : "light";
  });

  // Efeito para aplicar a classe 'dark' ao <html> e salvar no localStorage
  useEffect(() => {
    const root = document.documentElement; // Acessa a tag <html>
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]); // Roda sempre que o tema muda

  const APP_ID = useMemo(
    () =>
      typeof __app_id !== "undefined"
        ? __app_id
        : process.env.REACT_APP_FIREBASE_APP_ID || "default-app-id-dev",
    []
  );
  const FIREBASE_CONFIG = useMemo(
    () =>
      typeof __firebase_config !== "undefined"
        ? JSON.parse(__firebase_config)
        : process.env.REACT_APP_FIREBASE_CONFIG
        ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG)
        : {},
    []
  );
  const GEMINI_API_KEY = useMemo(
    () =>
      typeof __gemini_api_key !== "undefined"
        ? __gemini_api_key
        : process.env.REACT_APP_GEMINI_API_KEY || "",
    []
  );
  const INITIAL_AUTH_TOKEN = useMemo(
    () =>
      typeof __initial_auth_token !== "undefined"
        ? __initial_auth_token
        : process.env.REACT_APP_INITIAL_AUTH_TOKEN || "",
    []
  );

  useEffect(() => {
    // Adicionado currentPage às dependências do useEffect para que a lógica de redirecionamento funcione corretamente
    // quando o currentPage muda por causa do AuthState (login/logout).
    // Removido no App.js original: 'signInAnonymously' e 'signInWithCustomToken' imports não usados.
    // Se eles forem necessários, devem ser reintroduzidos no AuthScreen ou onde forem usados.
    if (Object.keys(FIREBASE_CONFIG).length > 0 && FIREBASE_CONFIG.apiKey) {
      const app = initializeApp(FIREBASE_CONFIG);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(
        firebaseAuth,
        async (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            if (currentPage === "authScreen") {
              setCurrentPage("journal");
            }
          } else {
            setUser(null);
            setCurrentPage("authScreen");
          }
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      console.error(
        "Firebase config não fornecido ou inválido. Verifique suas variáveis de ambiente."
      );
      setLoading(false);
      setCurrentPage("authScreen");
    }
  }, [
    APP_ID,
    FIREBASE_CONFIG,
    GEMINI_API_KEY,
    INITIAL_AUTH_TOKEN,
    currentPage,
  ]); // Adicionado currentPage às dependências

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-100">
        <div className="text-lg font-semibold text-gray-700">
          Carregando Diário Web...
        </div>
      </div>
    );
  }

  return (
    // Passe 'theme' e 'setTheme' para o AuthContext
    <AuthContext.Provider
      value={{
        user,
        db,
        auth,
        appId: APP_ID,
        geminiApiKey: GEMINI_API_KEY,
        theme,
        setTheme,
      }}
    >
      <div className="min-h-screen bg-stone-100 font-inter dark:bg-gray-900 dark:text-gray-100 text-gray-900 p-4 sm:p-6 lg:p-8">
        <Header setCurrentPage={setCurrentPage} currentPage={currentPage} />{" "}
        {/* Passe currentPage para Header */}
        {currentPage === "authScreen" ? (
          <AuthScreen />
        ) : user ? (
          <div className="mt-8">
            {currentPage === "journal" && (
              <JournalPage setCurrentPage={setCurrentPage} />
            )}
            {currentPage === "dashboard" && <DashboardPage />}
            {currentPage === "profile" && <ProfilePage />}
            {currentPage === "dailyPlanning" && <DailyPlanningPage />}
            {currentPage === "microCareers" && <MicroCareersCanvasPage />}
          </div>
        ) : (
          <AuthScreen />
        )}
      </div>
    </AuthContext.Provider>
  );
}

export default App;
