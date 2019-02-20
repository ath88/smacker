let _log = console;
_log.fatal = console.error; // ensure we can log fatals

let _service, _config = { logJson: process.env.LOGJSON, terminateOnMultipleResolves: true };

// now, lets handle Node.js internal error-events
function setupTerminationEvents() {
  process.removeAllListeners("uncaughtException");
  process.on("uncaughtException", (exception) => {
    if (_config.logJson) _log.fatal("There was an error", { error: "uncaughtException", exception } )
    else _log.fatal("There was an error: uncaughtException", exception);
    process.exit(1);
  });

  process.removeAllListeners("unhandledRejection");
  process.on("unhandledRejection", (reason) => { // second argument is the promise. for now, it adds no value to the error log
    if (_config.logJson) _log.fatal("There was an error", { error: "unhandledRejection", reason } )
    else _log.fatal("There was an error: unhandledRejection", reason);
    process.exit(1);
  });

  process.removeAllListeners("multipleResolves");
  if (_config.terminateOnMultipleResolves) {
    process.on("multipleResolves", (type, promise, value) => {
      if (_config.logJson) _log.fatal("There was an error", { error: "multipleResolves", type, promise, value })
      else {
        _log.fatal("There was an error: multipleResolves");
        _log.fatal("Promise:", promise);
        _log.fatal(`Promise was ${type.length == 6 ? "resolve" : "rejecte"}d with value: ${JSON.stringify(value)}`);
      }
      process.exit(1);
    });
  }
}

setupTerminationEvents(); // lets do this early, in case we run into trouble before starting

// lets log warning events properly
process.removeAllListeners("warning");
process.on('warning', (warning) => _log.warn(_config.logJson ? { warning } : warning));

// and finally make sure we let the service terminate gracefully on request
const terminate = (signal) => {
  _service.stop().then(() => {
    if (_config.logJson) _log.info("Service terminated gracefully", { signal });
    else _log.info(`Service terminated gracefully on ${signal}`);
    process.exit(0);
  });
};

process.on("SIGINT", () => terminate("SIGINT"));
process.on("SIGTERM", () => terminate("SIGTERM"));
process.on("SIGUSR2", () => terminate("SIGUSR2"));

// returned 'object'. we are faking this to allow error handlers access to the log- and config-objects
module.exports = {
  start: async ({ service, config, log }) => {
    _service = service;
    if (config) _config = config;
    if (log) _log = log;

    setupTerminationEvents();
    await _service.start();
  },
  stop: async () => {
    await _service.stop();
  }
}
