import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

/** An HTTP server that is listening. */
export interface RunningHttpServer {
  /** The port actually bound, which differs from the requested one when that was 0. */
  readonly port: number;
  close(): Promise<void>;
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
    server.closeIdleConnections();
  });
}

/** Starts listening on the given port; resolves once the port is bound. */
export function listen(handler: RequestListener, port: number): Promise<RunningHttpServer> {
  const server = createServer(handler);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      const address = server.address() as AddressInfo;
      resolve({ port: address.port, close: () => closeServer(server) });
    });
  });
}
