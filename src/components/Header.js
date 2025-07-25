// src/components/Header.js
import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";

const Header = ({ setCurrentPage, currentPage }) => {
  const { user, auth } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  const NavButton = ({ pageName, label, bgColor, hoverBgColor, ringColor }) => (
    <button
      onClick={() => {
        setCurrentPage(pageName);
        setIsMenuOpen(false);
      }}
      className={`
        px-3 py-1 sm:px-4 sm:py-2 rounded-lg shadow-md
        transition duration-300 ease-in-out transform hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-opacity-50 text-sm
        ${pageName === currentPage ? 'bg-brand-primary text-white shadow-xl' : `${bgColor} text-white`}
        ${pageName === currentPage ? 'focus:ring-brand-primary' : `hover:${hoverBgColor} focus:ring-${ringColor}`}
      `}
    >
      {label}
    </button>
  );

  return (
    <header className="bg-white shadow-lg rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center mb-8 dark:bg-gray-800 dark:text-gray-primary transition-colors duration-300">
      <div className="flex justify-between items-center w-full sm:w-auto mb-4 sm:mb-0">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary transition-all duration-300 dark:text-accent-green">
            Diário Web do Tutor
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-primary">Por Mário Renan</p>
        </div>
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

      <nav
        className={`
          flex flex-col sm:flex-row flex-wrap justify-center sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto
          ${isMenuOpen ? "block" : "hidden sm:flex"}
          mt-4 sm:mt-0 p-4 sm:p-0 rounded-lg sm:rounded-none bg-background-light sm:bg-transparent dark:bg-gray-900 dark:text-gray-primary transition-colors duration-300
        `}
      >
        <NavButton pageName="journal" label="Meu Diário" bgColor="bg-brand-primary" hoverBgColor="bg-brand-primary-dark" ringColor="brand-primary" />
        <NavButton pageName="dailyPlanning" label="Planejamento Diário" bgColor="bg-accent-red" hoverBgColor="bg-accent-red-dark" ringColor="accent-red" />
        <NavButton pageName="microCareers" label="Microcarreiras" bgColor="bg-purple-600" hoverBgColor="bg-purple-700" ringColor="purple-500" />
        <NavButton pageName="dashboard" label="Dashboard" bgColor="bg-accent-red" hoverBgColor="bg-accent-red-dark" ringColor="accent-red" />
        <NavButton pageName="profile" label="Meu Perfil" bgColor="bg-brand-primary" hoverBgColor="bg-brand-primary-dark" ringColor="brand-primary" />
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