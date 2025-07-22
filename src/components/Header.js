// src/components/Header.js
import React from "react";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";

const Header = ({ setCurrentPage }) => {
  const { user, auth } = useAuth();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  return (
    <header className="bg-white shadow-lg rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center mb-8">
      <div className="text-center sm:text-left mb-4 sm:mb-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#007B8A] transition-all duration-300">
          Diário Web do Tutor
        </h1>
        <p className="text-sm text-gray-600">Por Mário Renan</p>
      </div>
      <nav className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
        <button
          onClick={() => setCurrentPage("journal")}
          className="px-3 py-1 sm:px-4 sm:py-2 bg-[#007B8A] text-white rounded-lg shadow-md hover:bg-teal-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007B8A] focus:ring-opacity-50 text-sm"
        >
          Meu Diário
        </button>
        <button
          onClick={() => setCurrentPage("dailyPlanning")}
          className="px-3 py-1 sm:px-4 sm:py-2 bg-[#FF9800] text-white rounded-lg shadow-md hover:bg-orange-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:ring-opacity-50 text-sm"
        >
          Planejamento Diário
        </button>
        <button
          onClick={() => setCurrentPage("microCareers")}
          className="px-3 py-1 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 text-sm"
        >
          Microcarreiras
        </button>
        <button
          onClick={() => setCurrentPage("dashboard")}
          className="px-3 py-1 sm:px-4 sm:py-2 bg-[#FF9800] text-white rounded-lg shadow-md hover:bg-orange-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:ring-opacity-50 text-sm"
        >
          Dashboard
        </button>
        <button
          onClick={() => setCurrentPage("profile")}
          className="px-3 py-1 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-sm"
        >
          Meu Perfil
        </button>
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
