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

  // NOVO: Estado para data e hora em tempo real
  const [currentTime, setCurrentTime] = useState(new Date());
  // NOVO: Estado para a frase de motivação
  const [dailyMotivation, setDailyMotivation] = useState("Carregando sua motivação diária...");

  const showAlert = (message, type, onConfirm = null, onCancel = null) => {
    setAlertState({ message, type, onConfirm, onCancel, show: true });
  };

  const closeAlert = () => {
    setAlertState({ ...alertState, show: false });
  };

  // NOVO: Efeito para atualizar o relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // NOVO: Efeito para gerar a frase motivacional diária
  useEffect(() => {
    const fetchDailyMotivation = async () => {
      if (!geminiApiKey || !user || user.isAnonymous) {
        // Frase padrão ou convite para login se não houver API key ou usuário anônimo
        setDailyMotivation(
          user && user.isAnonymous
            ? "Faça login com Google para sua dose diária de motivação!"
            : "Bem-vindo ao Diário Web do Tutor!"
        );
        return;
      }

      const todayStr = new Date().toLocaleDateString("pt-BR");
      const lastGenerated = localStorage.getItem(`dailyMotivationDate_${user.uid}`);
      const storedPhrase = localStorage.getItem(`dailyMotivationPhrase_${user.uid}`);

      if (lastGenerated === todayStr && storedPhrase) {
        // Se já gerou hoje, usa a frase salva
        setDailyMotivation(storedPhrase);
        return;
      }

      setDailyMotivation("Gerando sua motivação do dia...");
      try {
        const prompt = `Gere uma única frase motivacional curta (máximo 15 palavras) para o dia de hoje, focando em autoconfiança, capacidade e superação de desafios para um usuário de um diário pessoal. Seja inspirador.`;
        const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        let generatedText = "Sua jornada diária começa com um passo de autoconfiança.";
        if (
          result.candidates &&
          result.candidates.length > 0 &&
          result.candidates[0].content &&
          result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0
        ) {
          generatedText = result.candidates[0].content.parts[0].text.trim();
        }

        setDailyMotivation(generatedText);
        localStorage.setItem(`dailyMotivationDate_${user.uid}`, todayStr);
        localStorage.setItem(`dailyMotivationPhrase_${user.uid}`, generatedText);

      } catch (error) {
        console.error("Erro ao gerar frase motivacional:", error);
        setDailyMotivation("Não foi possível gerar a frase. Acredite em seu potencial!");
      }
    };

    fetchDailyMotivation();
  }, [geminiApiKey, user]); // Refetch quando API key ou usuário muda

  useEffect(() => {
    if (db && user && appId) {
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

  // NOVO: Função para obter a saudação baseada na hora do dia
  const getGreeting = () => {
    const hours = currentTime.getHours();
    if (hours < 12) return "Bom dia";
    if (hours < 18) return "Boa tarde";
    return "Boa noite";
  };

  // NOVO: Avatar padrão (se o usuário não tiver photoURL)
  const defaultAvatar = "https://via.placeholder.com/150/0E2F59/FFFFFF?text=MR"; // Updated placeholder with new primary color

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 dark:bg-gray-800 dark:text-gray-primary transition-colors duration-300">
      <h2 className="text-xl sm:text-2xl font-bold text-brand-primary mb-6 dark:text-accent-green">
        Meu Diário de Reflexão
      </h2>

      {/* NOVO: Welcome Card - A Nova Apresentação */}
      <div className="bg-gradient-to-r from-brand-primary to-gray-dark rounded-xl shadow-xl p-6 sm:p-8 mb-8 text-white relative overflow-hidden transition-all duration-300">
        {/* Padrão sutil de fundo (opcional, requer SVG ou imagem) */}
        {/* <div className="absolute inset-0 bg-pattern opacity-10"></div> */}
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar do Usuário */}
          <div className="flex-shrink-0">
            <img
              src={user?.photoURL || defaultAvatar}
              alt={user?.displayName || "Usuário"}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg object-cover"
            />
          </div>

          {/* Mensagem de Boas-Vindas e Info */}
          <div className="text-center md:text-left flex-grow">
            {user && user.isAnonymous === false ? (
              <>
                <p className="text-sm font-light opacity-80 mb-1">
                  {getGreeting()},
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">
                  {user?.displayName || user?.email || "Usuário"}!
                </h3>
                <p className="text-sm opacity-80 mb-2">
                  {currentTime.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {" | "}
                  {currentTime.toLocaleTimeString("pt-BR")}
                </p>
                {/* Frase Motivacional */}
                {dailyMotivation && (
                  <p className="text-base font-medium mt-3 italic">
                    "{dailyMotivation}"
                  </p>
                )}
              </>
            ) : (
              // Conteúdo para Usuários Anônimos
              <>
                <p className="text-xl sm:text-2xl font-bold mb-2">
                  Olá, Visitante!
                </p>
                <p className="text-sm sm:text-base opacity-90 mb-4">
                  Você está usando o diário anonimamente. Para salvar
                  permanentemente e acessar de qualquer lugar, por favor,{" "}
                  <span
                    className="font-bold text-white cursor-pointer hover:underline"
                    onClick={() => setCurrentPage("authScreen")}
                  >
                    faça login com sua conta Gmail
                  </span>
                  .
                </p>
              </>
            )}
          </div>

          {/* Atalhos Rápidos (Quick Actions) para Usuários Logados */}
          {user && user.isAnonymous === false && (
            <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 md:self-end">
              <button
                onClick={() => setCurrentPage("dailyPlanning")}
                className="px-4 py-2 bg-white text-brand-primary rounded-lg shadow-md hover:bg-gray-100 transition duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              >
                Planejamento Diário
              </button>
              {showReminder && ( // Exibe o botão de "Fazer Entrada" aqui se for dia de lembrar
                <button
                  onClick={() => {
                    setShowForm(true);
                    setEditingEntry(null);
                    setShowReminder(false);
                  }}
                  className="px-4 py-2 bg-accent-red text-white rounded-lg shadow-md hover:bg-accent-red-dark transition duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-accent-red focus:ring-opacity-50"
                >
                  Fazer Entrada Hoje
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Fim do Welcome Card */}

      {/* A mensagem de Lembrete agora está integrada no Welcome Card para usuários logados.
          Para usuários anônimos, a CTA para login já serve. Removido o showReminder principal para anônimos. */}
      {user && user.isAnonymous === false && showReminder && !entries.some(entry => new Date(entry.timestamp?.toDate()).toLocaleDateString('pt-BR') === new Date().toLocaleDateString('pt-BR')) && (
        <div className="bg-orange-100 border-l-4 border-accent-red text-orange-700 p-4 mb-6 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between animate-fade-in dark:bg-orange-900 dark:bg-opacity-30 dark:text-orange-200">
          <div className="mb-2 sm:mb-0">
            <p className="font-bold text-base sm:text-lg">Atenção!</p>
            <p className="text-sm sm:text-base">
              Você ainda não fez sua entrada no diário hoje. Não se esqueça de
              registrar suas reflexões!
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8">
        <button
          onClick={() => {
            setShowForm(true);
            setEditingEntry(null);
          }}
          className="px-5 py-2 sm:px-6 sm:py-3 bg-brand-primary text-white font-semibold rounded-lg shadow-md hover:bg-brand-primary-dark transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-50 text-sm sm:text-base w-full sm:w-auto"
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
        <h3 className="text-lg sm:text-xl font-bold text-brand-primary mb-4 dark:text-accent-green">
          Minhas Entradas Anteriores
        </h3>
        {entries.length === 0 ? (
          <p className="text-gray-500 text-sm sm:text-base text-center py-10 rounded-md bg-background-light border border-background-light dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600">
            Nenhuma entrada de diário encontrada. Que tal{" "}
            <span
              className="font-semibold text-brand-primary cursor-pointer hover:underline dark:text-accent-green-light"
              onClick={() => {
                setShowForm(true);
                setEditingEntry(null);
              }}
            >
              adicionar sua primeira reflexão agora
            </span>
            ?
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-background-light p-4 sm:p-5 rounded-lg shadow-md border border-background-light transition-all duration-300 hover:shadow-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-primary"
              >
                <p className="text-xs sm:text-sm text-gray-500 mb-2 dark:text-gray-400">
                  {new Date(entry.timestamp?.toDate()).toLocaleDateString(
                    "pt-BR"
                  )}
                </p>
                <h4 className="font-semibold text-base sm:text-lg text-black-text mb-3 dark:text-gray-primary">
                  {entry.selectedCheckinEmotion || "Entrada sem título"}
                </h4>
                <p className="text-sm text-gray-700 line-clamp-3 mb-4 dark:text-gray-200">
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
                    className="px-3 py-1 sm:px-4 sm:py-2 bg-accent-red text-white text-xs sm:text-sm rounded-md hover:bg-accent-red-dark transition duration-200 focus:outline-none focus:ring-2 focus:ring-accent-red focus:ring-opacity-50 flex items-center justify-center"
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
                  <div className="bg-accent-green-light p-3 rounded-md mt-3 text-sm sm:text-base">
                    <h5 className="font-semibold text-orange-800 mb-1 dark:text-orange-200">
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