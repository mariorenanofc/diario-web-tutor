import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import AlertDialog from "../components/common/AlertDialog";
import LoadingSpinner from "../components/common/LoadingSpinner";

const ProfilePage = () => {
  const { user, db, appId } = useAuth(); // <--- OBTÉM appId DO CONTEXTO
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)] bg-stone-100">
        <div className="text-lg font-semibold text-gray-700">
          Carregando perfil...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
      <h2 className="text-xl sm:text-2xl font-bold text-[#007B8A] mb-6">
        Meu Perfil
      </h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6">
        Aqui você pode visualizar e editar suas informações pessoais,
        inspirações e detalhes de formação.
      </p>

      {alertState.show && <AlertDialog {...alertState} onClose={closeAlert} />}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
              Nome:
            </label>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleChange}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base"
                disabled={user?.displayName ? true : false}
              />
            ) : (
              <p className="p-2 sm:p-3 bg-stone-100 rounded-md text-sm sm:text-base text-gray-800">
                {profileData.name || "Não informado"}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
              E-mail:
            </label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleChange}
                className={`w-full p-2 sm:p-3 border rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base ${
                  formErrors.email ? "border-red-500" : "border-gray-300"
                }`}
                disabled={user?.email ? true : false}
              />
            ) : (
              <p className="p-2 sm:p-3 bg-stone-100 rounded-md text-sm sm:text-base text-gray-800">
                {profileData.email || "Não informado"}
              </p>
            )}
            {formErrors.email && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">
                {formErrors.email}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
              Data de Nascimento:
            </label>
            {isEditing ? (
              <input
                type="date"
                name="birthDate"
                value={profileData.birthDate}
                onChange={handleChange}
                className={`w-full p-2 sm:p-3 border rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base ${
                  formErrors.birthDate ? "border-red-500" : "border-gray-300"
                }`}
              />
            ) : (
              <p className="p-2 sm:p-3 bg-stone-100 rounded-md text-sm sm:text-base text-gray-800">
                {profileData.birthDate || "Não informado"}
              </p>
            )}
            {formErrors.birthDate && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">
                {formErrors.birthDate}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
              Telefone:
            </label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={profileData.phone}
                onChange={handleChange}
                className={`w-full p-2 sm:p-3 border rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base ${
                  formErrors.phone ? "border-red-500" : "border-gray-300"
                }`}
              />
            ) : (
              <p className="p-2 sm:p-3 bg-stone-100 rounded-md text-sm sm:text-base text-gray-800">
                {profileData.phone || "Não informado"}
              </p>
            )}
            {formErrors.phone && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">
                {formErrors.phone}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
              Cidade/Estado:
            </label>
            {isEditing ? (
              <input
                type="text"
                name="cityState"
                value={profileData.cityState}
                onChange={handleChange}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base"
              />
            ) : (
              <p className="p-2 sm:p-3 bg-stone-100 rounded-md text-sm sm:text-base text-gray-800">
                {profileData.cityState || "Não informado"}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
              Formação:
            </label>
            {isEditing ? (
              <input
                type="text"
                name="education"
                value={profileData.education}
                onChange={handleChange}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base"
              />
            ) : (
              <p className="p-2 sm:p-3 bg-stone-100 rounded-md text-sm sm:text-base text-gray-800">
                {profileData.education || "Não informado"}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
            O que te define?
          </label>
          {isEditing ? (
            <textarea
              name="whatDefinesYou"
              value={profileData.whatDefinesYou}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base"
            ></textarea>
          ) : (
            <p className="p-2 sm:p-3 bg-stone-100 rounded-md text-sm sm:text-base text-gray-800 whitespace-pre-wrap">
              {profileData.whatDefinesYou || "Não informado"}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
            Inspirações para o futuro:
          </label>
          {isEditing ? (
            <textarea
              name="futureInspirations"
              value={profileData.futureInspirations}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base"
            ></textarea>
          ) : (
            <p className="p-2 sm:p-3 bg-stone-100 rounded-md text-sm sm:text-base text-gray-800 whitespace-pre-wrap">
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
                className="px-5 py-2 sm:px-6 sm:py-3 bg-[#007B8A] text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007B8A] focus:ring-opacity-50 text-sm sm:text-base"
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
              className="px-5 py-2 sm:px-6 sm:py-3 bg-[#FF9800] text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:ring-opacity-50 text-sm sm:text-base"
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
