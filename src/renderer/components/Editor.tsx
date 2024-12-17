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

  const createPrompt = (content: string): string => {
    const lastChars = content.slice(-100)
    const sentences = lastChars.split(/[.!?]\s+/)
    const lastSentence = sentences[sentences.length - 1]

    return `Context: ${lastSentence}
    You are an expert writing assistant. You are given a sentence and you need to predict the next word and or complete the sentence as you would when writing. 
    
    It is up to you to determine if you should predict the next word or complete the sentence.  You should respond with just the sentence, make sure to include punctuation if you think it is needed.  

    Ensure that your response is grammatically correct and coherent.

    Ensure that if your response is the end of a sentance you have included punctuation.

    Do not include qutoations or any other formatting.

Context: ${lastSentence}
Next word:`
  }

  const getPrediction = async (content: string) => {
    
    const model = 'llama3.2:3b'

    console.log('Getting prediction for content:', content)
    console.log('--------------------------------')
    console.log('--------------------------------')
    console.log('Model:', model)
    try {
      setError(null)
      
      const prompt = createPrompt(content)
      
      console.log('Input Prompt:', prompt)
      console.log('--------------------------------')

      const response = await ollama.generate({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3, 
          top_k: 10,
          num_predict: 10,
          stop: ['.', '!', '?', '\n'], 
        }
      })
      
      if (response.response) {
  
        const prediction = response.response
          .trim()
          .replace(/^"|"$/g, '');
        
        console.log('Predicted Sentence:', prediction);

        if (prediction && prediction.length > 0) {
          setPrediction(prediction)
        }
      }
    } catch (error) {
      console.error('Prediction error:', error)
      if (error instanceof Error) {
        setError(`Error: ${error.message}. Make sure Ollama is running and a model is installed.`)
      } else {
        setError('An unknown error occurred')
      }
      setPrediction('')
    }
  }

  const handleUpdate = useCallback(({ editor }: { editor: TiptapEditor }) => {
    editorRef.current = editor
    const content = editor.getText()
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Don't predict if we're at the end of a sentence
    if (!content || 
        content.length < 5 || 
        content.trim().endsWith('.') || 
        content.trim().endsWith('!') || 
        content.trim().endsWith('?')) {
      setPrediction('')
      return
    }
    
    timeoutRef.current = setTimeout(() => {
      getPrediction(content)
    }, 500)
  }, [])

  const handleKeyDown = useCallback(
    (view: EditorView, event: KeyboardEvent) => {
      if (event.key === 'Tab' && prediction && editorRef.current) {
        event.preventDefault()

        const { state, commands } = editorRef.current
        const { from } = state.selection

        // Get text before the cursor
        const textBeforeCursor = state.doc.textBetween(0, from, '\n', ' ')

        // Use regex to find the last word (partial word)
        const match = /(?:^|\s)(\S+)$/.exec(textBeforeCursor)

        if (match) {
          const word = match[1]
          const wordStart = from - word.length

          // Replace partial word with the full predicted sentence
          commands.command(({ tr }) => {
            tr.insertText(prediction + ' ', wordStart, from)
            return true
          })

          setPrediction('')
          return true
        } else {
          // If no partial word is found, simply insert the prediction
          commands.command(({ tr }) => {
            tr.insertText(prediction + ' ', from);
            return true;
          });
          setPrediction('');
          return true;
        }
      }
      return false
    },
    [prediction]
  )

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