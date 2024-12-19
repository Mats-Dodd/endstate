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

    try {
      setError(null)
      const prompt = createPrompt(contextText)
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

        if (newPrediction && newPrediction.length > 0) {
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
    const typedInSentence = docText.slice(sentenceStart, from).replace(/\s+/g, ' ').trimRight();

    return { activeSentence, typedInSentence };
  };

  const longestCommonPrefix = (a: string, b: string): string => {
    let i = 0;
    const minLen = Math.min(a.length, b.length);
    while (i < minLen && a[i].toLowerCase() === b[i].toLowerCase()) {
      i++;
    }
    return a.slice(0, i);
  };

  const handleKeyDown = useCallback(
    (view: EditorView, event: KeyboardEvent) => {
      if (event.key === 'Tab' && prediction && editorRef.current) {
        event.preventDefault();

        const editor = editorRef.current;
        const { typedInSentence, activeSentence } = getActiveSentenceAndTypedText(editor);

        let typed = typedInSentence.replace(/\s+/g, ' ').trimRight();
        let predicted = prediction.replace(/\s+/g, ' ').trim();

        // If the prediction matches exactly the active sentence, do not insert
        if (predicted.toLowerCase() === activeSentence.toLowerCase()) {
          setPrediction('');
          (window as any).currentPrediction = '';
          return true;
        }

        const prefix = longestCommonPrefix(typed, predicted);
        let remainder = predicted.slice(prefix.length).trimLeft();

        // If no remainder, no insertion needed
        if (!remainder) {
          setPrediction('');
          (window as any).currentPrediction = '';
          return true;
        }

        const typedEndsWithSpace = typed.endsWith(' ');
        const remainderStartsWithSpace = remainder.startsWith(' ');

        // Adjust spacing to avoid double spaces:
        if (typedEndsWithSpace && remainderStartsWithSpace) {
          // Remove extra spaces at the start of remainder
          remainder = remainder.replace(/^ +/, '');
        } else if (!typedEndsWithSpace && !remainderStartsWithSpace) {
          // Add a space to separate words
          remainder = ' ' + remainder;
        }

        const { commands } = editor;
        commands.command(({ tr }) => {
          tr.insertText(remainder, tr.selection.from);
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
