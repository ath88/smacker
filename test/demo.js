const smacker = require("../lib/smacker.js");

const Application = function constructor() {
  const state = { };

  let timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // emit a warning
  if (process.argv[3] === "warn") process.emitWarning("This is a test warning");

  // provoke an uncaught exception
  if (process.argv[3] === "uncaughtException") throw new Error();

  // provoke an unhandled promise rejection
  if (process.argv[3] === "unhandledRejection") new Promise((res, rej) => rej());

  // provoke a multiple resolves, only supported after Node.js 10.12.0
  if (process.argv[3] === "multipleResolves") new Promise((res, rej) => [res(), res()]);

  return {
    start: async () => {
      console.log("Started, logging every 100 milliseconds");
      state.interval = setInterval(() => console.log(new Date()), 100);
    },
    stop: async () => {
      clearInterval(state.interval);
      console.log("Stopping in 100 milliseconds");
      await timeout(100);
      console.log("Stopped");
    }
  };
}

const application = new Application();
if (process.argv[2] === "stop") return;
smacker.start(application)
