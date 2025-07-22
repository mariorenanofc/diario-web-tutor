// src/utils/sentimentAnalysis.js
// Função para analisar o sentimento
const getSentimentScore = (selectedEmotion, textDescription) => {
  let score = 0;

  // Priorize a emoção selecionada
  switch (selectedEmotion) {
    case "Muito Feliz":
      score += 3;
      break;
    case "Feliz":
      score += 2;
      break;
    case "Neutro":
      score += 0;
      break;
    case "Triste":
      score -= 2;
      break;
    case "Muito Triste":
      score -= 3;
      break;
    case "Ansioso":
      score -= 1;
      break;
    case "Motivado":
      score += 2;
      break;
    case "Cansado":
      score -= 1;
      break;
    default:
      // Se não houver seleção, ou para a descrição, use análise de texto
      if (textDescription) {
        const lowerText = textDescription.toLowerCase();
        const positiveWords = {
          feliz: 2,
          alegre: 2,
          ótimo: 2,
          grato: 2,
          animado: 2,
          entusiasmado: 2,
          satisfeito: 1,
          bem: 1,
          calmo: 1,
          positivo: 1,
        };
        const negativeWords = {
          triste: -2,
          bravo: -2,
          irritado: -2,
          chateado: -2,
          frustrado: -2,
          cansado: -1,
          mal: -1,
          preocupado: -1,
          ansioso: -1,
          estressado: -1,
        };
        const neutralWords = {
          normal: 0,
          ok: 0,
          neutro: 0,
          indiferente: 0,
        };

        for (const word in positiveWords) {
          if (lowerText.includes(word)) {
            score += positiveWords[word];
          }
        }
        for (const word in negativeWords) {
          if (lowerText.includes(word)) {
            score += negativeWords[word];
          }
        }
        for (const word in neutralWords) {
          if (lowerText.includes(word)) {
            score += neutralWords[word];
          }
        }
      }
      break;
  }
  return score;
};

export default getSentimentScore;
