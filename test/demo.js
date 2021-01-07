const smacker = require("../lib/smacker.js");
let timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const Service = function constructor() {
  const state = { };

  // provoke an uncaught exception
  if (process.argv[3] === "uncaughtException") setTimeout(() => { throw new Error("uncaught exception") }, 100);

  return {
    start: async () => {
      // emit a warning
      if (process.argv[3] === "warn") process.emitWarning("This is a test warning");

      // provoke an unhandled promise rejection
      if (process.argv[3] === "unhandledRejection") new Promise((res, rej) => rej(new Error("unhandled rejection")));

      // provoke a multiple resolves, only supported after Node.js 10.12.0
      if (process.argv[3] === "multipleResolves") new Promise((res, rej) => [rej("resolve 1"), rej("resolve 2")]);

      console.log(`[PID: ${process.pid}] Started, logging every 100 milliseconds`);
      state.interval = setInterval(() => console.log(new Date()), 100);

      await timeout(20);
    },
    stop: async () => {
      clearInterval(state.interval);
      console.log("Stopping in 100 milliseconds");
      await timeout(100);
      console.log("Stopped");
    }
  };
}

const config = {
  gracefulShutdownTimeout: (process.argv[3] === "nonGracefulShutdown") ? 10 : null,
  gracefulStartupTimeout: (process.argv[3] === "nonGracefulStartup") ? 10 : null,
};

const customSignals = ["SIGHUP", "SIGPIPE", "SIGUSR2"];
if (customSignals.includes(process.argv[3])) {
  const signal = process.argv[3];
  config.signalHandlers = { [signal]: () => console.log(`${signal} signal received.`) };
}

const service = new Service();
smacker.start(service, { config })
if (process.argv[2] === "stop") smacker.stop();
