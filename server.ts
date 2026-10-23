/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { signupRouter } from './src/server/signupRouter';
import { marineDbRouter } from './src/server/marineDbRouter';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Mount the Backend API routes
app.use('/api', signupRouter);
app.use('/api/marine-db', marineDbRouter);

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Vite middleware for development HMR & SPA handling
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sea Guardian Server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 User Signup Endpoint: http://0.0.0.0:${PORT}/api/signup`);
  });
}

startServer();
