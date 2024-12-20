export interface AIPredictionResponse {
  response: string;
}

export interface AutoCompletionConfig {
  model: string;
}

export interface PredictionHandlers {
  handlePredictionResponse: (
    response: AIPredictionResponse,
    activeSentence: string,
    previousSentence: string,
    setPrediction: (pred: string) => void
  ) => void;
  handlePredictionError: (
    error: unknown,
    setPrediction: (pred: string) => void,
    setError: (err: string | null) => void
  ) => void;
}