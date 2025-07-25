import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import AlertDialog from "../components/common/AlertDialog";
import LoadingSpinner from "../components/common/LoadingSpinner";


const MicroCareersCanvasPage = () => {
  const { user, db, appId } = useAuth(); // <--- OBTÉM appId DO CONTEXTO
  const [canvasData, setCanvasData] = useState({
    possibleAreas: "",
    developedSkills: "",
    skillsToDevelop: "",
    actionPlan: "",
    visionOfSuccess: "",
  });
  const [alertState, setAlertState] = useState({
    message: "",
    type: "",
    onConfirm: null,
    onCancel: null,
    show: false,
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const showAlert = (message, type, onConfirm = null, onCancel = null) => {
    setAlertState({ message, type, onConfirm, onCancel, show: true });
  };

  const closeAlert = () => {
    setAlertState({ ...alertState, show: false });
  };

  useEffect(() => {
    const fetchCanvasData = async () => {
      if (db && user && appId) {
        // Garante que appId está disponível
        const userId = user.uid || "anonymous";
        const canvasDocRef = doc(
          db,
          `artifacts/${appId}/users/${userId}/microCareersCanvas`,
          "userCanvas"
        ); // <--- USA appId AQUI
        try {
          const docSnap = await getDoc(canvasDocRef);
          if (docSnap.exists()) {
            setCanvasData(docSnap.data());
          }
        } catch (error) {
          console.error("Erro ao carregar Canvas de Microcarreiras:", error);
          showAlert("Erro ao carregar Canvas de Microcarreiras.", "error");
        } finally {
          setLoading(false);
        }
      }
    };

    if (user && db) {
      // Chama o fetch apenas se user e db estiverem prontos
      fetchCanvasData();
    }
  }, [user, db, appId]); // Adiciona appId às dependências do useEffect

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCanvasData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (
      !canvasData.possibleAreas.trim() &&
      !canvasData.developedSkills.trim() &&
      !canvasData.skillsToDevelop.trim() &&
      !canvasData.actionPlan.trim() &&
      !canvasData.visionOfSuccess.trim()
    ) {
      errors.general =
        "Preencha pelo menos um campo para salvar o Canvas de Microcarreiras.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showAlert(
        "Por favor, preencha pelo menos um campo para salvar o Canvas.",
        "error"
      );
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
    const canvasDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/microCareersCanvas`,
      "userCanvas"
    ); // <--- USA appId AQUI

    try {
      await setDoc(canvasDocRef, canvasData, { merge: true });
      showAlert("Canvas de Microcarreiras salvo com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar Canvas de Microcarreiras:", error);
      showAlert(
        `Erro ao salvar Canvas de Microcarreiras: ${error.message}`,
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)] bg-background-light">
        <div className="text-lg font-semibold text-gray-700">
          Carregando Canvas de Microcarreiras...
        </div>
      </div>
    );
  }

   return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 dark:bg-gray-800 dark:text-gray-primary transition-colors duration-300">
      <h2 className="text-xl sm:text-2xl font-bold text-brand-primary mb-6 dark:text-accent-green">Meu Canvas de Microcarreiras</h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6 dark:text-gray-300">
        Destaque sua inovação e planeje seu desenvolvimento de carreira.
      </p>

      {alertState.show && <AlertDialog {...alertState} onClose={closeAlert} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {formErrors.general && <p className="text-accent-red text-sm mb-4">{formErrors.general}</p>}

        <div className="bg-background-light p-4 sm:p-5 rounded-lg border border-background-light dark:bg-gray-700 dark:border-gray-600">
          <label htmlFor="possibleAreas" className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">Áreas de atuação possíveis:</label>
          <textarea
            id="possibleAreas"
            name="possibleAreas"
            value={canvasData.possibleAreas}
            onChange={handleChange}
            rows="3"
            className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm sm:text-base dark:bg-gray-600 dark:border-gray-500 dark:text-gray-primary"
            placeholder="Liste as áreas de atuação possíveis para você."
          ></textarea>
        </div>

        <div className="bg-background-light p-4 sm:p-5 rounded-lg border border-background-light dark:bg-gray-700 dark:border-gray-600">
          <label htmlFor="developedSkills" className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">Habilidades já desenvolvidas:</label>
          <textarea
            id="developedSkills"
            name="developedSkills"
            value={canvasData.developedSkills}
            onChange={handleChange}
            rows="3"
            className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm sm:text-base dark:bg-gray-600 dark:border-gray-500 dark:text-gray-primary"
            placeholder="Liste as habilidades que você já desenvolveu e utiliza na prática."
          ></textarea>
        </div>

        <div className="bg-background-light p-4 sm:p-5 rounded-lg border border-background-light dark:bg-gray-700 dark:border-gray-600">
          <label htmlFor="skillsToDevelop" className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">Habilidades a desenvolver:</label>
          <textarea
            id="skillsToDevelop"
            name="skillsToDevelop"
            value={canvasData.skillsToDevelop}
            onChange={handleChange}
            rows="3"
            className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm sm:text-base dark:bg-gray-600 dark:border-gray-500 dark:text-gray-primary"
            placeholder="Que habilidades serão necessárias para o seu momento atual e futuro?"
          ></textarea>
        </div>

        <div className="bg-background-light p-4 sm:p-5 rounded-lg border border-background-light dark:bg-gray-700 dark:border-gray-600">
          <label htmlFor="actionPlan" className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">Plano de Ação:</label>
          <textarea
            id="actionPlan"
            name="actionPlan"
            value={canvasData.actionPlan}
            onChange={handleChange}
            rows="4"
            className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm sm:text-base dark:bg-gray-600 dark:border-gray-500 dark:text-gray-primary"
            placeholder="Inclua passos práticos para alcançar e desenvolver as habilidades necessárias ao futuro."
          ></textarea>
        </div>

        <div className="bg-background-light p-4 sm:p-5 rounded-lg border border-background-light dark:bg-gray-700 dark:border-gray-600">
          <label htmlFor="visionOfSuccess" className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">Minha visão de sucesso:</label>
          <textarea
            id="visionOfSuccess"
            name="visionOfSuccess"
            value={canvasData.visionOfSuccess}
            onChange={handleChange}
            rows="4"
            className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm sm:text-base dark:bg-gray-600 dark:border-gray-500 dark:text-gray-primary"
            placeholder="Descreva aqui o que é sucesso para você."
          ></textarea>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            className="px-5 py-2 sm:px-6 sm:py-3 bg-brand-primary text-white font-semibold rounded-lg shadow-md hover:bg-brand-primary-dark transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-50 text-sm sm:text-base"
            disabled={isSaving}
          >
            {isSaving ? (
              <LoadingSpinner size="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              'Salvar Canvas'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MicroCareersCanvasPage;