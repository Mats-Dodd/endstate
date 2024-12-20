import { Editor as TiptapEditor } from '@tiptap/core'
import { EditorView } from 'prosemirror-view'

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
  getActiveSentenceAndTypedText: (editor: TiptapEditor) => {
    activeSentence: string;
    typedInSentence: string;
  };
  getPreviousSentence: (editor: TiptapEditor, currentSentenceStart: number) => string;
} 