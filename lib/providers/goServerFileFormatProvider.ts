import { FileFormatProvider, FileCodeFormatResponse } from './fileFormatter';
import { TextEditor, Range } from 'atom';
import { LanguageClientConnection, Convert } from 'atom-languageclient';
import { FormattingOptions } from 'vscode-languageserver-protocol/lib/main';

// A file code format provider that is adapted to the go-langserver implementation.
// The default functionality currently (as of go-langserver v1.0.0) *cannot* be
// used because currently the server cannot provide a single range, instead it will
// provide two ranges: the first from the start to the end of the file with it's
// contents emptied out, then a second range from the beginning of the file containing
// the full file content. Essentially it only knows how to rewrite the entire file but
// the range edit application function (from nuclide-commons) does not allow overlapping
// range edits.
//
// So for now we must pretend like go-langserver's response to range edits are actually
// full file edits. See this issue for discussion on a change in the language server
// that would allow Atom's default functionality to work:
// https://github.com/sourcegraph/go-langserver/issues/281
export default class GoServerFileFormatProvider implements FileFormatProvider {
  public format(editor: TextEditor, conn: LanguageClientConnection|null): Promise<FileCodeFormatResponse> {
    if (!conn) return Promise.reject(new Error(
      `Cannot format code, no connection received for editor ${editor.getTitle()}`
    ));

    return conn.documentFormatting({
      textDocument: Convert.editorToTextDocumentIdentifier(editor),
      options: GoServerFileFormatProvider.getFormatOptions(editor)
    })
    .then(edits => {
      if (!edits)
        return { formatted: editor.getText() };

      const [ clearEdit, fmtEdit ] = edits;
      if (clearEdit  && clearEdit.newText !== '') {
        console.debug(
          'Received unexpected edit format, should use Range formatter instead',
          edits
        );
        return { formatted: editor.getText() };
      }

      return {
        formatted: fmtEdit ? fmtEdit.newText : editor.getText()
      };
    });
  }

  private static getFormatOptions(editor: TextEditor): FormattingOptions {
    return {
      tabSize: editor.getTabLength(),
      insertSpaces: editor.getSoftTabs()
    };
  }
}