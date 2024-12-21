import { AIPredictionResponse } from './types'
import { fuzzyMatchSubstring, longestCommonOverlap } from '../../utils/stringMatch'
import { normalize } from '../../utils/stringMatch'

export const handlePredictionResponse = (
  response: AIPredictionResponse,
  activeSentence: string,
  previousSentence: string,
  setPrediction: (pred: string) => void
) => {

  let newPrediction = response.response.trim().replace(/^"|"$/g, '')
  console.log('NEW_PREDICTION', newPrediction)
  
  if (isPredictionMatchingActiveSentence(newPrediction, activeSentence) ||
      isPredictionMatchingPreviousSentence(newPrediction, previousSentence)) {
    clearPrediction(setPrediction)
    return
  }

  const {bestMatch, newPredictionIndices} = fuzzyMatchSubstring(activeSentence, newPrediction)
  // console.log('BEST_MATCH', bestMatch)
  const overlap = longestCommonOverlap(activeSentence, newPrediction)
  // console.log('OVERLAP', overlap)

  // console.log('BEST_MATCH', bestMatch)
  if (bestMatch && newPredictionIndices && bestMatch !== '') {
      const beforeMatch = newPrediction.slice(0, newPredictionIndices[0])
      const afterMatch = newPrediction.slice(newPredictionIndices[1] + 1)
      
      newPrediction = beforeMatch + afterMatch
      newPrediction = newPrediction.replace(/\s+/g, ' ').trim()
    }
    else if (overlap && overlap !== '') {
      newPrediction = newPrediction.slice(overlap.length)
      // console.log('NEW_PREDICTION', newPrediction)
    }
    else {
      newPrediction = newPrediction
    }

  updatePrediction(newPrediction, setPrediction)
}

const isPredictionMatchingActiveSentence = (
  newPrediction: string,
  activeSentence: string
): boolean => {
  const normNewPrediction = normalize(newPrediction)
  const normActiveSentence = normalize(activeSentence)
  return normNewPrediction === normActiveSentence
}

const isPredictionMatchingPreviousSentence = (
  newPrediction: string, 
  previousSentence: string
): boolean => {
  const normNewPrediction = normalize(newPrediction)
  const normPreviousSentence = normalize(previousSentence)
  return normNewPrediction === normPreviousSentence
}


const clearPrediction = (setPrediction: (pred: string) => void) => {
  setPrediction('')
  ;(window as any).currentPrediction = ''
}

const updatePrediction = (prediction: string, setPrediction: (pred: string) => void) => {
  setPrediction(prediction)
  ;(window as any).currentPrediction = prediction
} 

export const handlePredictionError = (
    error: unknown,
    setPrediction: (pred: string) => void,
    setError: (err: string | null) => void
  ) => {
    if (error instanceof Error) {
      setError(`Error: ${error.message}. Make sure Ollama is running and a model is installed.`)
    } else {
      setError('An unknown error occurred')
    }
    clearPrediction(setPrediction)
  }


