import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import JournalForm from "./JournalForm";
import AlertDialog from "../components/common/AlertDialog";
import LoadingSpinner from "../components/common/LoadingSpinner";

// Receba setCurrentPage como prop
const JournalPage = ({ setCurrentPage }) => {
  const { user, db, appId, geminiApiKey } = useAuth();
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showReminder, setShowReminder] = useState(false);
  const [alertState, setAlertState] = useState({
    message: "",
    type: "",
    onConfirm: null,
    onCancel: null,
    show: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [currentInsight, setCurrentInsight] = useState("");
  const [insightEntryId, setInsightEntryId] = useState(null);

  const showAlert = (message, type, onConfirm = null, onCancel = null) => {
    setAlertState({ message, type, onConfirm, onCancel, show: true });
  };

  const closeAlert = () => {
    setAlertState({ ...alertState, show: false });
  };

  useEffect(() => {
    if (db && user && appId) {
      // Garante que appId está disponível
      const userId = user.uid || "anonymous";
      const entriesCollectionRef = collection(
        db,
        `artifacts/${appId}/users/${userId}/journalEntries`
      );
      const q = query(entriesCollectionRef, orderBy("timestamp", "desc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedEntries = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setEntries(fetchedEntries);

          const today = new Date().toLocaleDateString("pt-BR");
          const hasEntryToday = fetchedEntries.some((entry) => {
            const entryDate = new Date(
              entry.timestamp?.toDate()
            ).toLocaleDateString("pt-BR");
            return entryDate === today;
          });

          if (!hasEntryToday) {
            setShowReminder(true);
          } else {
            setShowReminder(false);
          }
        },
        (error) => {
          console.error("Erro ao buscar entradas do diário:", error);
          showAlert("Erro ao carregar entradas do diário.", "error");
        }
      );

      return () => unsubscribe();
    }
  }, [db, user, appId]);

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    showAlert(
      "Tem certeza que deseja deletar esta entrada?",
      "confirm",
      async () => {
        closeAlert();
        setIsDeleting(true);
        if (db && user && appId) {
          // Garante que appId está disponível
          const userId = user.uid || "anonymous";
          const docRef = doc(
            db,
            `artifacts/${appId}/users/${userId}/journalEntries`,
            id
          );
          try {
            await deleteDoc(docRef);
            showAlert("Entrada deletada com sucesso!", "success");
          } catch (error) {
            console.error("Erro ao deletar entrada:", error);
            showAlert("Erro ao deletar entrada.", "error");
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

  const handleExportData = async () => {
    if (!db || !user || !appId) {
      // Garante que appId está disponível
      showAlert(
        "Usuário não autenticado, banco de dados não disponível ou appId ausente para exportação.",
        "error"
      );
      return;
    }

    const userId = user.uid || "anonymous";
    const entriesCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/journalEntries`
    );

    try {
      const querySnapshot = await getDocs(entriesCollectionRef);
      const dataToExport = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString(),
      }));

      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diario_web_data_${userId}_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showAlert("Dados exportados com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      showAlert("Erro ao exportar dados.", "error");
    }
  };

  const handleGenerateInsight = async (entry) => {
    setInsightLoading(true);
    setCurrentInsight("");
    setInsightEntryId(entry.id);

    if (!geminiApiKey) {
      // Garante que a chave da API Gemini está disponível
      showAlert("Erro: Chave da API Gemini não configurada.", "error");
      setInsightLoading(false);
      return;
    }

    try {
      const prompt = `Analise a seguinte entrada de diário e forneça um breve insight ou resumo sobre o estado emocional, desafios ou aprendizados. Seja conciso e direto.

      Check-in: ${entry.selectedCheckinEmotion} - ${entry.checkinDescription}
      Desafio: ${entry.challengeDescription}
      Sentimentos no desafio: ${entry.challengeFeelings}
      Reação: ${entry.challengeReaction}
      Análise da reação: ${entry.reactionAnalysis}
      Fatores da reação: ${entry.reactionFactors}
      Resultado da reação: ${entry.reactionOutcome}
      Valores: ${entry.selectedValues
        .map((v) => v.value + (v.example ? ` (${v.example})` : ""))
        .join(", ")}
      Visão de sucesso: ${entry.successVision}
      Metas: ${entry.successGoals
        .map(
          (g) => g.goal + (g.relatedValue ? ` (Valor: ${g.relatedValue})` : "")
        )
        .join(", ")}
      Compromisso: ${entry.commitmentAction} - ${entry.commitmentAffirmation}
      `;

      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (
        result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
      ) {
        const text = result.candidates[0].content.parts[0].text;
        setCurrentInsight(text);
      } else {
        showAlert(
          "Não foi possível gerar o insight para esta entrada. Tente novamente.",
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao chamar a API Gemini para insights:", error);
      showAlert(
        "Erro ao gerar insight. Verifique sua conexão ou tente mais tarde.",
        "error"
      );
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
      <h2 className="text-xl sm:text-2xl font-bold text-[#007B8A] mb-6">
        Meu Diário de Reflexão
      </h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6">
        {user && user.isAnonymous ? (
          <>
            Você está usando o diário como usuário anônimo. Seus dados serão
            armazenados apenas neste navegador. Para salvar permanentemente e
            acessar de qualquer lugar, por favor,{" "}
            <span
              className="font-semibold text-blue-600 cursor-pointer hover:underline" // Adicione hover:underline para indicar que é clicável
              onClick={() => setCurrentPage("authScreen")} // <--- CONECTADO!
            >
              faça login com sua conta Gmail
            </span>
            .
          </>
        ) : (
          <>
            Bem-vindo(a), {user?.displayName || user?.email || "Usuário"}! Seu
            ID de usuário é:{" "}
            <span className="font-mono text-xs sm:text-sm bg-gray-100 p-1 rounded">
              {user?.uid}
            </span>
          </>
        )}
      </p>

      {showReminder && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-6 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between animate-fade-in">
          <div className="mb-2 sm:mb-0">
            <p className="font-bold text-base sm:text-lg">Lembrete!</p>
            <p className="text-sm sm:text-base">
              Você ainda não fez sua entrada no diário hoje. Que tal registrar
              suas reflexões agora?
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingEntry(null);
              setShowReminder(false);
            }}
            className="ml-0 sm:ml-4 px-4 py-2 bg-[#FF9800] text-white rounded-lg shadow-md hover:bg-orange-600 transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:ring-opacity-50 text-sm sm:text-base w-full sm:w-auto"
          >
            Fazer Entrada
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8">
        <button
          onClick={() => {
            setShowForm(true);
            setEditingEntry(null);
          }}
          className="px-5 py-2 sm:px-6 sm:py-3 bg-[#007B8A] text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007B8A] focus:ring-opacity-50 text-sm sm:text-base w-full sm:w-auto"
        >
          <i className="fas fa-plus-circle mr-2"></i> Adicionar Nova Entrada
        </button>
        <button
          onClick={handleExportData}
          className="px-5 py-2 sm:px-6 sm:py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-sm sm:text-base w-full sm:w-auto"
        >
          <i className="fas fa-download mr-2"></i> Exportar Dados (JSON)
        </button>
      </div>

      {showForm && (
        <JournalForm
          onClose={() => setShowForm(false)}
          editingEntry={editingEntry}
          setEditingEntry={setEditingEntry}
          showAlert={showAlert}
        />
      )}

      <div className="mt-8 sm:mt-10">
        <h3 className="text-lg sm:text-xl font-bold text-[#007B8A] mb-4">
          Minhas Entradas Anteriores
        </h3>
        {entries.length === 0 ? (
          <p className="text-gray-500 text-sm sm:text-base">
            Nenhuma entrada de diário encontrada. Comece a adicionar suas
            reflexões!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-stone-50 p-4 sm:p-5 rounded-lg shadow-md border border-stone-200 transition-all duration-300 hover:shadow-xl"
              >
                <p className="text-xs sm:text-sm text-gray-500 mb-2">
                  {new Date(entry.timestamp?.toDate()).toLocaleDateString(
                    "pt-BR"
                  )}
                </p>
                <h4 className="font-semibold text-base sm:text-lg text-gray-800 mb-3">
                  {entry.selectedCheckinEmotion || "Entrada sem título"}
                </h4>
                <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                  {entry.checkinDescription ||
                    entry.challengeDescription ||
                    "Nenhuma descrição."}
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-auto">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="px-3 py-1 sm:px-4 sm:py-2 bg-gray-500 text-white text-xs sm:text-sm rounded-md hover:bg-gray-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="px-3 py-1 sm:px-4 sm:py-2 bg-red-500 text-white text-xs sm:text-sm rounded-md hover:bg-red-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <LoadingSpinner size="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      "Deletar"
                    )}
                  </button>
                  <button
                    onClick={() => handleGenerateInsight(entry)}
                    className="px-3 py-1 sm:px-4 sm:py-2 bg-[#FF9800] text-white text-xs sm:text-sm rounded-md hover:bg-orange-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:ring-opacity-50 flex items-center justify-center"
                    disabled={insightLoading && insightEntryId === entry.id}
                  >
                    {insightLoading && insightEntryId === entry.id ? (
                      <LoadingSpinner size="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      "Gerar Insight ✨"
                    )}
                  </button>
                </div>
                {insightLoading && insightEntryId === entry.id && (
                  <p className="text-gray-600 text-xs sm:text-sm mt-2 flex items-center">
                    <LoadingSpinner size="h-3 w-3" color="text-gray-600" />{" "}
                    Gerando insight...
                  </p>
                )}
                {currentInsight && insightEntryId === entry.id && (
                  <div className="bg-orange-100 p-3 rounded-md mt-3 text-sm sm:text-base">
                    <h5 className="font-semibold text-orange-800 mb-1">
                      Insight Gerado:
                    </h5>
                    <div
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{
                        __html: currentInsight.replace(/\n/g, "<br/>"),
                      }}
                    ></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {alertState.show && <AlertDialog {...alertState} onClose={closeAlert} />}
    </div>
  );
};

export default JournalPage;
