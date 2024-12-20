import { Editor as TiptapEditor } from '@tiptap/core'

export interface EditorContexts {
  previousContext: string;
  currentSentence: string;
  followingContext: string;
}

export interface EditorState {
  prediction: string;
  error: string | null;
}

export interface EditorHelpers {
  getActiveSentance: (editor: TiptapEditor) => string;
  getPreviousSentence: (editor: TiptapEditor) => string;
  getDocText: (editor: TiptapEditor) => string;
} 