import { longestCommonOverlap } from '../../utils/overlap'
import { AIPredictionResponse } from './types'

export const handlePredictionResponse = (
  response: AIPredictionResponse,
  activeSentence: string,
  previousSentence: string,
  setPrediction: (pred: string) => void
) => {

  const newPrediction = response.response.trim().replace(/^"|"$/g, '')
  
  if (isPredictionMatchingActiveSentence(newPrediction, activeSentence) ||
      isPredictionMatchingPreviousSentence(newPrediction, previousSentence)) {
    clearPrediction(setPrediction)
    return
  }

  const remainder = longestCommonOverlap(activeSentence, newPrediction)
  updatePrediction(remainder.length > 0 ? remainder : newPrediction, setPrediction)
}

const isPredictionMatchingActiveSentence = (
  newPrediction: string,
  activeSentence: string
): boolean => {
  return newPrediction.toLowerCase() === activeSentence.toLowerCase()
}

const isPredictionMatchingPreviousSentence = (
  newPrediction: string, 
  previousSentence: string
): boolean => {
  return newPrediction.toLowerCase() === previousSentence.toLowerCase()
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