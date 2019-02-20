let xConsole = console;
xConsole.fatal = console.error; // ensure we can log fatals

let application, config = {}, log = xConsole;

// now, lets handle Node.js internal error-events
process.on("uncaughtException", (exception) => {
  if (config.logJson) log.fatal("There was an error", { error: "uncaughtException", exception } )
  else log.fatal("There was an error: uncaughtException", exception);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => { // second argument is the promise. for now, it adds no value to the error log
  if (config.logJson) log.fatal("There was an error", { error: "unhandledRejection", reason } )
  else log.fatal("There was an error: unhandledRejection", reason);
  process.exit(1);
});

process.on("multipleResolves", (type, promise, value) => {
  if (config.logJson) log.fatal("There was an error", { error: "multipleResolves", type, promise, value })
  else {
    log.fatal("There was an error: multipleResolves");
    log.fatal("Promise:", promise);
    log.fatal(`Promise was ${type.length == 6 ? "resolve" : "rejecte"}d with value: ${JSON.stringify(value)}`);
  }
  process.exit(1);
});

// lets log warning events properly
process.removeAllListeners("warning");
process.on('warning', (warning) => log.warn(config.logJson ? { warning } : warning));

// and finally make sure we let the application terminate gracefully on request
const terminate = (signal) => {
  application.stop().then(() => {
    if (config.logJson) log.info("Service terminated gracefully", { signal });
    else log.info(`Service terminated gracefully on ${signal}`);
    process.exit(0);
  });
};

process.on("SIGINT", () => terminate("SIGINT"));
process.on("SIGTERM", () => terminate("SIGTERM"));
process.on("SIGUSR2", () => terminate("SIGUSR2"));

// returned 'object'. we are faking this to allow error handlers access to the log- and config-objects
module.exports = {
  start: async (iApplication, iConfig = { logJson: process.env.LOGJSON }, iLog = xConsole) => {
    application = iApplication;
    config = iConfig;
    log = iLog;
    await application.start();
  },
  stop: async () => {
    await application.stop();
  }
}
