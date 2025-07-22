import React, { useState, useEffect } from "react";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import AlertDialog from "../components/common/AlertDialog"; // Certifique-se que AlertDialog está importado

const JournalForm = ({ onClose, editingEntry, setEditingEntry, showAlert }) => {
  const { user, db, appId, geminiApiKey } = useAuth();
  const [formData, setFormData] = useState({
    selectedCheckinEmotion: "",
    checkinDescription: "",
    challengeDescription: "",
    challengeFeelings: "",
    challengeReaction: "",
    reactionAnalysis: "",
    reactionFactors: "",
    reactionOutcome: "",
    reactionDifferent: "",
    selectedValues: [],
    customValue: "",
    successVision: "",
    successGoals: [
      { goal: "", relatedValue: "" },
      { goal: "", relatedValue: "" },
    ],
    commitmentAction: "",
    commitmentAffirmation: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [goalSuggestionLoading, setGoalSuggestionLoading] = useState(false);
  const [suggestedGoalSteps, setSuggestedGoalSteps] = useState("");
  const [activeSection, setActiveSection] = useState(1); // Novo estado para controlar a seção ativa

  const emotionOptions = [
    "Muito Feliz",
    "Feliz",
    "Neutro",
    "Triste",
    "Muito Triste",
    "Ansioso",
    "Motivado",
    "Cansado",
  ];
  const reactionOutcomeOptions = ["Ajudou", "Dificultou", "Neutro"];
  const predefinedValues = [
    "Respeito",
    "Autonomia",
    "Empatia",
    "Integridade",
    "Colaboração",
    "Crescimento",
    "Inovação",
    "Compaixão",
    "Resiliência",
    "Gratidão",
  ];

  useEffect(() => {
    if (editingEntry) {
      setFormData({
        selectedCheckinEmotion: editingEntry.selectedCheckinEmotion || "",
        checkinDescription: editingEntry.checkinDescription || "",
        challengeDescription: editingEntry.challengeDescription || "",
        challengeFeelings: editingEntry.challengeFeelings || "",
        challengeReaction: editingEntry.challengeReaction || "",
        reactionAnalysis: editingEntry.reactionAnalysis || "",
        reactionFactors: editingEntry.reactionFactors || "",
        reactionOutcome: editingEntry.reactionOutcome || "",
        reactionDifferent: editingEntry.reactionDifferent || "",
        selectedValues: editingEntry.selectedValues || [],
        customValue: editingEntry.customValue || "",
        successVision: editingEntry.successVision || "",
        successGoals: editingEntry.successGoals || [
          { goal: "", relatedValue: "" },
          { goal: "", relatedValue: "" },
        ],
        commitmentAction: editingEntry.commitmentAction || "",
        commitmentAffirmation: editingEntry.commitmentAffirmation || "",
      });
    }
  }, [editingEntry]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectedValueChange = (value, isChecked) => {
    setFormData((prev) => {
      let newSelectedValues;
      if (isChecked) {
        if (!prev.selectedValues.some((item) => item.value === value)) {
          newSelectedValues = [...prev.selectedValues, { value, example: "" }];
        } else {
          newSelectedValues = [...prev.selectedValues];
        }
      } else {
        newSelectedValues = prev.selectedValues.filter(
          (item) => item.value !== value
        );
      }
      return { ...prev, selectedValues: newSelectedValues };
    });
    if (isChecked && formErrors.selectedValues) {
      setFormErrors((prev) => ({ ...prev, selectedValues: "" }));
    }
  };

  const handleValueExampleChange = (value, example) => {
    setFormData((prev) => {
      const newSelectedValues = prev.selectedValues.map((item) =>
        item.value === value ? { ...item, example } : item
      );
      return { ...prev, selectedValues: newSelectedValues };
    });
  };

  const handleGoalChange = (index, field, value) => {
    const newGoals = [...formData.successGoals];
    newGoals[index][field] = value;
    setFormData((prev) => ({ ...prev, successGoals: newGoals }));
    if (formErrors[`successGoals[${index}].${field}`]) {
      setFormErrors((prev) => ({
        ...prev,
        [`successGoals[${index}].relatedValue`]: "",
      }));
      setFormErrors((prev) => ({
        ...prev,
        [`successGoals[${index}].goal`]: "",
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    // Validação da Seção 1
    if (!formData.selectedCheckinEmotion.trim()) {
      errors.selectedCheckinEmotion = "Por favor, selecione sua emoção.";
    }
    // Validação da Seção 2
    if (
      formData.challengeDescription.trim() &&
      formData.challengeDescription.trim().length < 10
    ) {
      errors.challengeDescription =
        "A descrição do desafio deve ter pelo menos 10 caracteres.";
    }
    if (
      formData.challengeFeelings.trim() &&
      formData.challengeFeelings.trim().length < 3
    ) {
      errors.challengeFeelings =
        "Os sentimentos devem ter pelo menos 3 caracteres.";
    }
    // Validação da Seção 3
    if (!formData.reactionOutcome.trim()) {
      errors.reactionOutcome =
        "Por favor, selecione o resultado da sua reação.";
    }

    // Validação da Seção 4
    if (formData.selectedValues.length === 0 && !formData.customValue.trim()) {
      errors.selectedValues =
        "Por favor, selecione pelo menos um valor ou adicione um personalizado.";
    }

    // Validação da Seção 5
    formData.successGoals.forEach((goal, index) => {
      if (goal.goal.trim() && !goal.relatedValue.trim()) {
        errors[
          `successGoals[${index}].relatedValue`
        ] = `O valor relacionado para a meta ${
          index + 1
        } é obrigatório se a meta for preenchida.`;
      }
      if (!goal.goal.trim() && goal.relatedValue.trim()) {
        errors[`successGoals[${index}].goal`] = `A meta ${
          index + 1
        } é obrigatória se o valor relacionado for preenchido.`;
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showAlert("Por favor, corrija os erros no formulário.", "error");
      // Opcional: Rolagem para o primeiro erro ou seção com erro
      const firstErrorField = Object.keys(formErrors)[0];
      if (firstErrorField) {
        // Encontra o elemento e rola para ele
        const element = document.querySelector(`[name="${firstErrorField}"], [id="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
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
    const entriesCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/journalEntries`
    );

    const valuesToSave = [...formData.selectedValues];
    if (
      formData.customValue.trim() &&
      !valuesToSave.some((v) => v.value === formData.customValue.trim())
    ) {
      valuesToSave.push({ value: formData.customValue.trim(), example: "" });
    }

    try {
      if (editingEntry) {
        const docRef = doc(
          db,
          `artifacts/${appId}/users/${userId}/journalEntries`,
          editingEntry.id
        );
        await updateDoc(docRef, {
          ...formData,
          values: valuesToSave,
          timestamp: new Date(),
          userId: userId,
        });
        showAlert("Entrada atualizada com sucesso!", "success");
        setEditingEntry(null);
      } else {
        await addDoc(entriesCollectionRef, {
          ...formData,
          values: valuesToSave,
          timestamp: new Date(),
          userId: userId,
        });
        showAlert("Entrada salva com sucesso!", "success");
        setFormData({
          selectedCheckinEmotion: "",
          checkinDescription: "",
          challengeDescription: "",
          challengeFeelings: "",
          challengeReaction: "",
          reactionAnalysis: "",
          reactionFactors: "",
          reactionOutcome: "",
          reactionDifferent: "",
          selectedValues: [],
          customValue: "",
          successVision: "",
          successGoals: [
            { goal: "", relatedValue: "" },
            { goal: "", relatedValue: "" },
          ],
          commitmentAction: "",
          commitmentAffirmation: "",
        });
      }
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Erro ao salvar/atualizar entrada:", error);
      showAlert(`Erro ao salvar entrada: ${error.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuggestGoalActions = async (goalText, index) => {
    if (!goalText.trim()) {
      showAlert("Por favor, insira uma meta para receber sugestões.", "error");
      return;
    }

    if (!geminiApiKey) {
      showAlert("Erro: Chave da API Gemini não configurada.", "error");
      return;
    }

    setGoalSuggestionLoading(true);
    setSuggestedGoalSteps("");

    try {
      const prompt = `Sugira 5 passos acionáveis e concretos para a seguinte meta: "${goalText}". Formate a resposta como uma lista numerada.`;
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
        setSuggestedGoalSteps(text);
      } else {
        showAlert(
          "Não foi possível gerar sugestões para a meta. Tente novamente.",
          "error"
        );
      }
    } catch (error) {
      console.error(
        "Erro ao chamar a API Gemini para sugestão de metas:",
        error
      );
      showAlert(
        "Erro ao gerar sugestões. Verifique sua conexão ou tente mais tarde.",
        "error"
      );
    } finally {
      setGoalSuggestionLoading(false);
    }
  };

  // Componente para uma seção colapsável
  const CollapsibleSection = ({ title, children, sectionNumber, totalSections }) => {
    const isOpen = activeSection === sectionNumber;
    const hasError = Object.keys(formErrors).some(key => key.startsWith(getSectionFieldPrefix(sectionNumber)));

    // Função auxiliar para determinar o prefixo dos campos da seção
    function getSectionFieldPrefix(num) {
      switch (num) {
        case 1: return 'selectedCheckinEmotion';
        case 2: return 'challenge';
        case 3: return 'reaction';
        case 4: return 'selectedValues';
        case 5: return 'successGoals';
        case 6: return 'commitment';
        default: return '';
      }
    }

    return (
      <div className="bg-stone-50 p-4 sm:p-5 rounded-lg border border-stone-200 transition-all duration-300 relative">
        <button
          type="button"
          className={`w-full text-left font-semibold text-lg sm:text-xl text-[#007B8A] mb-3 flex justify-between items-center focus:outline-none ${hasError ? 'text-red-600' : ''}`}
          onClick={() => setActiveSection(isOpen ? 0 : sectionNumber)} // Abre/fecha a seção
        >
          {title}
          {hasError && <span className="ml-2 text-red-500 text-sm">(Corrigir erros)</span>}
          <svg className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        {isOpen && (
          <div className="space-y-6 pt-4 border-t border-stone-200 mt-4">
            {children}
            {/* Botões de navegação entre seções */}
            <div className="flex justify-between items-center mt-6">
              {sectionNumber > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveSection(sectionNumber - 1)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
                >
                  Anterior
                </button>
              )}
              {sectionNumber < totalSections && (
                <button
                  type="button"
                  onClick={() => setActiveSection(sectionNumber + 1)}
                  className="px-4 py-2 bg-[#007B8A] text-white rounded-lg hover:bg-teal-700 transition"
                >
                  Próximo
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative transform scale-100 opacity-100 transition-all duration-300 ease-out dark:bg-gray-800  dark:border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          &times;
        </button>
        <h3 className="text-xl sm:text-2xl font-bold text-[#007B8A] mb-6">
          {editingEntry ? "Editar Entrada do Diário" : "Nova Entrada do Diário"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Indicador de progresso */}
          <div className="text-center text-sm text-gray-600 font-semibold mb-4">
            Passo {activeSection} de 6
          </div>

          <CollapsibleSection title="1. Comece com um check-in" sectionNumber={1} totalSections={6}>
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              Pergunta-guia: Como estou hoje?
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-3">
              {emotionOptions.map((option) => (
                <label
                  key={option}
                  className="inline-flex items-center cursor-pointer px-3 py-1 bg-teal-100 rounded-full text-sm sm:text-base hover:bg-teal-200 transition-colors duration-200"
                >
                  <input
                    type="radio"
                    name="selectedCheckinEmotion"
                    value={option}
                    checked={formData.selectedCheckinEmotion === option}
                    onChange={handleChange}
                    className="form-radio h-4 w-4 text-[#007B8A] transition-all duration-200 focus:ring-[#007B8A]"
                  />
                  <span className="ml-2 text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {formErrors.selectedCheckinEmotion && (
              <p className="text-red-500 text-sm mt-1">
                {formErrors.selectedCheckinEmotion}
              </p>
            )}

            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 mt-3">
              Descreva mais (opcional):
            </label>
            <textarea
              name="checkinDescription"
              value={formData.checkinDescription}
              onChange={handleChange}
              placeholder="Descreva como você se sente agora. Reconheça emoções sem julgá-las."
              rows="3"
              className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base"
            ></textarea>
            <p className="text-xs text-gray-500 mt-1">
              Dica: Emoções não são certas ou erradas. São pistas.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="2. Reviva um desafio recente" sectionNumber={2} totalSections={6}>
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              Pergunta-guia: Qual situação me desafiou nos últimos dias?
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Descreva brevemente o que aconteceu:
                </label>
                <textarea
                  name="challengeDescription"
                  value={formData.challengeDescription}
                  onChange={handleChange}
                  rows="2"
                  className={`w-full p-2 sm:p-3 border rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base ${
                    formErrors.challengeDescription
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                ></textarea>
                {formErrors.challengeDescription && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.challengeDescription}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Aponte o que sentiu na hora:
                </label>
                <input
                  type="text"
                  name="challengeFeelings"
                  value={formData.challengeFeelings}
                  onChange={handleChange}
                  className={`w-full p-2 sm:p-3 border rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base ${
                    formErrors.challengeFeelings
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {formErrors.challengeFeelings && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.challengeFeelings}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Anote como você reagiu:
                </label>
                <textarea
                  name="challengeReaction"
                  value={formData.challengeReaction}
                  onChange={handleChange}
                  rows="2"
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base"
                ></textarea>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dica: Seja honesto. Este diário é só seu.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="3. Analise sua reação" sectionNumber={3} totalSections={6}>
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              Pergunta-guia: Por que reagi assim?
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Liste fatores que influenciaram você (emoções, contexto,
                  outras pessoas):
                </label>
                <textarea
                  name="reactionFactors"
                  value={formData.reactionFactors}
                  onChange={handleChange}
                  rows="2"
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Essa reação ajudou ou dificultou resolver o desafio?
                </label>
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-3">
                  {reactionOutcomeOptions.map((option) => (
                    <label
                      key={option}
                      className="inline-flex items-center cursor-pointer px-3 py-1 bg-teal-100 rounded-full text-sm sm:text-base hover:bg-teal-200 transition-colors duration-200"
                    >
                      <input
                        type="radio"
                        name="reactionOutcome"
                        value={option}
                        checked={formData.reactionOutcome === option}
                        onChange={handleChange}
                        className="form-radio h-4 w-4 text-[#007B8A] transition-all duration-200 focus:ring-[#007B8A]"
                      />
                      <span className="ml-2 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
                {formErrors.reactionOutcome && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.reactionOutcome}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Anote algo que faria diferente:
                </label>
                <textarea
                  name="reactionDifferent"
                  value={formData.reactionDifferent}
                  onChange={handleChange}
                  rows="2"
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base"
                ></textarea>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dica: Aqui mora o aprendizado.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="4. Declare seus valores" sectionNumber={4} totalSections={6}>
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              Pergunta-guia: O que é importante para mim?
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {predefinedValues.map((value) => (
                  <div
                    key={value}
                    className="flex flex-col sm:flex-row sm:items-center p-2 border border-gray-200 rounded-md bg-white"
                  >
                    <label
                      htmlFor={`value-${value}`}
                      className="inline-flex items-center cursor-pointer mb-2 sm:mb-0 sm:mr-3 w-full sm:w-auto"
                    >
                      <input
                        type="checkbox"
                        id={`value-${value}`}
                        checked={formData.selectedValues.some(
                          (item) => item.value === value
                        )}
                        onChange={(e) =>
                          handleSelectedValueChange(value, e.target.checked)
                        }
                        className="form-checkbox h-4 w-4 text-[#007B8A] rounded focus:ring-[#007B8A] transition-all duration-200"
                      />
                      <span className="ml-2 text-gray-700 font-medium text-sm sm:text-base">
                        {value}
                      </span>
                    </label>
                    {formData.selectedValues.some(
                      (item) => item.value === value
                    ) && (
                      <input
                        type="text"
                        placeholder="Exemplo de como você viveu este valor"
                        value={
                          formData.selectedValues.find(
                            (item) => item.value === value
                          )?.example || ""
                        }
                        onChange={(e) =>
                          handleValueExampleChange(value, e.target.value)
                        }
                        className="flex-1 p-2 border border-gray-300 rounded-md text-sm sm:text-base focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 w-full sm:w-auto"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-2 border border-gray-200 rounded-md bg-white">
                <label
                  htmlFor="customValue"
                  className="block text-sm sm:text-base font-medium text-gray-700 mb-1"
                >
                  Outro valor (opcional):
                </label>
                <input
                  type="text"
                  id="customValue"
                  name="customValue"
                  value={formData.customValue}
                  onChange={handleChange}
                  placeholder="Adicione um valor personalizado"
                  className={`w-full p-2 sm:p-3 border rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base ${
                    formErrors.selectedValues // Este erro também pode cobrir customValue se nenhum valor for selecionado
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {formErrors.selectedValues && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.selectedValues}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dica: Seus valores são bússolas. Eles orientam suas escolhas.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="5. Desenhe sua visão de sucesso" sectionNumber={5} totalSections={6}>
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              Pergunta-guia: Que pessoa quero me tornar?
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Descreva como gostaria de agir em situações difíceis:
                </label>
                <textarea
                  name="successVision"
                  value={formData.successVision}
                  onChange={handleChange}
                  rows="2"
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Liste 2 ou 3 metas pessoais ou profissionais:
                </label>
                {formData.successGoals.map((goal, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3"
                  >
                    <input
                      type="text"
                      placeholder={`Meta ${index + 1}`}
                      value={goal.goal}
                      onChange={(e) =>
                        handleGoalChange(index, "goal", e.target.value)
                      }
                      className={`flex-1 p-2 sm:p-3 border rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base ${
                        formErrors[`successGoals[${index}].goal`]
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    <input
                      type="text"
                      placeholder={`Valor relacionado à Meta ${index + 1}`}
                      value={goal.relatedValue}
                      onChange={(e) =>
                        handleGoalChange(index, "relatedValue", e.target.value)
                      }
                      className={`flex-1 p-2 sm:p-3 border rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base ${
                        formErrors[`successGoals[${index}].relatedValue`]
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleSuggestGoalActions(goal.goal, index)}
                      className="px-3 py-1 sm:px-4 sm:py-2 bg-[#FF9800] text-white rounded-lg shadow-md hover:bg-orange-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#FF9800] focus:ring-opacity-50 text-sm sm:text-base flex items-center justify-center"
                      disabled={goalSuggestionLoading}
                    >
                      {goalSuggestionLoading ? (
                        <LoadingSpinner size="h-4 w-4" />
                      ) : (
                        "Sugerir Ações ✨"
                      )}
                    </button>
                  </div>
                ))}
                {goalSuggestionLoading && (
                  <p className="text-gray-600 text-sm mt-2 flex items-center">
                    <LoadingSpinner size="h-4 w-4" color="text-gray-600" />{" "}
                    Gerando sugestões...
                  </p>
                )}
                {suggestedGoalSteps && (
                  <div className="bg-orange-100 p-3 rounded-md mt-3 text-sm sm:text-base">
                    <h5 className="font-semibold text-orange-800 mb-1">
                      Sugestões de Ações:
                    </h5>
                    <div
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{
                        __html: suggestedGoalSteps.replace(/\n/g, "<br/>"),
                      }}
                    ></div>
                  </div>
                )}
                {Object.keys(formErrors).some((key) =>
                  key.startsWith("successGoals")
                ) && (
                  <p className="text-red-500 text-sm mt-1">
                    Verifique os campos de metas e valores relacionados.
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dica: Sucesso real é aquele que faz sentido para você.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="6. Conclua com um compromisso" sectionNumber={6} totalSections={6}>
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              Pergunta-guia: Qual pequena ação vou tentar nos próximos dias?
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Escolha algo realista:
                </label>
                <input
                  type="text"
                  name="commitmentAction"
                  value={formData.commitmentAction}
                  onChange={handleChange}
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Escreva em forma de frase afirmativa:
                </label>
                <textarea
                  name="commitmentAffirmation"
                  value={formData.commitmentAffirmation}
                  onChange={handleChange}
                  rows="2"
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#007B8A] focus:border-[#007B8A] transition-all duration-200 text-sm sm:text-base"
                ></textarea>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dica: Pequenas mudanças geram grandes resultados.
            </p>
          </CollapsibleSection>

          <div className="flex justify-end gap-3 sm:gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
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
              ) : editingEntry ? (
                "Atualizar Entrada"
              ) : (
                "Salvar Entrada"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JournalForm;