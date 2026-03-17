import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

const apiBaseUrl = process.env['API_BASE_URL'];

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Handle API requests during SSR/prerender.
 * - If API_BASE_URL is set, proxy GET requests to that backend.
 * - Otherwise return a safe empty payload to prevent build-time failures.
 */
app.get(/^\/api\/.*/, async (req, res) => {
  if (!apiBaseUrl) {
    res.status(200).json({ success: true, data: [], count: 0, message: 'API unavailable during SSR build.' });
    return;
  }

  try {
    const base = apiBaseUrl.replace(/\/+$/, '');
    const path = req.originalUrl.replace(/^\/api/, '');
    const targetUrl = `${base}${path}`;
    const response = await (globalThis as any).fetch(targetUrl, { method: 'GET' });
    const contentType = response.headers.get('content-type');

    if (contentType) {
      res.setHeader('content-type', contentType);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.status(response.status).send(buffer);
  } catch (error) {
    res.status(502).json({ success: false, data: [], message: 'Failed to reach API during SSR build.' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
