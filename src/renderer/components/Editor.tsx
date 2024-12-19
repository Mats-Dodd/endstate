import { Color } from '@tiptap/extension-color'
import ListItem from '@tiptap/extension-list-item'
import TextStyle from '@tiptap/extension-text-style'
import { EditorProvider, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Editor as TiptapEditor } from '@tiptap/core'
import MenuBar from './MenuBar'
import { useCallback, useState, useRef, useEffect } from 'react'
import ollama from 'ollama'
import { EditorView } from 'prosemirror-view'
import { Extension } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'


const PredictionExtension = Extension.create({
  name: 'prediction',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const { doc, selection } = state
            const decorations: Decoration[] = []
            
            const prediction = (window as any).currentPrediction

            if (prediction) {
              decorations.push(
                Decoration.widget(selection.$head.pos, () => {
                  const span = document.createElement('span')
                  span.style.color = '#666'
                  span.style.fontStyle = 'italic'
                  span.className = 'inline-prediction'
                  span.textContent = prediction
                  return span
                })
              )
            }

            return DecorationSet.create(doc, decorations)
          },
          handleKeyDown: (view, event) => {
            if (event.key !== 'Tab') {
              window.dispatchEvent(new CustomEvent('clearPrediction'))
            }
            return false
          },
          handleClick: () => {
            window.dispatchEvent(new CustomEvent('clearPrediction'))
            return false
          }
        }
      })
    ]
  }
})


const extensions = [
  Color,
  TextStyle,
  ListItem,
  PredictionExtension,
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
  }),
]


const initialContent = `
<p>
  What will you write?
</p>
`


const findSentenceContainingCursor = (text: string, cursorPosition: number): [number, number] => {
  const sentenceEndings = /[.!?]/;
  
  let sentenceStart = cursorPosition;
  let sentenceEnd = cursorPosition;
  
  // Move backwards to find start of sentence
  while (sentenceStart > 0) {
    if (sentenceEndings.test(text[sentenceStart - 1])) {
      sentenceStart++;
      break;
    }
    sentenceStart--;
  }
  
  // Move forwards to find end of sentence
  while (sentenceEnd < text.length) {
    if (sentenceEndings.test(text[sentenceEnd])) {
      sentenceEnd++;
      break;
    }
    sentenceEnd++;
  }

  return [sentenceStart, sentenceEnd];
};


const extractContexts = (text: string, cursorPosition: number): {
  previousContext: string;
  currentSentence: string;
  followingContext: string;
} => {
  const [sentenceStart, sentenceEnd] = findSentenceContainingCursor(text, cursorPosition);

  let currentSentence = text.slice(sentenceStart, sentenceEnd);
  // Normalize internal whitespace so there are no extra newlines
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


const createPrompt = (contextText: string): string => {
  const cursorPosition = contextText.indexOf('<CURSOR>');
  const { previousContext, currentSentence, followingContext } = 
    extractContexts(contextText, cursorPosition);

  const prompt = `
  <purpose>
    You are an expert writing assistant, help the user complete the sentance from the <CURSOR> tag.
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


const Editor = () => {
  const [prediction, setPrediction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<TiptapEditor | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const clearPrediction = () => {
      setPrediction('')
      ;(window as any).currentPrediction = ''
    }

    window.addEventListener('clearPrediction', clearPrediction)
    return () => window.removeEventListener('clearPrediction', clearPrediction)
  }, [])


  const getPrediction = async (contextText: string) => {
    const model = 'mistral-nemo'
    const editor = editorRef.current
    if (!editor) return
    
    const { typedInSentence, activeSentence } = getActiveSentenceAndTypedText(editor)
    
    // Find the start of current sentence
    const { from } = editor.state.selection;
    let sentenceStart = from;
    const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', ' ');
    const sentenceEndings = /[.!?]/;
    
    while (sentenceStart > 0) {
      if (sentenceEndings.test(docText[sentenceStart - 1])) {
        sentenceStart++;
        break;
      }
      sentenceStart--;
    }

    const previousSentence = getPreviousSentence(editor, sentenceStart);
    // console.log('PREVIOUS SENTENCE:', previousSentence);
    // console.log('TYPED IN SENTENCE', typedInSentence)
    // console.log('ACTIVE SENTENCE', activeSentence)
    // console.log('--------------------------------')

    try {
      setError(null)
      const prompt = createPrompt(contextText)
      // console.log(prompt)
      // console.log('--------------------------------')
      const response = await ollama.generate({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_k: 40,
          num_predict: 50,
          stop: ['\n'],
        }
      })

      if (response.response) {
        const newPrediction = response.response
          .trim()
          .replace(/^"|"$/g, '')

        // This checks if the prediction is the same as the active sentance
        if (newPrediction.toLowerCase() === activeSentence.toLowerCase()) {
          setPrediction('')
          ;(window as any).currentPrediction = ''
          return
        }
        // This checks if the prediction is the same as the previous sentence
        if (newPrediction.toLowerCase() === previousSentence.toLowerCase()) {
          setPrediction('')
          ;(window as any).currentPrediction = ''
          return
        }
        
        const commonSubstring = longestCommonSubstring(activeSentence, newPrediction);
        // console.log('COMMON SUBSTRING', commonSubstring)
        // console.log('--------------------------------')
        const remainder = newPrediction.slice(commonSubstring.length).trim();
        console.log('REMAINDER IN PROMPT', remainder)
        console.log('--------------------------------')

        if (remainder.length > 0) {
          setPrediction(remainder)
          ;(window as any).currentPrediction = remainder
        }
        else {
          setPrediction(newPrediction)
          ;(window as any).currentPrediction = newPrediction
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`Error: ${err.message}. Make sure Ollama is running and a model is installed.`)
      } else {
        setError('An unknown error occurred')
      }
      setPrediction('')
      ;(window as any).currentPrediction = ''
    }
  }


  const handleUpdate = useCallback(({ editor }: { editor: TiptapEditor }) => {
    editorRef.current = editor;
    const state = editor.state;
    const { from } = state.selection;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If doc changed recently, clear prediction
    if (editor.state.tr.docChanged) {
      setPrediction('');
      (window as any).currentPrediction = '';
      return;
    }

    const docSize = state.doc.content.size;
    const startPos = Math.max(0, from - 1000);
    const endPos = Math.min(docSize, from + 1000);
    const contextText = state.doc.textBetween(startPos, endPos, '\n', ' ');
    const cursorPosition = from - startPos;

    if (!contextText || contextText.length < 5) {
      setPrediction('');
      (window as any).currentPrediction = '';
      return;
    }

    timeoutRef.current = setTimeout(() => {
      const contextWithCursor = 
        contextText.slice(0, cursorPosition) + '<CURSOR>' + contextText.slice(cursorPosition);
      getPrediction(contextWithCursor);
    }, 500);
  }, []);


  const getActiveSentenceAndTypedText = (editor: TiptapEditor) => {
    const { from } = editor.state.selection
    const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', ' ')

    const sentenceEndings = /[.!?]/;
    let sentenceStart = from;
    let sentenceEnd = from;

    while (sentenceStart > 0) {
      if (sentenceEndings.test(docText[sentenceStart - 1])) {
        sentenceStart++;
        break;
      }
      sentenceStart--;
    }

    while (sentenceEnd < docText.length) {
      if (sentenceEndings.test(docText[sentenceEnd])) {
        sentenceEnd++;
        break;
      }
      sentenceEnd++;
    }

    const activeSentence = docText.slice(sentenceStart, sentenceEnd).trim();
    const typedInSentence = docText.slice(sentenceStart, from).replace(/\s+/g, ' ');

    return { activeSentence, typedInSentence };
  };

  const longestCommonSubstring = (current_sentence: string, prediction: string): string => {
    const m: number = current_sentence.length;
    const n: number = prediction.length;
    
    const dp: number[][] = Array(m + 1).fill(0)
        .map(() => Array(n + 1).fill(0));
    
    let maxLength: number = 0;
    let endPosition: number = 0;
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (current_sentence[i - 1] === prediction[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                
                if (dp[i][j] > maxLength) {
                    maxLength = dp[i][j];
                    endPosition = i;
                }
            }
        }
    }
    const longestSubstring = current_sentence.substring(endPosition - maxLength, endPosition);
    return longestSubstring;
  };
  

  const getPreviousSentence = (editor: TiptapEditor, currentSentenceStart: number): string => {
    const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', ' ');
    const sentenceEndings = /[.!?]/;
    let previousSentenceEnd = currentSentenceStart;

    while (previousSentenceEnd > 0) {
      previousSentenceEnd--;
      if (sentenceEndings.test(docText[previousSentenceEnd])) {
        break;
      }
    }
    if (previousSentenceEnd <= 0) {
      return '';
    }
    let previousSentenceStart = previousSentenceEnd;
    while (previousSentenceStart > 0) {
      previousSentenceStart--;
      if (sentenceEndings.test(docText[previousSentenceStart])) {
        previousSentenceStart++;
        break;
      }
    }

    return docText.slice(previousSentenceStart, previousSentenceEnd + 1).trim();
  };

  const handleKeyDown = useCallback(
    (view: EditorView, event: KeyboardEvent) => {
      if (event.key === 'Tab' && prediction && editorRef.current) {
        event.preventDefault();

        const editor = editorRef.current;
    
        const { typedInSentence, activeSentence } = getActiveSentenceAndTypedText(editor);
        
        let typed = typedInSentence.replace(/\s+/g, ' ').trim();
        // console.log('TYPED', typed);
        // console.log('--------------------------------');
        let predicted = prediction.replace(/\s+/g, ' ').trim();
        // console.log('PREDICTED', predicted);
        // console.log('--------------------------------');

        // check if the last word of the active sentence is a partial word of the first word of the predicted
        const activeSentenceLastWord = activeSentence.split(' ').pop()
        // console.log('ACTIVE SENTENCE LAST WORD', activeSentenceLastWord)
        const predictedFirstWord = predicted.split(' ')[0]
        //  console.log('PREDICTED FIRST WORD', predictedFirstWord)
        // console.log('--------------------------------')
        if (activeSentenceLastWord && predictedFirstWord && activeSentenceLastWord.toLowerCase() === predictedFirstWord.toLowerCase().slice(0, activeSentenceLastWord.length)) {
          // console.log('MATCH');
          // console.log('PREDICTED', predicted.slice(activeSentenceLastWord.length));
        
          const newRemainder = predicted.slice(activeSentenceLastWord.length);
          const remainder = newRemainder.trimStart();
        
          const { commands } = editor;
        
          commands.command(({ tr }) => {
            tr.insertText(remainder, tr.selection.from);
            return true;
          });
        
          setPrediction('');
          (window as any).currentPrediction = '';
          return true;
        }

        // Check for partial word scenario:
        // If typed ends with a letter and remainder starts with a letter,
        // assume we are continuing the same word without adding a space.
       
        const typedEndsWithSpace = typed.endsWith(' ');
        console.log('TYPED ENDS WITH SPACE', typedEndsWithSpace)
        const remainderStartsWithSpace = predicted.startsWith(' ');
        console.log('REMAINDER STARTS WITH SPACE', remainderStartsWithSpace)

        if (typedEndsWithSpace && remainderStartsWithSpace) {
          console.log('REMOVING SPACE FROM PREDICTED BECAUSE OF SPACE IN BOTH', predicted)
          predicted = predicted.replace(/^ +/, '');
        } else if (!typedEndsWithSpace && !remainderStartsWithSpace) {
          predicted = ' ' + predicted;
          console.log('ADDING SPACE TO PREDICTED BECAUSE OF NO SPACE IN BOTH', predicted)
        }

        const { commands } = editor;
        commands.command(({ tr }) => {
          console.log('INSERTING', predicted)
          tr.insertText(predicted, tr.selection.from);
          return true;
        });

        setPrediction('');
        (window as any).currentPrediction = '';
        return true;
      }
      return false;
    },
    [prediction]
  );

  return (
    <div className="editor-wrapper">
      <EditorProvider 
        slotBefore={<MenuBar />} 
        extensions={extensions} 
        content={initialContent}
        onUpdate={handleUpdate}
        editorProps={{
          handleKeyDown,
        }}
      >
        {error && (
          <div className="error-overlay">
            {error}
          </div>
        )}
      </EditorProvider>
    </div>
  )
}

export default Editor
