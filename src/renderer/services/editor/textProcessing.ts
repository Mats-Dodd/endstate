export const findSentenceContainingCursor = (text: string, cursorPosition: number): [number, number] => {
  const sentenceEndings = /[.!?]/;
  
  let sentenceStart = cursorPosition;
  let sentenceEnd = cursorPosition;
  
  while (sentenceStart > 0) {
    if (sentenceEndings.test(text[sentenceStart - 1])) {
      sentenceStart++;
      break;
    }
    sentenceStart--;
  }
  
  while (sentenceEnd < text.length) {
    if (sentenceEndings.test(text[sentenceEnd])) {
      sentenceEnd++;
      break;
    }
    sentenceEnd++;
  }

  return [sentenceStart, sentenceEnd];
};

export const extractContexts = (text: string, cursorPosition: number): {
  previousContext: string;
  currentSentence: string;
  followingContext: string;
} => {
  const [sentenceStart, sentenceEnd] = findSentenceContainingCursor(text, cursorPosition);

  let currentSentence = text.slice(sentenceStart, sentenceEnd);
  currentSentence = currentSentence.replace(/\s+/g, ' ').trim();

  const textWithoutCursor = text.replace('<CURSOR>', '');

  const textBeforeSentence = textWithoutCursor.slice(0, sentenceStart);
  const wordsBefore = textBeforeSentence.split(/\s+/);
  const previousWords = wordsBefore.length > 500
    ? wordsBefore.slice(wordsBefore.length - 500)
    : wordsBefore;
  const previousContext = previousWords.join(' ').trim();

  const textAfterSentence = textWithoutCursor.slice(sentenceEnd);
  const followingContext = textAfterSentence.slice(0, 500).trim();

  return {
    previousContext,
    currentSentence,
    followingContext,
  };
}; 