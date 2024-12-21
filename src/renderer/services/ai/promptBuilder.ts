import { extractContexts } from '../editor/textProcessing'

export const createPrompt = (contextText: string): string => {
  const cursorPosition = contextText.indexOf('<CURSOR>');
  const { previousContext, currentSentence, followingContext } = 
    extractContexts(contextText, cursorPosition);

  const prompt = `
  <purpose>
    You are an expert writing assistant, help the user complete the sentance that is in the <current_sentence> tag.
  </purpose>

  <instructions>
    <instruction>
      Do not include any formatting or quotes in your response.
    </instruction>
    <instruction>
      Only respond with at most ONE sentance.
    </instruction>
    <instruction>
      If the <CURSOR> is in the middle of an uncompleted word, complete the word.
    </instruction>
    <instruction>
      Keep your response concise and to the point, do not include any additional information.
    </instruction>
    <instruction>
      If the <CURSOR> Is alone by itself in <current_sentence> tag, This means the user has not typed anything yet, predict the next few words of the sentence to help them get started.
    </instruction>
    <instruction>
      Make sure that your response is coherent with the <previous_context> and <following_context>.
    </instruction>
  </instructions>

  <content>
    <previous_context>
      ${previousContext}
    </previous_context>

    <following_context>
      ${followingContext}
    </following_context>

    <current_sentence>
      ${currentSentence}
    </current_sentence>
  </content>

  <instructions>
    <instruction>
      Predict the next few words of the <current_sentence> based on the <previous_context> and <following_context>.
    </instruction>
    <instruction>
      Never repeat a sentance that is in the <previous_context>.
    </instruction>
  </instructions>

  Continuation:`;

  return prompt;
}; 