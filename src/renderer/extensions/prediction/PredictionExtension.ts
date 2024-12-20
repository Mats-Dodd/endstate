import { Extension } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const PredictionExtension = Extension.create({
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