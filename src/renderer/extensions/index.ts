import { PredictionExtension } from './prediction/PredictionExtension'
import { EDITOR_EXTENSIONS } from '../constants/editor'

export const extensions = [
  ...EDITOR_EXTENSIONS,
  PredictionExtension,
] 