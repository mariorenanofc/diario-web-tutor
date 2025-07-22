import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import AlertDialog from "../components/common/AlertDialog";
import LoadingSpinner from "../components/common/LoadingSpinner";

const DailyPlanningPage = () => {
  const { user, db, appId } = useAuth();
  const [planningData, setPlanningData] = useState({
    date: new Date().toISOString().slice(0, 10),
    urgentImportant: "",
    notUrgentImportant: "",
    urgentNotImportant: "",
    notUrgentNotImportant: "",
    dailySchedule: Array(9).fill(""),
    notes: "",
    tasks: "",
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
    const fetchDailyPlan = async () => {
      if (db && user && appId) {
        // Garante que appId está disponível
        const userId = user.uid || "anonymous";
        const docId = planningData.date.replace(/-/g, "");
        const dailyPlanDocRef = doc(
          db,
          `artifacts/${appId}/users/${userId}/dailyPlans`,
          docId
        ); // <--- USA appId AQUI
        try {
          const docSnap = await getDoc(dailyPlanDocRef);
          if (docSnap.exists()) {
            setPlanningData(docSnap.data());
          } else {
            setPlanningData((prev) => ({
              ...prev,
              urgentImportant: "",
              notUrgentImportant: "",
              urgentNotImportant: "",
              notUrgentNotImportant: "",
              dailySchedule: Array(9).fill(""),
              notes: "",
              tasks: "",
            }));
          }
        } catch (error) {
          console.error("Erro ao carregar plano diário:", error);
          showAlert("Erro ao carregar plano diário.", "error");
        } finally {
          setLoading(false);
        }
      }
    };

    if (user && db) {
      // Chama o fetch apenas se user e db estiverem prontos
      fetchDailyPlan();
    }
  }, [user, db, planningData.date, appId]); // Adiciona appId às dependências do useEffect

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPlanningData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleScheduleChange = (index, value) => {
    const newSchedule = [...planningData.dailySchedule];
    newSchedule[index] = value;
    setPlanningData((prev) => ({ ...prev, dailySchedule: newSchedule }));
  };

  const validateForm = () => {
    const errors = {};
    if (
      !planningData.urgentImportant.trim() &&
      !planningData.notUrgentImportant.trim() &&
      !planningData.urgentNotImportant.trim() &&
      !planningData.notUrgentNotImportant.trim() &&
      planningData.dailySchedule.every((slot) => !slot.trim()) &&
      !planningData.notes.trim() &&
      !planningData.tasks.trim()
    ) {
      errors.general =
        "Preencha pelo menos um campo para salvar o plano diário.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showAlert(
        "Por favor, preencha pelo menos um campo para salvar o plano diário.",
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
    const docId = planningData.date.replace(/-/g, "");
    const dailyPlanDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/dailyPlans`,
      docId
    ); // <--- USA appId AQUI

    try {
      await setDoc(dailyPlanDocRef, planningData, { merge: true });
      showAlert("Plano diário salvo com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar plano diário:", error);
      showAlert(`Erro ao salvar plano diário: ${error.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const timeSlots = Array.from({ length: 9 }, (_, i) => `${9 + i}:00`);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)] bg-stone-100">
        <div className="text-lg font-semibold text-gray-700">
          Carregando planejamento diário...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
      <h2 className="text-xl sm:text-2xl font-bold text-[#007B8A] mb-6">
        Planejamento Diário
      </h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6">
        Organize suas tarefas e prioridades do dia.
      </p>

      {alertState.show && <AlertDialog {...alertState} onClose={closeAlert} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200">
          <label
            htmlFor="planDate"
            className="block text-sm sm:text-base font-medium text-gray-700 mb-1"
          >
            Dia e Data:
          </label>
          <input
            type="date"
            id="planDate"
            name="date"
            value={planningData.date}
            onChange={handleChange}
            className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base"
          />
        </div>

        <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200">
          <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3">
            Técnica da Matriz de Eisenhower
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Prioridades do dia:
          </p>
          {formErrors.general && (
            <p className="text-red-500 text-sm mb-4">{formErrors.general}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-gray-300 rounded-md p-3 bg-white">
              <h5 className="font-medium text-base sm:text-lg text-gray-700 mb-2">
                1. Urgente e Importante
              </h5>
              <textarea
                name="urgentImportant"
                value={planningData.urgentImportant}
                onChange={handleChange}
                rows="4"
                className="w-full p-2 border border-gray-200 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base"
                placeholder="Faça agora (Crise, Prazos)"
              ></textarea>
            </div>
            <div className="border border-gray-300 rounded-md p-3 bg-white">
              <h5 className="font-medium text-base sm:text-lg text-gray-700 mb-2">
                2. Não Urgente e Importante
              </h5>
              <textarea
                name="notUrgentImportant"
                value={planningData.notUrgentImportant}
                onChange={handleChange}
                rows="4"
                className="w-full p-2 border border-gray-200 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base"
                placeholder="Decida quando fazer (Planejamento, Prevenção)"
              ></textarea>
            </div>
            <div className="border border-gray-300 rounded-md p-3 bg-white">
              <h5 className="font-medium text-base sm:text-lg text-gray-700 mb-2">
                3. Urgente e Não Importante
              </h5>
              <textarea
                name="urgentNotImportant"
                value={planningData.urgentNotImportant}
                onChange={handleChange}
                rows="4"
                className="w-full p-2 border border-gray-200 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base"
                placeholder="Delegue (Interrupções, Algumas reuniões)"
              ></textarea>
            </div>
            <div className="border border-gray-300 rounded-md p-3 bg-white">
              <h5 className="font-medium text-base sm:text-lg text-gray-700 mb-2">
                4. Não Urgente e Não Importante
              </h5>
              <textarea
                name="notUrgentNotImportant"
                value={planningData.notUrgentNotImportant}
                onChange={handleChange}
                rows="4"
                className="w-full p-2 border border-gray-200 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base"
                placeholder="Elimine (Distrações, Perda de tempo)"
              ></textarea>
            </div>
          </div>
        </div>

        <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200">
          <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3">
            Programação Diária (blocos de tempo)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {timeSlots.map((time, index) => (
              <div key={time} className="flex items-center gap-2">
                <label className="text-sm sm:text-base font-medium text-gray-700 w-16">
                  {time}
                </label>
                <input
                  type="text"
                  value={planningData.dailySchedule[index]}
                  onChange={(e) => handleScheduleChange(index, e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base"
                  placeholder="Atividade"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200">
            <label
              htmlFor="notes"
              className="block text-sm sm:text-base font-medium text-gray-700 mb-1"
            >
              Anotações:
            </label>
            <textarea
              id="notes"
              name="notes"
              value={planningData.notes}
              onChange={handleChange}
              rows="4"
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base"
            ></textarea>
          </div>
          <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200">
            <label
              htmlFor="tasks"
              className="block text-sm sm:text-base font-medium text-gray-700 mb-1"
            >
              Tarefas (Não esquecer):
            </label>
            <textarea
              id="tasks"
              name="tasks"
              value={planningData.tasks}
              onChange={handleChange}
              rows="4"
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base"
            ></textarea>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            className="px-5 py-2 sm:px-6 sm:py-3 bg-[#007B8A] text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007B8A] focus:ring-opacity-50 text-sm sm:text-base"
            disabled={isSaving}
          >
            {isSaving ? (
              <LoadingSpinner size="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              "Salvar Plano Diário"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DailyPlanningPage;
