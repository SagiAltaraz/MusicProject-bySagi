const { spawn } = require("child_process");
const { SPAWN_ENV } = require("../../utils/binaries");

/**
 * Run a command, collecting stdout/stderr. Rejects with err.stderr on non-zero
 * exit; kills the child when the AbortSignal fires.
 * @param {{signal?: AbortSignal, onStdoutLine?: Function, onStderrLine?: Function, binaryStdout?: boolean}} opts
 */
const run = (bin, args, opts = {}) => new Promise((resolve, reject) => {
    const child = spawn(bin, args, { env: SPAWN_ENV });
    const out = [];
    let stderr = "";
    let lineBuf = "";
    let errBuf = "";

    const onAbort = () => child.kill("SIGKILL");
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout.on("data", (chunk) => {
        if (opts.binaryStdout) return out.push(chunk);
        const text = chunk.toString();
        out.push(text);
        if (!opts.onStdoutLine) return;
        lineBuf += text;
        const lines = lineBuf.split(/\r?\n/);
        lineBuf = lines.pop();
        lines.forEach(opts.onStdoutLine);
    });
    child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        // Keep the tail only - ffmpeg can be chatty on long files
        stderr = (stderr + text).slice(-20000);
        if (!opts.onStderrLine) return;
        errBuf += text;
        const lines = errBuf.split(/\r?\n/);
        errBuf = lines.pop();
        lines.forEach(opts.onStderrLine);
    });
    child.on("error", (err) => {
        opts.signal?.removeEventListener("abort", onAbort);
        reject(err);
    });
    child.on("close", (code) => {
        opts.signal?.removeEventListener("abort", onAbort);
        if (opts.signal?.aborted) {
            const err = new Error("Cancelled");
            err.cancelled = true;
            return reject(err);
        }
        const stdout = opts.binaryStdout ? Buffer.concat(out) : out.join("");
        if (code === 0) return resolve({ stdout, stderr });
        const err = new Error(`${bin} exited with code ${code}`);
        err.stderr = stderr;
        err.code = code;
        reject(err);
    });
});

module.exports = { run };
