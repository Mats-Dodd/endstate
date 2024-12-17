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
  this is a <em>basic</em> example of <strong>Tiptap</strong>...
</p>
// ... rest of your content ...
`

const Editor = () => {
  const [prediction, setPrediction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<TiptapEditor | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const createPrompt = (content: string): string => {
    // Get the last few sentences for context (up to ~100 chars)
    const lastChars = content.slice(-100)
    const sentences = lastChars.split(/[.!?]\s+/)
    const lastSentence = sentences[sentences.length - 1]

    // Create a more specific prompt for next word prediction including context
    return `Context: "${lastSentence}"
    Complete the following sentence with the next word only. Respond with just the word, no punctuation or explanation:

Context: "${lastSentence}"
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
      
      // Get the prompt
      const prompt = createPrompt(content)
      
      // Log the input prompt for debugging
      console.log('Input Prompt:', prompt)
      console.log('--------------------------------')

      const response = await ollama.generate({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for more focused predictions
          top_k: 3,
          num_predict: 3,
          stop: ['.', '!', '?', '\n'], // Stop at sentence endings or newlines
        }
      })
      
      if (response.response) {
        // Clean up the response
        const prediction = response.response
          .trim()
          .split(/[\s\n]/)[0] // Take only the first word
          .replace(/[.,!?]$/, '') // Remove any trailing punctuation
        
        // Log the predicted word for debugging
        console.log('Predicted Word:', prediction)

        // Only show prediction if it's a valid word
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

  const handleKeyDown = useCallback((view: EditorView, event: KeyboardEvent) => {
    if (event.key === 'Tab' && prediction && editorRef.current) {
      event.preventDefault()
      // Insert the prediction followed by a space
      editorRef.current.commands.insertContent(`${prediction} `) // Add a space after the prediction
      setPrediction('')
      return true // Indicate that we've handled the event
    }
    return false // Let other handlers process the event
  }, [prediction])

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