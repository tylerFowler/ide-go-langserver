import ChildProcess from 'child_process';
import Path from 'path';
import { AutoLanguageClient, LanguageServerProcess } from 'atom-languageclient';
import { Notifier, AtomNotifier } from './atom-notifier';
import { BusyMessage } from 'atom-ide';

export class GoCommandError extends Error {
  public exitCode: number|undefined;
  public output: string|undefined;
  public args: Array<string>;

  constructor(msg: string, args: Array<string> = [], output?: string, exitCode?: number) {
    super(msg);

    this.args = args;
    this.output = output;
    this.exitCode = exitCode;
  }
}

export class GoLanguageClient extends AutoLanguageClient {
  private notifier: Notifier;
  private hasUpdatedServer: boolean = false;

  static get grammarScopes() { return [ 'source.go', 'go' ]; }
  getGrammarScopes() { return GoLanguageClient.grammarScopes; }
  getLanguageName() { return 'Go'; }
  getServerName() { return 'SourceGraph'; }

  constructor() {
    super();
    this.notifier = new AtomNotifier();
  }

  startServerProcess(): Promise<LanguageServerProcess> {
    this.updateStartupStatus('Starting Go Langserver...');

    return Promise.resolve()
      .then(() => this.updateStartupStatus('Checking for Go installation'))
      .then(() => {
        if (!this.goCommand)
          return Promise.reject(`No valid Go installation found, aborting...`);

        return this.isGoInstalled();
      })
      .then(isInstalled => {
        if (isInstalled)
          return Promise.resolve();

        return Promise.reject(new Error(`Unable to use Go installation found at ${this.goCommand}, aborting...`));
      })
      .then(() => {
        this.updateStartupStatus('Installing/Updating go-langserver');

        // ensure that we only actually install/check for updates once,
        // this will be called multiple times to restart the server
        if (!this.hasUpdatedServer)
          this.installOrUpdateGoLangserver().then(() => this.hasUpdatedServer = true);
      })
      .then(() => {
        this.updateStartupStatus('Starting Go Langserver');

        const serverPath = Path.join(this.goPath || '', '/bin/go-langserver');
        const server = ChildProcess.spawn(serverPath, [ '-mode=stdio', '-gocodecompletion' ]);
        this.updateStartupStatus('Go Langserver started', true);

        return server;
      })
      .catch(error => {
        this.notifier.error('An error occurred while setting up Go Langserver', {
          detail: error.message ? error.message : error,
          stack: error.stack
        });

        this.updateStartupStatus('Could not start Go Langserver', true);
        return Promise.reject(error); // ensure the parent class can know this failed
      });
  }

  isGoInstalled(): Promise<boolean> {
    return this.queryGoVersion()
      .then(version => {
        // TODO until we can figure out why this fails sometimes
        console.log('Checked go version, got back', version);
        return !!version
      })
      .catch(error => {
        console.log('Checking go version produced error:', error);
        if (error.code && error.code === 'ENOENT') 
          return Promise.resolve(false);

        return Promise.reject(error);
      });
  }

  queryGoVersion(): Promise<string|null> {
    return this.runGoCmd([ 'version' ]);
  }

  /**
   * @name installOrUpdateGoLangserver
   * @desc If an installation of go-langserver is not found then the latest will be installed,
   *  otherwise go-langserver will be updated to the latest version.
   * @todo install a specific version, would require us to go fiddle with git commands
   * so I'm not too psyched about it
   */
  installOrUpdateGoLangserver(): Promise<void> {
    return this.runGoCmd([ 'get', '-u', '-v', 'github.com/sourcegraph/go-langserver' ])
      .then(() => {})
      .catch((cmdErr: GoCommandError) => {
        this.notifier.error(`Error installing go-langserver\n${cmdErr.output}`);
        throw cmdErr;
      });
  }

  runGoCmd(args: Array<string>): Promise<string> {
    return new Promise((resolve, reject) => {
      const guardedReject = (() => {
        let hasRejected = false;
        return reason => {
          if (!hasRejected) {
            hasRejected = true;
            reject(reason);
          }
        };
      })();

      try {
        const proc = ChildProcess.spawn(this.goCommand, args, {
          env: { GOPATH: this.goPath, PATH: process.env.PATH },
        });

        let cmdOutput = '';
        if (proc.stdout)
          proc.stdout.on('data', chunk => cmdOutput += chunk.toString());
        
        if (proc.stderr)
          proc.stderr.on('data', chunk => cmdOutput += chunk.toString());

        proc.on('error', error =>
          guardedReject(new GoCommandError(error.message, args, cmdOutput.trim()))
        );

        proc.on('exit', exitCode => {
          if (exitCode !== 0) {
            console.error(`Running command ${this.goCommand} ${args.join(' ')} returned ` +
              `nonzero exit code ${exitCode} with output: ${cmdOutput}`);
            guardedReject(new GoCommandError(`Go command exited with code ${exitCode}`,
              args, cmdOutput.trim(), exitCode));
          } else {
            resolve(cmdOutput.trim());
          }
        });
      } catch (error) {
        console.error(`Error occurred while trying to spawn command '${this.goCommand} ${args}'`, error);
        guardedReject(error);
      }
    });
  }

  private startupStatus: BusyMessage | undefined;
  updateStartupStatus(status: string, shouldDispose: boolean = false) {
    if (this.busySignalService) {
      if (!this.startupStatus)
        this.startupStatus = this.busySignalService.reportBusy('Go Langserver Startup', {
          // @ts-ignore revealTooltip isn't added to the type file from Atom yet
          revealTooltip: true
        });
      
      this.startupStatus.setTitle(status);
    }

    if (shouldDispose && this.startupStatus) {
      this.startupStatus.dispose();
      this.startupStatus = undefined;
    }
  }

  private _goCommand: string = '/usr/local/bin/go';
  get goCommand(): string {
    const fromConfig = atom.config.get('ide-go-langserver.goCommand')
    if (!this._goCommand && fromConfig) {
      this._goCommand = fromConfig;
    } else if (!this._goCommand) {
      const cp = ChildProcess.spawnSync('which', [ 'go' ], { env: { PATH: process.env['PATH'] }});

      if (cp.status > 0) {
        console.error(`Trying to get Go command using command 'which go' but received status code ${cp.status}\n` +
          `stdout: ${cp.stdout.toString()}\nstderr: ${cp.stderr.toString()}`);

        throw new Error('Unknown error occurred while getting Go command path');
      }

      const goPath = cp.stdout.toString().trimRight();
      this._goCommand = goPath;
    }

    return this._goCommand;
  }

  get goRoot(): string | undefined {
    const fromConfig = atom.config.get('ide-go-langserver.goRoot');
    if (fromConfig)
      return fromConfig

    return process.env['GOROOT'];
  }

  get goPath(): string | undefined {
    const fromConfig = atom.config.get('ide-go-langserver.goPath');
    if (fromConfig)
      return fromConfig;

    return process.env['GOPATH'];
  }
}

const langClient = new GoLanguageClient();
export default langClient;
module.exports = langClient;
