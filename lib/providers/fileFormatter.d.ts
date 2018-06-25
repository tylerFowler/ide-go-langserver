import { TextEditor, Range } from 'atom';
import { GoLanguageClient } from '../main';
import { LanguageClientConnection } from 'atom-languageclient';

// the response to be produced by a FileCodeFormatProvider
// back to Atom IDE, type stolen from here:
// https://github.com/facebook-atom/atom-ide-ui/blob/master/modules/atom-ide-ui/pkg/atom-ide-code-format/lib/types.js#L54
export type FileCodeFormatResponse = {
  newCursor?: number,
  formatted: string
};

// a provider that can be used by GoLanguageClient to format Go files
export interface FileFormatProvider {
  format(editor: TextEditor, conn: LanguageClientConnection|null): Promise<FileCodeFormatResponse>
}
