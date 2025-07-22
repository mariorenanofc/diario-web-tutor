// src/pages/AuthScreen.js
import React from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useAuth } from "../context/AuthContext";

const AuthScreen = () => {
  const { auth } = useAuth();

  const handleGoogleSignIn = async () => {
    if (auth) {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error("Erro ao fazer login com Google:", error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] bg-white rounded-xl shadow-lg p-4 sm:p-8 animate-fade-in dark:bg-gray-800 dark:text-gray-200 transition-colors duration-300">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-700 mb-4 sm:mb-6 text-center dark:text-teal-400">
        Bem-vindo ao Diário Web!
      </h2>
      <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 text-center max-w-prose dark:text-gray-300">
        Faça login com sua conta Gmail para começar a registrar suas reflexões
        diárias e acompanhar seu crescimento pessoal.
      </p>
      <button
        onClick={handleGoogleSignIn}
        className="flex items-center px-5 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-xl hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-base sm:text-lg"
      >
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M22.675 11.268c0-.655-.056-1.29-.164-1.91H12v3.618h6.29a4.35 4.35 0 01-1.897 2.846v2.332h3.007c1.76-1.628 2.776-4.015 2.776-6.886z"
            fill="#4285F4"
          />
          <path
            d="M12 23c3.27 0 6.01-1.076 8.01-2.915l-3.007-2.332c-1.066.712-2.427 1.137-4.993 1.137-3.834 0-7.097-2.583-8.26-6.04H.76v2.396C2.28 20.45 6.71 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M3.74 14.18c-.29-.86-.45-1.78-.45-2.73s.16-1.87.45-2.73V6.32H.76C.27 7.21 0 8.57 0 10.05c0 1.48.27 2.84.76 3.79l2.98 2.39z"
            fill="#FBBC05"
          />
          <path
            d="M12 4.418c1.79 0 3.39.61 4.66 1.82l2.67-2.67C18.01 1.676 15.27.5 12 .5 6.71.5 2.28 3.05.76 6.32l2.98 2.39C4.9 5.51 8.16 3.01 12 3.01z"
            fill="#EA4335"
          />
        </svg>
        Entrar com Google
      </button>
      <p className="mt-4 text-sm text-gray-500 text-center dark:text-gray-400">
        Seus dados serão armazenados de forma privada para sua conta.
      </p>
    </div>
  );
};

export default AuthScreen;
