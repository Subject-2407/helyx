/** Entry point: runs the guard with this process's arguments and folder. */
import { runCli } from './run-cli';

process.exitCode = runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  writeError: (text) => process.stderr.write(text),
});
