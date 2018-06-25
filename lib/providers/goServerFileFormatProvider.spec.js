import suite from 'tape';
import GoServerFileFormatProvider from './goServerFileFormatProvider';

const newFormatter = () => new GoServerFileFormatProvider();

class TextEditorMock {
  constructor(path = '', text = '') {
    this.path = path;
    this.text = text;
  }

  getTitle() { return this.path; }
  getText() { return this.text; }
}

suite('GoServerFileFormatProvider', st => {
  st.test('throws when no connection is provided', t => {
    t.plan(1);
    newFormatter().format(new TextEditorMock(), null)
      .then(() => t.fail('Formatter should not have continued'))
      .catch(e => t.ok(e));
  });
});
