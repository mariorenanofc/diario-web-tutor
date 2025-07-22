import React, { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
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

const DashboardPage = () => {
  const { user, db, appId } = useAuth(); // <--- OBTÉM appId DO CONTEXTO
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (db && user && appId) {
      // Garante que appId está disponível
      const userId = user.uid || "anonymous";
      const entriesCollectionRef = collection(
        db,
        `artifacts/${appId}/users/${userId}/journalEntries`
      ); // <--- USA appId AQUI
      const q = query(entriesCollectionRef, orderBy("timestamp", "asc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedEntries = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setEntries(fetchedEntries);
          setLoading(false);
        },
        (error) => {
          console.error("Erro ao buscar entradas para o dashboard:", error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [db, user, appId]); // Adiciona appId às dependências do useEffect

  const analyzedData = useMemo(() => {
    if (entries.length === 0) {
      return {
        totalEntries: 0,
        sentimentTrend: [],
        commonValuesData: [],
        futureGoals: [],
        recentCommitments: [],
      };
    }

    const totalEntries = entries.length;

    const sentimentByDate = {};
    entries.forEach((entry) => {
      const date = new Date(entry.timestamp?.toDate()).toLocaleDateString(
        "pt-BR"
      );
      const score = getSentimentScore(
        entry.selectedCheckinEmotion,
        entry.checkinDescription
      );
      if (!sentimentByDate[date]) {
        sentimentByDate[date] = { totalScore: 0, count: 0 };
      }
      sentimentByDate[date].totalScore += score;
      sentimentByDate[date].count += 1;
    });

    const sentimentTrend = Object.keys(sentimentByDate)
      .map((date) => ({
        date,
        sentiment:
          sentimentByDate[date].totalScore / sentimentByDate[date].count,
      }))
      .sort(
        (a, b) =>
          new Date(a.date.split("/").reverse().join("-")) -
          new Date(b.date.split("/").reverse().join("-"))
      );

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

    const futureGoals = entries
      .flatMap((entry) => entry.successGoals?.map((g) => g.goal || "") || [])
      .filter((g) => g !== "");

    const recentCommitments = entries
      .slice(0, 5)
      .map((entry) => entry.commitmentAction || "")
      .filter((c) => c !== "");

    return {
      totalEntries,
      sentimentTrend,
      commonValuesData,
      futureGoals,
      recentCommitments,
    };
  }, [entries]);

  const {
    totalEntries,
    sentimentTrend,
    commonValuesData,
    futureGoals,
    recentCommitments,
  } = analyzedData;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)] bg-stone-100 dark:bg-gray-900 transition-colors duration-300">
        <LoadingSpinner size="h-10 w-10" color="text-teal-600" />
        <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Analisando seus dados...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 dark:bg-gray-800 dark:text-gray-200 transition-colors duration-300">
      <h2 className="text-xl sm:text-2xl font-bold text-[#007B8A] mb-6 dark:text-teal-400">
        Dashboard de Perspectivas e Previsões
      </h2>

      {entries.length === 0 ? (
        <p className="text-gray-500 text-center text-base sm:text-lg py-10 dark:text-gray-400">
          Comece a adicionar entradas no seu diário para ver suas perspectivas e
          previsões aqui!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200 shadow-md transition-all duration-300 hover:shadow-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 dark:text-teal-400">
              Resumo Geral
            </h3>
            <p className="text-sm sm:text-base text-gray-700 mb-2 dark:text-gray-300">
              Total de entradas:{" "}
              <span className="font-bold">{totalEntries}</span>
            </p>
            <p className="text-sm sm:text-base text-gray-700 mb-2 dark:text-gray-300">
              Sentimento médio (Check-in):{" "}
              <span className="font-bold">
                {sentimentTrend.length > 0
                  ? (
                      sentimentTrend.reduce(
                        (sum, item) => sum + item.sentiment,
                        0
                      ) / sentimentTrend.length
                    ).toFixed(2)
                  : "N/A"}
              </span>
            </p>
          </div>

          <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200 shadow-md transition-all duration-300 hover:shadow-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 dark:text-teal-400">
              Meus Valores Mais Frequentes
            </h3>
            {commonValuesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={commonValuesData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" /> {/* Cor da grade para dark mode */}
                  <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={60} style={{ fontSize: "0.75rem", fill: '#D1D5DB' }} /> {/* Cor do texto do eixo X */}
                  <YAxis style={{ fill: '#D1D5DB' }} /> {/* Cor do texto do eixo Y */}
                  <Tooltip contentStyle={{ backgroundColor: '#4B5563', border: 'none', color: '#D1D5DB' }} /> {/* Estilo do tooltip */}
                  <Legend wrapperStyle={{ color: '#D1D5DB' }} /> {/* Estilo da legenda */}
                  <Bar dataKey="count" fill="#007B8A" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                Nenhum valor registrado ainda.
              </p>
            )}
          </div>

          <div className="md:col-span-2 bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200 shadow-md transition-all duration-300 hover:shadow-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 dark:text-teal-400">
              Tendência de Sentimento ao Longo do Tempo
            </h3>
            {sentimentTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={sentimentTrend}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" /> {/* Cor da grade para dark mode */}
                  <XAxis dataKey="date" style={{ fontSize: "0.75rem", fill: '#D1D5DB' }} /> {/* Cor do texto do eixo X */}
                  <YAxis style={{ fill: '#D1D5DB' }} /> {/* Cor do texto do eixo Y */}
                  <Tooltip contentStyle={{ backgroundColor: '#4B5563', border: 'none', color: '#D1D5DB' }} /> {/* Estilo do tooltip */}
                  <Legend wrapperStyle={{ color: '#D1D5DB' }} /> {/* Estilo da legenda */}
                  <Line
                    type="monotone"
                    dataKey="sentiment"
                    stroke="#FF9800"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                Dados insuficientes para gerar o gráfico de sentimento.
              </p>
            )}
          </div>

          <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200 shadow-md transition-all duration-300 hover:shadow-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 dark:text-teal-400">
              Minhas Metas Futuras
            </h3>
            {futureGoals.length > 0 ? (
              <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 dark:text-gray-300">
                {futureGoals.map((goal, index) => (
                  <li key={index}>{goal}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                Nenhuma meta futura registrada ainda.
              </p>
            )}
          </div>

          <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200 shadow-md transition-all duration-300 hover:shadow-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            <h3 className="font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 dark:text-teal-400">
              Compromissos Recentes
            </h3>
            {recentCommitments.length > 0 ? (
              <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 dark:text-gray-300">
                {recentCommitments.map((commitment, index) => (
                  <li key={index}>{commitment}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                Nenhum compromisso recente registrado.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
