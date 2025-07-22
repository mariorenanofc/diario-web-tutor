import React, { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"; // REMOVIDO: doc, getDocs
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import getSentimentScore from "../utils/sentimentAnalysis";
import LoadingSpinner from "../components/common/LoadingSpinner";
import AlertDialog from "../components/common/AlertDialog";

const DashboardPage = ({ setCurrentPage }) => {
  const { user, db, appId, geminiApiKey } = useAuth();
  const [entries, setEntries] = useState([]);
  const [dailyPlans, setDailyPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertState, setAlertState] = useState({ message: '', type: '', onConfirm: null, onCancel: null, show: false });
  const [insightLoading, setInsightLoading] = useState(null);

  const showAlert = (message, type, onConfirm = null, onCancel = null) => {
    setAlertState({ message, type, onConfirm, onCancel, show: true });
  };

  const closeAlert = () => {
    setAlertState({ ...alertState, show: false });
  };

  useEffect(() => {
    if (db && user && appId) {
      const userId = user.uid || "anonymous";
      // Fetch Journal Entries
      const entriesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/journalEntries`);
      const qEntries = query(entriesCollectionRef, orderBy("timestamp", "asc"));

      const unsubscribeEntries = onSnapshot(qEntries, (snapshot) => {
        const fetchedEntries = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEntries(fetchedEntries);
      }, (error) => {
        console.error("Erro ao buscar entradas para o dashboard:", error);
        showAlert("Erro ao carregar dados do diário.", "error");
      });

      // Fetch Daily Plans
      const plansCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/dailyPlans`);
      const qPlans = query(plansCollectionRef, orderBy('date', 'desc'));

      const unsubscribePlans = onSnapshot(qPlans, (snapshot) => {
        const fetchedPlans = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDailyPlans(fetchedPlans);
        setLoading(false);
      }, (error) => {
        console.error("Erro ao buscar planejamentos diários para o dashboard:", error);
        showAlert("Erro ao carregar dados de planejamento.", "error");
        setLoading(false);
      });

      return () => {
        unsubscribeEntries();
        unsubscribePlans();
      };
    }
  }, [db, user, appId]);

  const analyzedData = useMemo(() => {
    if (entries.length === 0 && dailyPlans.length === 0) {
      return {
        totalEntries: 0, // Mantido para ser exibido
        sentimentTrend: [],
        commonValuesData: [],
        lastPlan: null,
        averageSentimentScore: "N/A",
      };
    }

    const totalEntriesCount = entries.length; // NOVO: Nome de variável alterado para evitar conflito com 'totalEntries' no JSX

    const sentimentByDate = {};
    entries.forEach((entry) => {
      const date = new Date(entry.timestamp?.toDate()).toLocaleDateString("pt-BR");
      const score = getSentimentScore(entry.selectedCheckinEmotion, entry.checkinDescription);
      if (!sentimentByDate[date]) {
        sentimentByDate[date] = { totalScore: 0, count: 0 };
      }
      sentimentByDate[date].totalScore += score;
      sentimentByDate[date].count += 1;
    });

    const sentimentTrend = Object.keys(sentimentByDate)
      .map((date) => ({
        date,
        sentiment: sentimentByDate[date].totalScore / sentimentByDate[date].count,
      }))
      .sort(
        (a, b) =>
          new Date(a.date.split("/").reverse().join("-")) -
          new Date(b.date.split("/").reverse().join("-"))
      );

    const averageSentiment = sentimentTrend.length > 0
      ? (sentimentTrend.reduce((sum, item) => sum + item.sentiment, 0) / sentimentTrend.length).toFixed(2)
      : "N/A";

    const allValues = entries
      .flatMap(
        (entry) =>
          entry.selectedValues?.map((v) => v.value.toLowerCase().trim()) || []
      )
      .filter((v) => v !== "");
    const valueCounts = allValues.reduce((acc, value) => {
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
    const commonValuesData = Object.entries(valueCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([value, count]) => ({
        name: value.charAt(0).toUpperCase() + value.slice(1),
        count,
      }));

    const lastPlan = dailyPlans.length > 0 ? dailyPlans[0] : null;

    return {
      totalEntries: totalEntriesCount, // Retorna o valor correto
      sentimentTrend,
      commonValuesData,
      lastPlan,
      averageSentimentScore: averageSentiment,
    };
  }, [entries, dailyPlans]);

  const {
    totalEntries, // Agora usado no JSX
    sentimentTrend,
    commonValuesData,
    lastPlan,
    averageSentimentScore,
  } = analyzedData;

  const handleGeneratePlanInsight = async (plan) => {
    setInsightLoading(plan.id);
    try {
      if (!geminiApiKey) {
        showAlert("Erro: Chave da API Gemini não configurada.", "error");
        setInsightLoading(null);
        return;
      }
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
          result.candidates[0].content.parts.length > 0) { // CORREÇÃO: Acessar .parts[0].text
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
        <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 ml-4">
          Carregando seus dados e planejamentos...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 dark:bg-gray-800 dark:text-gray-200 transition-colors duration-300">
      <h2 className="text-xl sm:text-2xl font-bold text-[#007B8A] mb-6 dark:text-teal-400">
        Dashboard de Perspectivas e Previsões
      </h2>

      {(entries.length === 0 && dailyPlans.length === 0) ? (
        <p className="text-gray-500 text-center text-base sm:text-lg py-10 dark:text-gray-400">
          Nenhum dado encontrado. Comece a adicionar entradas no diário e planejamentos para ver suas perspectivas aqui!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* SEÇÃO: Seu Bem-Estar Geral */}
          <div className="md:col-span-1 bg-gradient-to-br from-[#007B8A] to-teal-700 rounded-lg shadow-md p-6 text-white flex flex-col items-center justify-center relative overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <span className="absolute top-4 right-4 text-white text-opacity-30 text-5xl font-bold">✨</span>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Seu Bem-Estar Geral</h3>
            <p className="text-4xl sm:text-5xl font-extrabold mb-3 leading-none">{averageSentimentScore}</p>
            <p className="text-sm opacity-90 text-center">
              (Média de sentimento do diário)
              {averageSentimentScore !== "N/A" && parseFloat(averageSentimentScore) >= 1.0 ? (
                " - Ótimo trabalho, continue assim!"
              ) : averageSentimentScore !== "N/A" && parseFloat(averageSentimentScore) < 0 ? (
                " - Estamos aqui para você, continue registrando."
              ) : (
                " - O que te impulsiona hoje?"
              )}
            </p>
            <p className="text-sm opacity-90 mt-2">Total de entradas: <span className="font-bold">{totalEntries}</span></p> {/* NOVO: Exibe totalEntries */}
          </div>

          {/* SEÇÃO: Foco e Progresso Recente (Último Planejamento) */}
          {lastPlan ? (
            <div className="md:col-span-1 bg-white rounded-lg border border-stone-200 shadow-md p-6 dark:bg-gray-700 dark:border-gray-600 transition-all duration-300 hover:shadow-xl">
              <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 dark:text-teal-400">Foco do Último Plano</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Data: <span className="font-bold">{new Date(lastPlan.date).toLocaleDateString('pt-BR')}</span>
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                Urgente e Importante: <span className="font-semibold">{lastPlan.urgentImportant || 'Nenhum item'}</span>
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                Tarefas principais: <span className="font-semibold">{lastPlan.tasks || 'Nenhuma tarefa.'}</span>
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage('dailyPlanning')}
                  className="px-3 py-1 bg-[#FF9800] text-white text-xs rounded-md hover:bg-orange-600 transition"
                >
                  Ver Todos os Planos
                </button>
                <button
                  onClick={() => handleGeneratePlanInsight(lastPlan)}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition"
                  disabled={insightLoading === lastPlan.id}
                >
                  {insightLoading === lastPlan.id ? <LoadingSpinner size="h-3 w-3" /> : 'Insight do Plano ✨'}
                </button>
              </div>
            </div>
          ) : (
            <div className="md:col-span-1 bg-white rounded-lg border border-stone-200 shadow-md p-6 dark:bg-gray-700 dark:border-gray-600 transition-all duration-300 hover:shadow-xl">
              <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 dark:text-teal-400">Foco e Progresso</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Adicione um planejamento diário para ver seu foco aqui.
              </p>
              <button
                onClick={() => setCurrentPage('dailyPlanning')}
                className="mt-4 px-3 py-1 bg-[#007B8A] text-white text-xs rounded-md hover:bg-teal-700 transition"
              >
                Ir para Planejamento
              </button>
            </div>
          )}

          {/* Gráfico de Valores Frequentes */}
          <div className="bg-white p-4 sm:p-5 rounded-lg border border-stone-200 shadow-md transition-all duration-300 hover:shadow-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 dark:text-teal-400">Meus Valores Mais Frequentes</h3>
            {commonValuesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={commonValuesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                  <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={60} style={{ fontSize: "0.75rem", fill: '#D1D5DB' }} />
                  <YAxis style={{ fill: '#D1D5DB' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#4B5563', border: 'none', color: '#D1D5DB' }} />
                  <Legend wrapperStyle={{ color: '#D1D5DB' }} />
                  <Bar dataKey="count" fill="#007B8A" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Nenhum valor registrado ainda.</p>
            )}
          </div>

          {/* Gráfico de Tendência de Sentimento */}
          <div className="md:col-span-2 bg-white p-4 sm:p-5 rounded-lg border border-stone-200 shadow-md transition-all duration-300 hover:shadow-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 dark:text-teal-400">Sua Jornada Emocional (Tendência de Sentimento)</h3>
            {sentimentTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sentimentTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                  <XAxis dataKey="date" style={{ fontSize: "0.75rem", fill: '#D1D5DB' }} />
                  <YAxis style={{ fill: '#D1D5DB' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#4B5563', border: 'none', color: '#D1D5DB' }} />
                  <Legend wrapperStyle={{ color: '#D1D5DB' }} />
                  <Line type="monotone" dataKey="sentiment" stroke="#FF9800" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Dados insuficientes para gerar o gráfico de sentimento.</p>
            )}
          </div>

          {/* NOVO: Próximos Passos Sugeridos */}
          <div className="md:col-span-2 bg-white p-4 sm:p-5 rounded-lg border border-stone-200 shadow-md transition-all duration-300 hover:shadow-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 dark:text-teal-400">Próximos Passos Sugeridos</h3>
            <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 dark:text-gray-300">
              <li>Mantenha a consistência no registro diário para melhores insights.</li>
              <li>Revise seu último planejamento diário e ajuste o foco, se necessário.</li>
              <li>Explore a página de Microcarreiras para alinhar suas habilidades aos seus valores.</li>
              <li>Seu bem-estar é prioridade. Faça um check-in sincero no seu diário hoje!</li>
            </ul>
          </div>
        </div>
      )}
      {alertState.show && <AlertDialog {...alertState} onClose={closeAlert} />}
    </div>
  );
};

export default DashboardPage;