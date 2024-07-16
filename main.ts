import express from "express";
import cors from "cors";

import { usersRouter } from './src/routes/users.ts';
import { appointmentsRouter } from './src/routes/appointments.ts';
import { adminRouter } from './src/routes/admin.ts';
import { billingRouter } from './src/routes/billing.ts';
import { authMiddleware } from './src/middlewares/auth.ts';
import { errorHandler } from './src/middlewares/errorHandler.ts';

const app = express();

/**
 * Middleware to enable Cross-Origin Resource Sharing (CORS).
 */
app.use(cors());

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