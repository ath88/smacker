let xConsole = console;
xConsole.fatal = console.error; // ensure we can log fatals

let application, config = {}, log = xConsole;

// now, lets handle Node.js internal error-events
let events = ["uncaughtException", "unhandledRejection", "multipleResolves"];

events.forEach((event) => {
  process.on(event, (exception) => {
    const msg = { error: event, exception }
    log.fatal(`There was an error: ${event}`, config.logJson ? { msg } : msg);
    process.exit(1);
  })
})

// lets log warning events properly
process.removeAllListeners("warning");
process.on('warning', (warning) => log.warn(config.logJson ? { warning } : warning));

// and finally make sure we let the application terminate gracefully on request
const terminate = () => {
  application.stop().then(() => {
    log.info("Service terminated gracefully");
    process.exit(0);
  });
};

process.on("SIGINT", terminate);
process.on("SIGTERM", terminate);

// returned 'object'. we are faking this to allow error handlers access to the log- and config-objects
module.exports = {
  start: async (iApplication, iConfig = { }, iLog = xConsole) => {
    application = iApplication;
    config = iConfig;
    log = iLog;
    await application.start();
  },
  stop: async () => {
    await application.stop();
  }
}
