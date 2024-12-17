import { Color } from '@tiptap/extension-color'
import ListItem from '@tiptap/extension-list-item'
import TextStyle from '@tiptap/extension-text-style'
import { EditorProvider, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Editor as TiptapEditor } from '@tiptap/core'
import MenuBar from './MenuBar'
import { useCallback, useState, useRef } from 'react'
import ollama from 'ollama'
import { EditorView } from 'prosemirror-view'

const extensions = [
  Color,
  TextStyle,
  ListItem,
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
<h2>
  Hi there,
</h2>
<p>
  What will you write?
</p>

`

const Editor = () => {
  const [prediction, setPrediction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<TiptapEditor | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  

  const createPrompt = (contextText: string): string => {
    return `You are an expert writing assistant. Based on the text provided, continue writing in a coherent and grammatically correct manner. Start writing from the <CURSOR> tag. Only respond with the continuation of the sentence. 

    ONLY RESPOND WITH THE CONTINUATION OF THE SENTENCE.
    
    Do not include any formatting or quotes in your response.

    Be short, concise, and to the point.

    Make sure to write in the same style as the text provided.

    Ensure that you write grammatically correct and coherent sentences.

Text: "${contextText}"
Continuation:`;
  }

  const getPrediction = async (contextText: string) => {
    const model = 'llama3.2:3b'

    try {
      setError(null)
      console.log('Context:', contextText)
      console.log('--------------------------------')
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
        const prediction = response.response
          .trim()
          .replace(/^"|"$/g, '')

        console.log('Prediction:', prediction)
        console.log('--------------------------------')

        if (prediction && prediction.length > 0) {
          setPrediction(prediction)
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(`Error: ${error.message}. Make sure Ollama is running and a model is installed.`)
      } else {
        setError('An unknown error occurred')
      }
      setPrediction('')
    }
  }

  const handleUpdate = useCallback(({ editor }: { editor: TiptapEditor }) => {
    editorRef.current = editor;
    const state = editor.state;
    const { from } = state.selection;

    const contextRange = 500; // Number of characters before and after the cursor
    const docSize = state.doc.content.size;

    // Calculate start and end positions for extracting context
    const startPos = Math.max(0, from - contextRange);
    const endPos = Math.min(docSize, from + contextRange);

    // Extract text before and after the cursor
    const textBeforeCursor = state.doc.textBetween(startPos, from, '\n', ' ');
    const textAfterCursor = state.doc.textBetween(from, endPos, '\n', ' ');

    // Insert the cursor marker
    const contextText = `${textBeforeCursor}<CURSOR>${textAfterCursor}`;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Conditions to decide whether to predict
    if (
      !textBeforeCursor ||
      textBeforeCursor.length < 5 ||
      /[.!?]\s*$/.test(textBeforeCursor.trim())
    ) {
      setPrediction('');
      return;
    }

    timeoutRef.current = setTimeout(() => {
      getPrediction(contextText); // Pass the context with the cursor marker
    }, 500);
  }, []);

  const handleKeyDown = useCallback(
    (view: EditorView, event: KeyboardEvent) => {
      if (event.key === 'Tab' && prediction && editorRef.current) {
        event.preventDefault();

        const { state, commands } = editorRef.current;
        const { from } = state.selection;

        // Get text before the cursor
        const textBeforeCursor = state.doc.textBetween(0, from, '\n', ' ');

        // Use regex to find the last word before the cursor
        const lastWordMatch = /(\S+)\s*$/.exec(textBeforeCursor);
        const lastWord = lastWordMatch ? lastWordMatch[1] : '';

        // Get the first word of the prediction
        const firstWordMatch = /^\s*(\S+)/.exec(prediction);
        const firstWord = firstWordMatch ? firstWordMatch[1] : '';

        let adjustedPrediction = prediction;

        // If the last word before the cursor matches the first word of prediction, remove the duplication
        if (lastWord && firstWord && lastWord.toLowerCase() === firstWord.toLowerCase()) {
          // Remove the first word from the prediction
          adjustedPrediction = prediction.slice(firstWord.length).trimStart();
        }

        // Insert adjusted prediction at the cursor position
        commands.command(({ tr }) => {
          tr.insertText(adjustedPrediction + ' ', from);
          return true;
        });

        setPrediction('');
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
        {prediction && (
          <div className="prediction-overlay">
            Press Tab to accept: {prediction}
          </div>
        )}
      </EditorProvider>
    </div>
  )
}

export default Editor 