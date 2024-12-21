export function normalize(s: string): string {
    return s
      .toLowerCase()
      .replace(/['";:,.!?]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  function findSubstringIndices(
    haystack: string,
    needle: string
  ): [number, number] | null {
    const needleChars = needle.toLowerCase().split('');
    const isPunc = (ch: string) => /['";:,.!?]/.test(ch);
  
    for (let start = 0; start < haystack.length; start++) {
      let i = start;
      let j = 0;
      let startIndexFound = -1;
  
      while (i < haystack.length && j < needleChars.length) {
        const hChar = haystack[i].toLowerCase();
        const nChar = needleChars[j];
  
        if (isPunc(hChar)) {
          i++;
          continue;
        }
  
        if (hChar === nChar) {
          if (startIndexFound === -1) {
            startIndexFound = i; 
          }
          i++;
          j++;
        } else if (/\s/.test(hChar) && /\s/.test(nChar)) {
          if (startIndexFound === -1) {
            startIndexFound = i; 
          }
          i++;
          j++;
        } else if (/\s/.test(hChar)) {
          i++;
        } else {
          break;
        }
      }
  
      if (j === needleChars.length) {
        // Found full match
        return [startIndexFound, i - 1];
      }
    }
  
    return null;
  }
  
  export function fuzzyMatchSubstring(str1: string, str2: string) {
    const norm1 = normalize(str1);
    const norm2 = normalize(str2);
  
    let bestMatch = '';
    if (norm1 && norm2.includes(norm1)) {
      bestMatch = norm1;
    } else {
      return {
        bestMatch: '',
        activeSentenceIndices: null as [number, number] | null,
        newPredictionIndices: null as [number, number] | null
      };
    }

    const activeSentenceIndices = findSubstringIndices(str1, bestMatch);
    const newPredictionIndices = findSubstringIndices(str2, bestMatch);
  
    return {
      bestMatch,
      activeSentenceIndices,
      newPredictionIndices
    };
  }


export const longestCommonOverlap = (currentSentence: string, prediction: string): string => {
  // console.log('CURRENT_SENTENCE', current_sentence)
  // console.log('PREDICTION', prediction)
  const maxLength = Math.min(currentSentence.length, prediction.length);
  
  for (let length = maxLength; length > 0; length--) {
    const endSubstring = currentSentence.slice(-length);
    const startSubstring = prediction.slice(0, length);
    if (endSubstring === startSubstring) {
      return endSubstring;
    }
  }
  const currentWords = currentSentence.trim().split(/\s+/);
  const predictionWords = prediction.trim().split(/\s+/);
  let i = 0;
  while (i < currentWords.length && i < predictionWords.length && currentWords[i] === predictionWords[i]) {
    i++;
  }

  const remainder = predictionWords.slice(i).join(' ')
  // console.log('REMAINDER', remainder)
  // console.log('CURRENT_SENTENCE', currentSentence)
  if (currentSentence.includes(remainder)) {
    return remainder
  }
  return '';
}; 