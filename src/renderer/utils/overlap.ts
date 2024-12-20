export const longestCommonOverlap = (current_sentence: string, prediction: string): string => {

  console.log('CURRENT_SENTENCE', current_sentence)
  console.log('PREDICTION', prediction)
  const maxLength = Math.min(current_sentence.length, prediction.length);
  

  for (let length = maxLength; length > 0; length--) {
    const endSubstring = current_sentence.slice(-length);
    const startSubstring = prediction.slice(0, length);
    if (endSubstring === startSubstring) {
      return endSubstring;
    }
  }

  const currentWords = current_sentence.trim().split(/\s+/);
  const predictionWords = prediction.trim().split(/\s+/);

  let i = 0;
  while (i < currentWords.length && i < predictionWords.length && currentWords[i] === predictionWords[i]) {
    i++;
  }
  const remainder = predictionWords.slice(i).join(' ')
  console.log('REMAINDER', remainder)
  return remainder;
}; 