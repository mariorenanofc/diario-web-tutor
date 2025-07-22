import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore"; 
import { useAuth } from "../context/AuthContext";
import AlertDialog from "../components/common/AlertDialog";
import LoadingSpinner from "../components/common/LoadingSpinner";

// NOVO COMPONENTE: Modal de Visualização de Planejamento Diário
const ViewDailyPlanModal = ({ plan, onClose, onEdit, onDelete, showAlert, insightLoading, handleGenerateInsight }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative transform scale-100 opacity-100 transition-all duration-300 ease-out dark:bg-gray-800 dark:text-gray-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 dark:text-gray-400 dark:hover:text-gray-100"
        >
          &times;
        </button>
        <h3 className="text-xl sm:text-2xl font-bold text-[#007B8A] mb-4 dark:text-teal-400">
          Planejamento Diário: {new Date(plan.date).toLocaleDateString('pt-BR')}
        </h3>
        <p className="text-sm text-gray-600 mb-6 dark:text-gray-300">
          Detalhes do seu planejamento para este dia.
        </p>

        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <div className="bg-stone-50 p-3 rounded-md dark:bg-gray-700">
            <h5 className="font-semibold text-base text-gray-800 mb-1 dark:text-gray-100">Urgente e Importante:</h5>
            <p className="text-sm dark:text-gray-200">{plan.urgentImportant || 'Nenhum item'}</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-md dark:bg-gray-700">
            <h5 className="font-semibold text-base text-gray-800 mb-1 dark:text-gray-100">Não Urgente e Importante:</h5>
            <p className="text-sm dark:text-gray-200">{plan.notUrgentImportant || 'Nenhum item'}</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-md dark:bg-gray-700">
            <h5 className="font-semibold text-base text-gray-800 mb-1 dark:text-gray-100">Urgente e Não Importante:</h5>
            <p className="text-sm dark:text-gray-200">{plan.urgentNotImportant || 'Nenhum item'}</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-md dark:bg-gray-700">
            <h5 className="font-semibold text-base text-gray-800 mb-1 dark:text-gray-100">Não Urgente e Não Importante:</h5>
            <p className="text-sm dark:text-gray-200">{plan.notUrgentNotImportant || 'Nenhum item'}</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-md dark:bg-gray-700">
            <h5 className="font-semibold text-base text-gray-800 mb-1 dark:text-gray-100">Programação Diária:</h5>
            <ul className="list-disc list-inside text-sm dark:text-gray-200">
              {plan.dailySchedule?.filter(s => s).map((item, i) => <li key={i}>{item}</li>) || 'Nenhuma programação.'}
            </ul>
          </div>
          <div className="bg-stone-50 p-3 rounded-md dark:bg-gray-700">
            <h5 className="font-semibold text-base text-gray-800 mb-1 dark:text-gray-100">Anotações:</h5>
            <p className="text-sm dark:text-gray-200">{plan.notes || 'Nenhuma anotação.'}</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-md dark:bg-gray-700">
            <h5 className="font-semibold text-base text-gray-800 mb-1 dark:text-gray-100">Tarefas:</h5>
            <p className="text-sm dark:text-gray-200">{plan.tasks || 'Nenhuma tarefa.'}</p>
          </div>
        </div>

        {/* Botões de Ação no final do modal de visualização */}
        <div className="flex justify-end gap-3 sm:gap-4 mt-8 pt-4 border-t border-stone-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className="px-5 py-2 sm:px-6 sm:py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-sm sm:text-base dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            Fechar
          </button>
          <button
            onClick={() => { onEdit(plan); }} // Passa o plano para edição
            className="px-5 py-2 sm:px-6 sm:py-3 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-sm sm:text-base"
          >
            Editar Plano
          </button>
          <button
            onClick={() => { onDelete(plan.id, plan.date); }} // Passa o ID e a data para exclusão
            className="px-5 py-2 sm:px-6 sm:py-3 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm sm:text-base"
          >
            Deletar Plano
          </button>
        </div>
      </div>
    </div>
  );
};


// NOVO COMPONENTE: O Formulário de Planejamento (agora interno)
// Você pode mantê-lo aqui ou movê-lo para DailyPlanningForm.js
const DailyPlanningForm = ({ onClose, editingPlan, setEditingPlan, showAlert, user, db, appId }) => {
  const [planningData, setPlanningData] = useState(() => {
    return editingPlan ? editingPlan : {
      date: new Date().toISOString().slice(0, 10),
      urgentImportant: "",
      notUrgentImportant: "",
      urgentNotImportant: "",
      notUrgentNotImportant: "",
      dailySchedule: Array(9).fill(""),
      notes: "",
      tasks: "",
    };
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (editingPlan) {
      setPlanningData(editingPlan);
    } else {
      setPlanningData(prev => ({
        date: new Date().toISOString().slice(0, 10),
        urgentImportant: "",
        notUrgentImportant: "",
        urgentNotImportant: "",
        notUrgentNotImportant: "",
        dailySchedule: Array(9).fill(""),
        notes: "",
        tasks: "",
      }));
    }
  }, [editingPlan]);

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
    );

    try {
      await setDoc(dailyPlanDocRef, planningData, { merge: true });
      showAlert(`Plano diário para ${planningData.date} salvo com sucesso!`, "success");
      setTimeout(() => {
        onClose();
        setEditingPlan(null);
      }, 1500);
    } catch (error) {
      console.error("Erro ao salvar plano diário:", error);
      showAlert(`Erro ao salvar plano diário: ${error.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const timeSlots = Array.from({ length: 9 }, (_, i) => `${9 + i}:00`);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative transform scale-100 opacity-100 transition-all duration-300 ease-out dark:bg-gray-800 dark:text-gray-200">
        <button
          onClick={() => { onClose(); setEditingPlan(null); }}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 dark:text-gray-400 dark:hover:text-gray-100"
        >
          &times;
        </button>
        <h3 className="text-xl sm:text-2xl font-bold text-[#007B8A] mb-6 dark:text-teal-400">
          {editingPlan ? `Editar Planejamento: ${editingPlan.date}` : "Novo Planejamento Diário"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200 dark:bg-gray-700 dark:border-gray-600">
            <label htmlFor="planDate" className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300">Dia e Data:</label>
            <input
              type="date"
              id="planDate"
              name="date"
              value={planningData.date}
              onChange={handleChange}
              disabled={!!editingPlan}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
            />
          </div>

          <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200 dark:bg-gray-700 dark:border-gray-600">
            <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 dark:text-teal-400">Técnica da Matriz de Eisenhower</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 dark:text-gray-300">Prioridades do dia:</p>
            {formErrors.general && <p className="text-red-500 text-sm mb-4">{formErrors.general}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-300 rounded-md p-3 bg-white dark:bg-gray-600 dark:border-gray-500">
                <h5 className="font-medium text-base sm:text-lg text-gray-700 mb-2 dark:text-gray-100">1. Urgente e Importante</h5>
                <textarea
                  name="urgentImportant"
                  value={planningData.urgentImportant}
                  onChange={handleChange}
                  rows="4"
                  className="w-full p-2 border border-gray-200 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base dark:bg-gray-500 dark:border-gray-400 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="Faça agora (Crise, Prazos)"
                ></textarea>
              </div>
              <div className="border border-gray-300 rounded-md p-3 bg-white dark:bg-gray-600 dark:border-gray-500">
                <h5 className="font-medium text-base sm:text-lg text-gray-700 mb-2 dark:text-gray-100">2. Não Urgente e Importante</h5>
                <textarea
                  name="notUrgentImportant"
                  value={planningData.notUrgentImportant}
                  onChange={handleChange}
                  rows="4"
                  className="w-full p-2 border border-gray-200 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base dark:bg-gray-500 dark:border-gray-400 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="Decida quando fazer (Planejamento, Prevenção)"
                ></textarea>
              </div>
              <div className="border border-gray-300 rounded-md p-3 bg-white dark:bg-gray-600 dark:border-gray-500">
                <h5 className="font-medium text-base sm:text-lg text-gray-700 mb-2 dark:text-gray-100">3. Urgente e Não Importante</h5>
                <textarea
                  name="urgentNotImportant"
                  value={planningData.urgentNotImportant}
                  onChange={handleChange}
                  rows="4"
                  className="w-full p-2 border border-gray-200 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base dark:bg-gray-500 dark:border-gray-400 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="Delegue (Interrupções, Algumas reuniões)"
                ></textarea>
              </div>
              <div className="border border-gray-300 rounded-md p-3 bg-white dark:bg-gray-600 dark:border-gray-500">
                <h5 className="font-medium text-base sm:text-lg text-gray-700 mb-2 dark:text-gray-100">4. Não Urgente e Não Importante</h5>
                <textarea
                  name="notUrgentNotImportant"
                  value={planningData.notUrgentNotImportant}
                  onChange={handleChange}
                  rows="4"
                  className="w-full p-2 border border-gray-200 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base dark:bg-gray-500 dark:border-gray-400 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="Elimine (Distrações, Perda de tempo)"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200 dark:bg-gray-700 dark:border-gray-600">
            <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 dark:text-teal-400">
              Programação Diária (blocos de tempo)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {timeSlots.map((time, index) => (
                <div key={time} className="flex items-center gap-2">
                  <label className="text-sm sm:text-base font-medium text-gray-700 w-16 dark:text-gray-300">
                    {time}
                  </label>
                  <input
                    type="text"
                    value={planningData.dailySchedule[index]}
                    onChange={(e) => handleScheduleChange(index, e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 dark:placeholder-gray-400"
                    placeholder="Atividade"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200 dark:bg-gray-700 dark:border-gray-600">
              <label
                htmlFor="notes"
                className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300"
              >
                Anotações:
              </label>
              <textarea
                id="notes"
                name="notes"
                value={planningData.notes}
                onChange={handleChange}
                rows="4"
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 dark:placeholder-gray-400"
              ></textarea>
            </div>
            <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200 dark:bg-gray-700 dark:border-gray-600">
              <label
                htmlFor="tasks"
                className="block text-sm sm:text-base font-medium text-gray-700 mb-1 dark:text-gray-300"
              >
                Tarefas (Não esquecer):
              </label>
              <textarea
                id="tasks"
                name="tasks"
                value={planningData.tasks}
                onChange={handleChange}
                rows="4"
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] text-sm sm:text-base dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 dark:placeholder-gray-400"
              ></textarea>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={() => { onClose(); setEditingPlan(null); }}
              className="px-5 py-2 sm:px-6 sm:py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-sm sm:text-base dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
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
              ) : editingPlan ? (
                "Atualizar Plano Diário"
              ) : (
                "Salvar Plano Diário"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const DailyPlanningPage = () => {
  const { user, db, appId, geminiApiKey } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [alertState, setAlertState] = useState({ message: '', type: '', onConfirm: null, onCancel: null, show: false });
  const [isDeleting, setIsDeleting] = useState(false);
  const [insightLoading, setInsightLoading] = useState(null);
  const [currentInsight, setCurrentInsight] = useState('');
  const [insightPlanDate, setInsightPlanDate] = useState(null);
  // NOVO: Estado para controlar a visualização do modal de detalhes
  const [showingDetails, setShowingDetails] = useState(null); 

  const showAlert = (message, type, onConfirm = null, onCancel = null) => {
    setAlertState({ message, type, onConfirm, onCancel, show: true });
  };

  const closeAlert = () => {
    setAlertState({ ...alertState, show: false });
  };

  // Efeito para carregar os planejamentos
  useEffect(() => {
    if (db && user && appId) {
      const userId = user.uid || "anonymous";
      const plansCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/dailyPlans`);
      const q = query(plansCollectionRef, orderBy('date', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedPlans = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPlans(fetchedPlans);
        setLoading(false);
      }, (error) => {
        console.error("Erro ao buscar planejamentos diários:", error);
        showAlert("Erro ao carregar planejamentos diários.", "error");
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [db, user, appId]);

  // Função para abrir o modal de edição
  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setShowForm(true);
    setShowingDetails(null); // Fecha o modal de detalhes se estiver aberto
  };

  // Função para abrir o modal de visualização
  const handleViewDetails = (plan) => {
    setShowingDetails(plan);
  };

  // Função para deletar um plano
  const handleDelete = (planId, planDate) => {
    showAlert(
      `Tem certeza que deseja deletar o planejamento de ${planDate}?`,
      "confirm",
      async () => {
        closeAlert();
        setIsDeleting(true);
        if (db && user && appId) {
          const userId = user.uid || "anonymous";
          const docRef = doc(db, `artifacts/${appId}/users/${userId}/dailyPlans`, planId);
          try {
            await deleteDoc(docRef);
            showAlert("Planejamento deletado com sucesso!", "success");
            setShowingDetails(null); // Fecha o modal de detalhes após deletar
          } catch (error) {
            console.error("Erro ao deletar planejamento:", error);
            showAlert("Erro ao deletar planejamento.", "error");
          } finally {
            setIsDeleting(false);
          }
        }
      },
      () => {
        closeAlert();
      }
    );
  };

  const handleGenerateInsight = async (plan) => {
    setInsightLoading(plan.id); // Define o loading para o card específico
    setCurrentInsight('');
    setInsightPlanDate(plan.date);

    if (!geminiApiKey) {
      showAlert("Erro: Chave da API Gemini não configurada.", "error");
      setInsightLoading(null);
      return;
    }

    try {
      const prompt = `Analise o seguinte planejamento diário e gere um insight conciso (máximo 3 frases) sobre como o usuário pode ter se saído, o que priorizou, ou um conselho rápido para o próximo dia baseado neste plano. Foco em autoconfiança e capacidade.

      Planejamento do dia ${plan.date}:
      Urgente e Importante: ${plan.urgentImportant}
      Não Urgente e Importante: ${plan.notUrgentImportant}
      Urgente e Não Importante: ${plan.urgentNotImportant}
      Não Urgente e Não Importante: ${plan.notUrgentNotImportant}
      Programação: ${plan.dailySchedule.filter(s => s).join(', ')}
      Anotações: ${plan.notes}
      Tarefas: ${plan.tasks}
      `;

      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      let generatedText = "Não foi possível gerar o insight para este plano. Continue firme!";
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        generatedText = result.candidates[0].content.parts[0].text.trim();
      }
      showAlert(`Insight para ${plan.date}: ${generatedText}`, "info");

    } catch (error) {
      console.error("Erro ao gerar insight do plano:", error);
      showAlert("Erro ao gerar insight do plano. Tente novamente mais tarde.", "error");
    } finally {
      setInsightLoading(null);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)] bg-stone-100 dark:bg-gray-900 transition-colors duration-300">
        <LoadingSpinner size="h-10 w-10" color="text-teal-600" />
        <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 ml-4">Carregando planejamentos...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 dark:bg-gray-800 dark:text-gray-200 transition-colors duration-300">
      <h2 className="text-xl sm:text-2xl font-bold text-[#007B8A] mb-6 dark:text-teal-400">Meus Planejamentos Diários</h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6 dark:text-gray-300">
        Visualize seus planejamentos e como você se organizou em cada dia.
      </p>

      {/* Botão para Adicionar Novo Planejamento */}
      <div className="flex justify-start mb-8">
        <button
          onClick={() => { setShowForm(true); setEditingPlan(null); }}
          className="px-5 py-2 sm:px-6 sm:py-3 bg-[#007B8A] text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007B8A] focus:ring-opacity-50 text-sm sm:text-base"
        >
          <i className="fas fa-plus-circle mr-2"></i> Adicionar Novo Planejamento
        </button>
      </div>

      {/* Modal do Formulário de Planejamento */}
      {showForm && (
        <DailyPlanningForm
          onClose={() => setShowForm(false)}
          editingPlan={editingPlan}
          setEditingPlan={setEditingPlan}
          showAlert={showAlert}
          user={user}
          db={db}
          appId={appId}
        />
      )}

      {/* NOVO: Modal de Visualização de Detalhes do Plano */}
      {showingDetails && (
        <ViewDailyPlanModal
          plan={showingDetails}
          onClose={() => setShowingDetails(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showAlert={showAlert}
          insightLoading={insightLoading}
          handleGenerateInsight={handleGenerateInsight}
        />
      )}

      {/* Lista de Cards de Planejamento */}
      <div className="mt-8 sm:mt-10">
        <h3 className="text-lg sm:text-xl font-bold text-[#007B8A] mb-4 dark:text-teal-400">Histórico de Planejamentos</h3>
        {plans.length === 0 ? (
          <p className="text-gray-500 text-sm sm:text-base text-center py-10 rounded-md bg-stone-50 border border-stone-200 dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600">
            Nenhum planejamento diário encontrado. Que tal{" "}
            <span
              className="font-semibold text-[#007B8A] cursor-pointer hover:underline dark:text-teal-300"
              onClick={() => { setShowForm(true); setEditingPlan(null); }}
            >
              adicionar seu primeiro planejamento
            </span>
            ?
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-stone-50 p-4 sm:p-5 rounded-lg shadow-md border border-stone-200 transition-all duration-300 hover:shadow-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <p className="text-xs sm:text-sm text-gray-500 mb-2 dark:text-gray-400">
                  Data: {new Date(plan.date).toLocaleDateString('pt-BR')}
                </p>
                <h4 className="font-semibold text-base sm:text-lg text-gray-800 mb-3 dark:text-gray-100">
                  {plan.urgentImportant ? `Prioridade: ${plan.urgentImportant}` : 'Planejamento do Dia'}
                </h4>
                <p className="text-sm text-gray-700 line-clamp-3 mb-4 dark:text-gray-200">
                  {plan.tasks || plan.notes || 'Nenhuma tarefa ou anotação detalhada.'}
                </p>

                {/* Exibe o Insight gerado ou o Loading Spinner */}
                {insightLoading === plan.id ? (
                    <p className="text-gray-600 text-xs sm:text-sm mt-2 flex items-center dark:text-gray-300">
                        <LoadingSpinner size="h-3 w-3" color="text-gray-600" /> Gerando insight...
                    </p>
                ) : (
                    currentInsight && insightPlanDate === plan.date ? (
                        <div className="bg-orange-100 p-3 rounded-md mt-3 text-sm sm:text-base dark:bg-orange-900 dark:text-orange-100">
                            <h5 className="font-semibold text-orange-800 mb-1 dark:text-orange-200">Insight do Dia:</h5>
                            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-100" dangerouslySetInnerHTML={{ __html: currentInsight.replace(/\n/g, '<br/>') }}></div>
                        </div>
                    ) : null // Não mostra insight se não for para este card ou se o insight não for para esta data
                )}

                <div className="flex flex-wrap gap-2 sm:gap-3 mt-auto pt-4 border-t border-stone-200 dark:border-gray-600">
                  <button
                    onClick={() => handleViewDetails(plan)} // NOVO: Botão Visualizar
                    className="px-3 py-1 sm:px-4 sm:py-2 bg-blue-500 text-white text-xs sm:text-sm rounded-md hover:bg-blue-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  >
                    Visualizar
                  </button>
                  <button
                    onClick={() => handleGenerateInsight(plan)}
                    className="px-3 py-1 sm:px-4 sm:py-2 bg-[#FF9800] text-white text-xs sm:text-sm rounded-md hover:bg-orange-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:ring-opacity-50 flex items-center justify-center"
                    disabled={insightLoading === plan.id}
                  >
                    {insightLoading === plan.id ? (
                      <LoadingSpinner size="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      'Gerar Insight ✨'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {alertState.show && <AlertDialog {...alertState} onClose={closeAlert} />}
    </div>
  );
};

export default DailyPlanningPage;