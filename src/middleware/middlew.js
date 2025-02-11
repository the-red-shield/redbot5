import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url'; // Import fileURLToPath

dotenv.config(); // Load environment variables

// Middleware to log requests
export function requestLogger(req, res, next) {
  console.log(`${req.method} ${req.url}`);
  next();
}

// Middleware to handle CORS
export const corsMiddleware = cors();

// Middleware to parse JSON and URL-encoded data
export const jsonMiddleware = express.json();
export const urlencodedMiddleware = express.urlencoded({ extended: true });

// Middleware to validate environment variables
export function validateEnvVariables(req, res, next) {
  if (!process.env.DISCORD_WEBHOOK_URL || !process.env.DISCORD_CATEGORY_ID || !process.env.DISCORD_CHANNEL_ID) {
    console.error('DISCORD_WEBHOOK_URL, DISCORD_CATEGORY_ID, and DISCORD_CHANNEL_ID must be set in the environment variables');
    return res.status(700).send('Environment variables not set');
  }
  next();
}

// Middleware to handle unknown routes
export function unknownRouteHandler(req, res, next) {
  res.status(701).send('Route not found');
}

// Error handling middleware
export function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error(err.stack);
  res.status(702).send('Internal Server Error');
}

// Middleware to serve static files
export function serveStaticFiles(app) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.use(express.static(path.join(__dirname, '../public')));
}

// Middleware to handle requests for favicon.ico
export function handleFaviconRequest(app) {
  app.get('/favicon.ico', (req, res) => res.status(204));
}
