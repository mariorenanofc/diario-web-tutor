// src/components/Header.js
import React, { useState } from "react"; // Adicionado useState
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";

const Header = ({ setCurrentPage, currentPage }) => { // Recebe currentPage
  const { user, auth } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Estado para o menu mobile

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  const NavButton = ({ pageName, label, bgColor, hoverBgColor, ringColor }) => (
    <button
      onClick={() => {
        setCurrentPage(pageName);
        setIsMenuOpen(false); // Fecha o menu ao clicar em um item
      }}
      className={`
        px-3 py-1 sm:px-4 sm:py-2 rounded-lg shadow-md
        transition duration-300 ease-in-out transform hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-opacity-50 text-sm
        ${pageName === currentPage ? 'bg-teal-700 text-white shadow-xl' : `${bgColor} text-white`}
        ${pageName === currentPage ? 'focus:ring-teal-500' : `hover:${hoverBgColor} focus:ring-${ringColor}`}
      `}
    >
      {label}
    </button>
  );

  return (
    <header className="bg-white shadow-lg rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center mb-8 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="flex justify-between items-center w-full sm:w-auto mb-4 sm:mb-0">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#007B8A] transition-all duration-300 dark:text-teal-400">
            Diário Web do Tutor
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Por Mário Renan</p>
        </div>
        {/* Botão Hambúrguer para Mobile */}
        <button
          className="sm:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            ></path>
          </svg>
        </button>
      </div>

      {/* Navegação - visível no desktop, colapsável no mobile */}
      <nav
        className={`
          flex flex-col sm:flex-row flex-wrap justify-center sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto
          ${isMenuOpen ? "block" : "hidden sm:flex"}
          mt-4 sm:mt-0 p-4 sm:p-0 rounded-lg sm:rounded-none bg-gray-50 sm:bg-transparent dark:bg-gray-700 dark:text-gray-100 transition-colors duration-300
        `}
      >
        <NavButton pageName="journal" label="Meu Diário" bgColor="bg-[#007B8A]" hoverBgColor="bg-teal-700" ringColor="teal-500" />
        <NavButton pageName="dailyPlanning" label="Planejamento Diário" bgColor="bg-[#FF9800]" hoverBgColor="bg-orange-600" ringColor="orange-500" />
        <NavButton pageName="microCareers" label="Microcarreiras" bgColor="bg-purple-600" hoverBgColor="bg-purple-700" ringColor="purple-500" />
        <NavButton pageName="dashboard" label="Dashboard" bgColor="bg-[#FF9800]" hoverBgColor="bg-orange-600" ringColor="orange-500" />
        <NavButton pageName="profile" label="Meu Perfil" bgColor="bg-gray-600" hoverBgColor="bg-gray-700" ringColor="gray-500" />
        {user && user.isAnonymous === false && (
          <button
            onClick={handleLogout}
            className="px-3 py-1 sm:px-4 sm:py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm"
          >
            Sair
          </button>
        )}
      </nav>
    </header>
  );
};

export default Header;