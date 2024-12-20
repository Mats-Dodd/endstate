export interface AIPredictionOptions {
  model: string;
  temperature: number;
  top_k: number;
  num_predict: number;
  stop: string[];
}

export interface AIPredictionResponse {
  response: string;
}

export interface AIServiceConfig {
  model: string;
  options: AIPredictionOptions;
} 