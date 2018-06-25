Atom Golang IDE
===============

An Atom IDE package for Go, powered by Sourcegraph's [go-langserver](https://github.com/sourcegraph/go-langserver).

## But why this one?
This package does not leverage (though recognizes the greatness of) the
[go-plus](https://github.com/joefitzgerald/go-plus) package. It purely uses
Sourcegraph's Go Langserver for it's functionality. It also integrates with
the latest features of the Atom IDE.

## Installation
This package requires the [atom-ide-ui](https://atom.io/packages/atom-ide-ui)
package to be installed to expose the functionality within Atom.

The language server will be installed on first startup and updated if an update is available.

## Features
- Auto Completion
- Document outline
- Go to definition
- Hover
- Find references
- Code formatting

## Early Access
This package is still in the early stages of development, be sure to post
any bugs you (or feature requests) to the Github issues page.

### Todo
*In no particular order*
- [ ] Find a (clean) way to install specific versions of the langserver
- [ ] Add a way to run tests, sending the output to the console
- [ ] Add a logger, use the IDE console
- [ ] Integrate Delve for debugging
- [ ] Create custom task runner to use ts-node & tape
- [ ] Figure out why local var/keyword completion doesn't work (has something to do with language server?)
- [ ] Make go install path check work with Windows

## License
MIT License. See [LICENSE](./LICENSE) for more information.
