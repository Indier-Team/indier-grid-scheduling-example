// @deno-types="npm:@types/express@4.17.15"
import express from "express";
import cors from "cors";

import { usersRouter } from './src/routes/users.ts';
import { appointmentsRouter } from './src/routes/appointments.ts';
import { adminRouter } from './src/routes/admin.ts';
import { billingRouter } from './src/routes/billing.ts';
import { authMiddleware } from './src/middlewares/auth.ts';
import { errorHandler } from './src/middlewares/errorHandler.ts';
import { webhook } from './src/routes/webhook.ts';
import { contactsRouter } from './src/routes/contacts.ts';
import { kv } from './src/config/kv.ts';
import { Request, Response } from 'npm:@types/express@4.17.15';

const app = express();

/**
 * Middleware to enable Cross-Origin Resource Sharing (CORS).
 */
app.use(cors());

/**
 * Route for handling Stripe webhooks.
 * @route /api/v1/webhook
 */
app.use('/api/v1', webhook);


/**
 * Middleware to parse incoming JSON requests.
 */
app.use(express.json());

/**
 * Middleware to authenticate requests.
 * Applies to all routes.
 */
app.use(authMiddleware);

/**
 * Route for user-related operations.
 * @route /api/v1/users
 */
app.use('/api/v1', usersRouter);

/**
 * Route for appointment-related operations.
 * @route /api/v1/appointments
 */
app.use('/api/v1', appointmentsRouter);

/**
 * Route for admin-related operations.
 * @route /api/v1/admin
 */
app.use('/api/v1', adminRouter);

/**
 * Route for billing-related operations.
 * @route /api/v1/billing
 */
app.use('/api/v1', billingRouter);

/**
 * Route for contacts operations.
 * @route /api/v1/contacts
 */
app.use('/api/v1', contactsRouter);

/**
 * Route for resetting and clearing the Deno KV store.
 * @route /api/v1/reset-kv
 */
app.get('/api/v1/reset-kv', async (req: Request, res: Response) => {
  console.log('[RESET-KV] Starting KV store reset');

  try {
    await kv.clear();
    console.log('[RESET-KV] KV store reset successfully');
    res.send({ message: 'KV store reset successfully' });
  } catch (error) {
    console.error(`[RESET-KV] Error resetting KV store: ${error}`);
    res.status(500).json({ error: 'Failed to reset KV store' });
  }
});


/**
 * Global error handling middleware.
 * This should be the last middleware to use.
 */
app.use(errorHandler);

/**
 * Starts the server and listens on the specified port.
 */
app.listen(parseInt(Deno.env.get("PORT") || "3000"), () => {
  const port = parseInt(Deno.env.get("PORT") || "3000");
  console.log(`Server is running on port ${port}`);
});

export { app };