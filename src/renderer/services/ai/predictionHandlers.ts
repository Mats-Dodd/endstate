import { AIPredictionResponse } from './types'
import { fuzzyMatchSubstring } from '../../utils/stringMatch'
import { normalize } from '../../utils/stringMatch'

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

  const {bestMatch, activeSentenceIndices, newPredictionIndices} = fuzzyMatchSubstring(activeSentence, newPrediction)
  // console.log('ACTIVE_SENTENCE', activeSentence)
  // console.log('NEW_PREDICTION', newPrediction)
  // console.log('FUZZY_MATCH', bestMatch)
  // console.log('ACTIVE_SENTENCE_INDICES', activeSentenceIndices)
  // console.log('NEW_PREDICTION_INDICES', newPredictionIndices)

  updatePrediction(newPrediction, setPrediction)
}

const isPredictionMatchingActiveSentence = (
  newPrediction: string,
  activeSentence: string
): boolean => {
  const normNewPrediction = normalize(newPrediction)
  const normActiveSentence = normalize(activeSentence)
  console.log('NEW_PREDICTION', normNewPrediction)
  console.log('ACTIVE_SENTENCE', normActiveSentence)
  return normNewPrediction === normActiveSentence
}

const isPredictionMatchingPreviousSentence = (
  newPrediction: string, 
  previousSentence: string
): boolean => {
  const normNewPrediction = normalize(newPrediction)
  const normPreviousSentence = normalize(previousSentence)
  console.log('NEW_PREDICTION', normNewPrediction)
  console.log('PREVIOUS_SENTENCE', normPreviousSentence)
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