
import React from 'react';

const AlertDialog = ({ message, type, onConfirm, onCancel, onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-100' : type === 'error' ? 'bg-red-100' : 'bg-blue-100';
  const textColor = type === 'success' ? 'text-green-700' : type === 'error' ? 'text-red-700' : 'text-blue-700';
  const borderColor = type === 'success' ? 'border-green-500' : type === 'error' ? 'border-red-500' : 'border-blue-500';

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className={`rounded-xl shadow-2xl p-6 w-full max-w-sm text-center ${bgColor} ${textColor} border-t-4 ${borderColor} relative transform scale-100 opacity-100 transition-all duration-300 ease-out`}>
        <p className="text-lg sm:text-xl font-semibold mb-4">{message}</p>
        {type === 'confirm' ? (
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg shadow-md hover:bg-teal-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 text-sm sm:text-base"
            >
              Confirmar
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-sm sm:text-base"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg shadow-md transition duration-300 ${type === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'} focus:outline-none focus:ring-2 focus:ring-opacity-50 ${type === 'success' ? 'focus:ring-green-500' : 'focus:ring-red-500'} text-sm sm:text-base`}
          >
            Ok
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertDialog;