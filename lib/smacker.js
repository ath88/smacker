let _log = console;
_log.fatal = console.error; // ensure we can log fatals

let _config = {
  logJson: process.env.LOGJSON,
  terminateOnMultipleResolves: true,
};

let _service;
let _stopping = false;
let _started = false;

// now, lets handle Node.js internal error-events
function setupTerminationEvents() {
  process.removeAllListeners("uncaughtException");
  process.on("uncaughtException", (exception) => {
    if (_config.logJson) _log.fatal({ error: "uncaughtException", err: exception }, "There was an error")
    else _log.fatal("There was an error: uncaughtException", exception);
    process.exit(1);
  });

  process.removeAllListeners("unhandledRejection");
  process.on("unhandledRejection", (reason) => { // second argument is the promise. for now, it adds no value to the error log, as the error has the same stack trace
    if (_config.logJson) _log.fatal({ error: "unhandledRejection", err: reason }, "There was an error")
    else _log.fatal("There was an error: unhandledRejection", reason);
    process.exit(1);
  });

  process.removeAllListeners("multipleResolves");
  if (_config.terminateOnMultipleResolves) { // not always desireable. look here: https://github.com/nodejs/node/issues/24321
    process.on("multipleResolves", (type, promise, value) => {
      if (_config.logJson) _log.fatal({ error: "multipleResolves", type, promise, value }, "There was an error")
      else {
        _log.fatal("There was an error: multipleResolves");
        _log.fatal("Promise: ", promise);
        _log.fatal(`Promise was ${type.length == 6 ? "resolve" : "rejecte"}d with value: ${JSON.stringify(value)}`);
      }
      process.exit(1);
    });
  }
}

setupTerminationEvents(); // lets do this early, in case we run into trouble before starting

// lets log warning events properly
process.removeAllListeners("warning");
process.on('warning', (warning) => _log.warn(_config.logJson ? { warning: warning.name, message: warning.message } : warning));

// and finally make sure we let the service terminate gracefully on request
const terminate = (signal) => {
  _stopping = true;
  if (_config.logJson) _log.info({ signal }, "Got signal - terminating");
  else _log.info(`Got signal: ${signal} - terminating`);
  let timeout;
  if (_config.gracefulShutdownTimeout) {
    timeout = setTimeout(() => {
      if (_config.logJson) _log.fatal({ signal, gracefulShutdownTimeout: _config.gracefulShutdownTimeout }, "Waited too long for shutdown. Terminating.");
      else _log.fatal(`Waited too long for shutdown. Terminating. (${signal}, ${_config.gracefulShutdownTimeout} ms)`)
      process.exit(1);
    }, _config.gracefulShutdownTimeout);
  }

  const gracefulExit = () => {
    clearTimeout(timeout);
    if (_config.logJson) _log.info({ signal }, "Service terminated gracefully");
    else _log.info(`Service terminated gracefully on ${signal}`);
    process.exit(0);
  }
  if (_started) return _service.stop().then(gracefulExit);
  gracefulExit();
};

process.on("SIGINT", () => terminate("SIGINT"));
process.on("SIGTERM", () => terminate("SIGTERM"));

module.exports = {
  start: async (service, { config, log } = {}) => {
    _service = service;
    if (config) _config = { ..._config, ...config };
    if (log) _log = log;

    setupTerminationEvents(); // we repeat this again, since we now have the configuration from the application
    if (_stopping) return;
    _started = true;
    let timeout;
    if (_config.gracefulStartupTimeout) {
      timeout = setTimeout(() => {
        if (_config.logJson) _log.fatal({ gracefulStartupTimeout: _config.gracefulStartupTimeout }, "Waited too long for startup. Terminating.");
        else _log.fatal(`Waited too long for startup. Terminating. (${_config.gracefulStartupTimeout} ms)`)
        process.exit(1);
      }, _config.gracefulStartupTimeout);
    }
    await _service.start();
    clearTimeout(timeout);

    if (_config.signalHandlers) {
      Object.keys(_config.signalHandlers).forEach((signal) => {
        if (!['SIGUSR2', 'SIGPIPE', 'SIGHUP'].includes(signal)) {
          _log.fatal("Bad signal handler configuration, signal not allowed")
          process.exit(1);
        }
        process.removeAllListeners(signal);
        console.log(signal)
        process.on(signal, _config.signalHandlers[signal]);
      })
    }
  },
  stop: () => terminate("process"),
}
