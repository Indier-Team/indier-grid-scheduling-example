// @deno-types="npm:@types/express@4.17.15"
import express from "express";
import cors from "cors";

import { webhook } from './src/routes/webhook.ts';
import { dbRouter } from './src/routes/system/db.ts';
import { adminAppointmentRouter } from './src/routes/admin/appointment.ts';
import { adminBillingRouter } from './src/routes/admin/billing.ts';
import { adminContactsRouter } from './src/routes/admin/contacts.ts';
import { adminServicesRouter } from './src/routes/admin/services.ts';
import { adminAvailableHoursRouter } from './src/routes/admin/available-hours.ts';
import { publicAppointmentRouter } from './src/routes/public/appointment.ts';
import { publicChatRouter } from './src/routes/public/chat.ts';
import { publicContactRouter } from './src/routes/public/contact.ts';
import { errorHandler } from './src/middlewares/error-handler.ts';
import { debugMiddleware } from './src/middlewares/debug.ts';
import { adminReportRouter } from './src/routes/admin/report.ts';

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
 * Route for resetting and clearing the Deno KV store.
 * @route /api/v1/reset-kv
 */
app.use('/api/v1', dbRouter);


/**
 * Middleware to parse incoming JSON requests.
 */
app.use(express.json());

/**
 * Middleware to log request details.
 */
app.use(debugMiddleware);

/**
 * Route for appointment-related operations.
 * @route /api/v1/admin/appointments
 */
app.use('/api/v1', adminAppointmentRouter);

/**
 * Route for billing-related operations.
 * @route /api/v1/admin/billing
 */
app.use('/api/v1', adminBillingRouter);

/**
 * Route for contacts-related operations.
 * @route /api/v1/admin/contacts
 */
app.use('/api/v1', adminContactsRouter);

/**
 * Route for services-related operations.
 * @route /api/v1/admin/services
 */
app.use('/api/v1', adminServicesRouter);

/**
 * Route for available-hours-related operations.
 * @route /api/v1/admin/available-hours
 */
app.use('/api/v1', adminAvailableHoursRouter);

/**
 * Route for report-related operations.
 * @route /api/v1/admin/report
 */
app.use('/api/v1', adminReportRouter);

/**
 * Route for public appointment operations.
 * @route /api/v1/public/appointment
 */
app.use('/api/v1', publicAppointmentRouter);

/**
 * Route for public chat operations.
 * @route /api/v1/public/chat
 */
app.use('/api/v1', publicChatRouter);

/**
 * Route for public contact operations.
 * @route /api/v1/public/contact
 */
app.use('/api/v1', publicContactRouter);


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
  console.log('-------------')
  console.log(`Stripe PRO PLAN: ${Deno.env.get("STRIPE_PRO_PLAN_PRICE_ID")}`);
  console.log(`Stripe FREE PLAN: ${Deno.env.get("STRIPE_FREE_PLAN_PRICE_ID")}`);
  console.log('-------------')
});

export { app };