import http from "node:http";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createProxyMiddleware, type RequestHandler } from "http-proxy-middleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const isProd = process.env["NODE_ENV"] === "production";

// Local SpacetimeDB standalone server (dev only).
const STDB_HOST = "127.0.0.1";
const STDB_PORT = 3000;

/**
 * Dev-only reverse proxy to a locally running SpacetimeDB standalone server.
 *
 * The browser SpacetimeDB SDK connects to `<origin>/stdb`, which the shared
 * Replit proxy routes to this API server. We strip the `/stdb` prefix and
 * forward to the local SpacetimeDB instance. HTTP requests go through
 * http-proxy-middleware; the WebSocket upgrade is handled by
 * `handleStdbUpgrade` (wired in index.ts) using Node's built-in http client,
 * which is reliable and bundler-safe. In production, clients connect to
 * SpacetimeDB Maincloud directly, so neither is registered.
 */
export const stdbProxy: RequestHandler | null = isProd
  ? null
  : createProxyMiddleware({
      target: `http://${STDB_HOST}:${STDB_PORT}`,
      changeOrigin: true,
      ws: false, // WebSocket upgrades handled manually (see handleStdbUpgrade)
      pathFilter: "/stdb/**",
      pathRewrite: { "^/stdb": "" },
    });

/**
 * Manually proxy WebSocket upgrade requests under `/stdb` to the local
 * SpacetimeDB server, stripping the `/stdb` prefix. Returns null in production.
 */
export const handleStdbUpgrade:
  | ((req: IncomingMessage, socket: Duplex, head: Buffer) => void)
  | null = isProd
  ? null
  : (req, socket, head) => {
      if (!req.url || !req.url.startsWith("/stdb")) {
        socket.destroy();
        return;
      }
      const path = req.url.replace(/^\/stdb/, "") || "/";
      logger.info({ url: req.url, path }, "stdb ws upgrade received");

      const proxyReq = http.request({
        host: STDB_HOST,
        port: STDB_PORT,
        method: req.method,
        path,
        headers: { ...req.headers, host: `${STDB_HOST}:${STDB_PORT}` },
      });

      proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
        const headerLines = Object.entries(proxyRes.headers)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("\r\n");
        socket.write(
          `HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n${headerLines}\r\n\r\n`,
        );
        if (proxyHead && proxyHead.length) socket.write(proxyHead);
        if (head && head.length) proxySocket.write(head);

        proxySocket.pipe(socket);
        socket.pipe(proxySocket);

        const destroy = () => {
          proxySocket.destroy();
          socket.destroy();
        };
        proxySocket.on("error", destroy);
        socket.on("error", destroy);
      });

      // Upstream answered with a normal HTTP response instead of a 101 upgrade
      // (e.g. the SpacetimeDB server rejected the connection). Relay the status
      // line and close, rather than leaving the client socket hanging.
      proxyReq.on("response", (proxyRes) => {
        socket.write(
          `HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n\r\n`,
        );
        socket.destroy();
      });

      proxyReq.on("error", (err) => {
        logger.warn({ err: String(err) }, "stdb ws proxy error");
        socket.destroy();
      });

      proxyReq.end();
    };

if (stdbProxy) {
  app.use(stdbProxy);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
