import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import AlertDialog from "../components/common/AlertDialog";
import LoadingSpinner from "../components/common/LoadingSpinner";

const ProfilePage = () => {
  const { user, db, appId, theme, setTheme } = useAuth(); // <--- OBTÉM theme E setTheme DO CONTEXTO
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    birthDate: "",
    phone: "",
    cityState: "",
    education: "",
    whatDefinesYou: "",
    futureInspirations: "",
  });
  const [originalProfileData, setOriginalProfileData] = useState({});
  const [alertState, setAlertState] = useState({
    message: "",
    type: "",
    onConfirm: null,
    onCancel: null,
    show: false,
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const showAlert = (message, type, onConfirm = null, onCancel = null) => {
    setAlertState({ message, type, onConfirm, onCancel, show: true });
  };

  const closeAlert = () => {
    setAlertState({ ...alertState, show: false });
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (db && user && appId) {
        // Garante que appId está disponível
        const userId = user.uid || "anonymous";
        const profileDocRef = doc(
          db,
          `artifacts/${appId}/users/${userId}/profile`,
          "userProfile"
        ); // <--- USA appId AQUI
        try {
          const docSnap = await getDoc(profileDocRef);
          let fetchedData = {};
          if (docSnap.exists()) {
            fetchedData = docSnap.data();
          } else {
            fetchedData = {
              name: user.displayName || "",
              email: user.email || "",
              birthDate: "",
              phone: "",
              cityState: "",
              education: "",
              whatDefinesYou: "",
              futureInspirations: "",
            };
          }
          setProfileData(fetchedData);
          setOriginalProfileData(fetchedData);
        } catch (error) {
          console.error("Erro ao carregar dados do perfil:", error);
          showAlert("Erro ao carregar dados do perfil.", "error");
        } finally {
          setLoading(false);
        }
      }
    };

    if (user && db) {
      // Chama o fetch apenas se user e db estiverem prontos
      fetchProfile();
    }
  }, [user, db, appId]); // Adiciona appId às dependências do useEffect

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};
    const phoneRegex = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (profileData.phone && !phoneRegex.test(profileData.phone)) {
      errors.phone =
        "Formato de telefone inválido (ex: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX).";
    }
    if (
      profileData.email &&
      !emailRegex.test(profileData.email) &&
      !user?.email
    ) {
      errors.email = "Formato de e-mail inválido.";
    }
    if (profileData.birthDate) {
      const birthDate = new Date(profileData.birthDate);
      const today = new Date();
      if (birthDate > today) {
        errors.birthDate = "A data de nascimento não pode ser no futuro.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setFormErrors({});
  };

  const handleCancelEdit = () => {
    setProfileData(originalProfileData);
    setIsEditing(false);
    setFormErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showAlert("Por favor, corrija os erros no formulário.", "error");
      return;
    }

    if (!db || !user || !appId) {
      // Garante que appId está disponível
      showAlert(
        "Erro: Usuário não autenticado, banco de dados não disponível ou appId ausente.",
        "error"
      );
      return;
    }

    setIsSaving(true);
    const userId = user.uid || "anonymous";
    const profileDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/profile`,
      "userProfile"
    ); // <--- USA appId AQUI

    try {
      await setDoc(profileDocRef, profileData, { merge: true });
      showAlert("Dados do perfil atualizados com sucesso!", "success");
      setOriginalProfileData(profileData);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      showAlert(`Erro ao salvar perfil: ${error.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Função para alternar o tema
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)] bg-background-light">
        <div className="text-lg font-semibold text-gray-700">
          Carregando perfil...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 dark:bg-gray-800 dark:text-gray-primary transition-colors duration-300"> {/* Aplica estilos de tema aqui */}
      <h2 className="text-xl sm:text-2xl font-bold text-brand-primary mb-6 dark:text-accent-green">
        Meu Perfil
      </h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6 dark:text-gray-300">
        Aqui você pode visualizar e editar suas informações pessoais,
        inspirações e detalhes de formação.
      </p>

      {alertState.show && <AlertDialog {...alertState} onClose={closeAlert} />}

      {/* Botão de Trocar Tema */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={toggleTheme}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg shadow-md hover:bg-gray-300 transition duration-300
                     dark:bg-gray-700 dark:text-gray-primary dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          {theme === 'light' ? 'Mudar para Tema Escuro 🌙' : 'Mudar para Tema Claro ☀️'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">
              Nome:
            </label>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleChange}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary transition-all duration-200 text-sm sm:text-base dark:bg-gray-700 dark:border-gray-600 dark:text-gray-primary"
                disabled={user?.displayName ? true : false}
              />
            ) : (
              <p className="p-2 sm:p-3 bg-background-light rounded-md text-sm sm:text-base text-black-text dark:bg-gray-700 dark:text-gray-primary">
                {profileData.name || "Não informado"}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">
              E-mail:
            </label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleChange}
                className={`w-full p-2 sm:p-3 border rounded-md focus:ring-brand-primary focus:border-brand-primary transition-all duration-200 text-sm sm:text-base dark:bg-gray-700 dark:border-gray-600 dark:text-gray-primary ${
                  formErrors.email ? "border-accent-red" : "border-gray-300"
                }`}
                disabled={user?.email ? true : false}
              />
            ) : (
              <p className="p-2 sm:p-3 bg-background-light rounded-md text-sm sm:text-base text-black-text dark:bg-gray-700 dark:text-gray-primary">
                {profileData.email || "Não informado"}
              </p>
            )}
            {formErrors.email && (
              <p className="text-accent-red text-xs sm:text-sm mt-1">
                {formErrors.email}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">
              Data de Nascimento:
            </label>
            {isEditing ? (
              <input
                type="date"
                name="birthDate"
                value={profileData.birthDate}
                onChange={handleChange}
                className={`w-full p-2 sm:p-3 border rounded-md focus:ring-brand-primary focus:border-brand-primary transition-all duration-200 text-sm sm:text-base dark:bg-gray-700 dark:border-gray-600 dark:text-gray-primary ${
                  formErrors.birthDate ? "border-accent-red" : "border-gray-300"
                }`}
              />
            ) : (
              <p className="p-2 sm:p-3 bg-background-light rounded-md text-sm sm:text-base text-black-text dark:bg-gray-700 dark:text-gray-primary">
                {profileData.birthDate || "Não informado"}
              </p>
            )}
            {formErrors.birthDate && (
              <p className="text-accent-red text-xs sm:text-sm mt-1">
                {formErrors.birthDate}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">
              Telefone:
            </label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={profileData.phone}
                onChange={handleChange}
                className={`w-full p-2 sm:p-3 border rounded-md focus:ring-brand-primary focus:border-brand-primary transition-all duration-200 text-sm sm:text-base dark:bg-gray-700 dark:border-gray-600 dark:text-gray-primary ${
                  formErrors.phone ? "border-accent-red" : "border-gray-300"
                }`}
              />
            ) : (
              <p className="p-2 sm:p-3 bg-background-light rounded-md text-sm sm:text-base text-black-text dark:bg-gray-700 dark:text-gray-primary">
                {profileData.phone || "Não informado"}
              </p>
            )}
            {formErrors.phone && (
              <p className="text-accent-red text-xs sm:text-sm mt-1">
                {formErrors.phone}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">
              Cidade/Estado:
            </label>
            {isEditing ? (
              <input
                type="text"
                name="cityState"
                value={profileData.cityState}
                onChange={handleChange}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary transition-all duration-200 text-sm sm:text-base dark:bg-gray-700 dark:border-gray-600 dark:text-gray-primary"
              />
            ) : (
              <p className="p-2 sm:p-3 bg-background-light rounded-md text-sm sm:text-base text-black-text dark:bg-gray-700 dark:text-gray-primary">
                {profileData.cityState || "Não informado"}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">
              Formação:
            </label>
            {isEditing ? (
              <input
                type="text"
                name="education"
                value={profileData.education}
                onChange={handleChange}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary transition-all duration-200 text-sm sm:text-base dark:bg-gray-700 dark:border-gray-600 dark:text-gray-primary"
              />
            ) : (
              <p className="p-2 sm:p-3 bg-background-light rounded-md text-sm sm:text-base text-black-text dark:bg-gray-700 dark:text-gray-primary">
                {profileData.education || "Não informado"}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">
            O que te define?
          </label>
          {isEditing ? (
            <textarea
              name="whatDefinesYou"
              value={profileData.whatDefinesYou}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary transition-all duration-200 text-sm sm:text-base dark:bg-gray-700 dark:border-gray-600 dark:text-gray-primary"
            ></textarea>
          ) : (
            <p className="p-2 sm:p-3 bg-background-light rounded-md text-sm sm:text-base text-black-text whitespace-pre-wrap dark:bg-gray-700 dark:text-gray-primary">
              {profileData.whatDefinesYou || "Não informado"}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">
            Inspirações para o futuro:
          </label>
          {isEditing ? (
            <textarea
              name="futureInspirations"
              value={profileData.futureInspirations}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary transition-all duration-200 text-sm sm:text-base dark:bg-gray-700 dark:border-gray-600 dark:text-gray-primary"
            ></textarea>
          ) : (
            <p className="p-2 sm:p-3 bg-background-light rounded-md text-sm sm:text-base text-black-text whitespace-pre-wrap dark:bg-gray-700 dark:text-gray-primary">
              {profileData.futureInspirations || "Não informado"}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 sm:gap-4 mt-6">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-5 py-2 sm:px-6 sm:py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-sm sm:text-base"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 sm:px-6 sm:py-3 bg-brand-primary text-white font-semibold rounded-lg shadow-md hover:bg-brand-primary-dark transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-50 text-sm sm:text-base"
                disabled={isSaving}
              >
                {isSaving ? (
                  <LoadingSpinner size="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  "Salvar Perfil"
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleEditClick}
              className="px-5 py-2 sm:px-6 sm:py-3 bg-accent-red text-white font-semibold rounded-lg shadow-md hover:bg-accent-red-dark transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent-red focus:ring-opacity-50 text-sm sm:text-base"
            >
              Editar Perfil
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;