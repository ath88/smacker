const assert = require("assert");
const { spawnSync, spawn } = require("child_process");
const semver = require("semver");

describe("smacker", () => {
  it("logs an emitted warning", function () {
    const result = spawnSync("node", ["./test/demo.js", "stop", "warn"]);
    assert(result.output[2].includes("warning"));
  });

  const events = ["uncaughtException", "unhandledRejection", "multipleResolves"];

  events.forEach((event) => {
    it(`logs and teminates on ${event}`, function () {
      if (semver.lt(process.version, "v10.12.0") && event === "multipleResolves") this.skip("Only works on >= v10.12.0");

      const result = spawnSync("node", ["./test/demo.js", "stop", event]);
      assert(result.output[2].includes(event));
    });
  })

  const terminationSignals = ["SIGTERM", "SIGINT", "SIGUSR2"]

  terminationSignals.forEach((signal) => {
    let attempt = 0;
    it(`can stop gracefully on ${signal}`, function () {
      attempt++;
      this.retries(5); // timing on slow computers can make this test require more setup-time

      const proc = spawn("node", ["./test/demo.js", "run"]);
      setTimeout(() => proc.kill(signal), 50 * attempt); // wait for the process to setup signal handlers

      return new Promise((resolve, reject) => {
        proc.once("exit", (code, signal) => {
          if (code === 0) return resolve();
          reject();
        });
      });
    });
  });

  let attempt = 0;
  it("terminates forcefully after waiting for graceful shutdown", function() {
    attempt++;
    this.retries(5); // timing on slow computers can make this test require more setup-time

    const proc = spawn("node", ["./test/demo.js", "run", "nonGracefulShutdown"]);

    let stderr = "";
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    setTimeout(() => proc.kill('SIGINT'), 50 * attempt); // wait for the process to setup signal handlers

    return new Promise((resolve, reject) => {
      proc.once("close", (code, signal) => {
        if (!stderr.includes("Waited too long for shutdown.")) return reject();
        if (code === 0) return reject();
        resolve();
      });
    });
  });

  it("executes custom function on SIGHUP");
});
