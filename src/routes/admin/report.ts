import express from "express";

import { kv } from "../../config/kv.ts";
import { Appointment } from "../../types.ts";
import { Request, Response } from 'npm:@types/express@4.17.15';
import { authAdminMiddleware } from '../../middlewares/auth-admin.ts';

const adminReportRouter = express.Router();

/**
 * @route GET /admin/reports
 * @description Generates a report of appointments within a specified date range.
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminReportRouter.get('/admin/reports', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[ADMIN_REPORT] Starting report generation');
  
  const userId = req.headers['x-user-id'] as string;
  const channelId = req.headers['x-sender-channel'] as string;
  console.log(`[ADMIN_REPORT] Request received - UserId: ${userId}, ChannelId: ${channelId}`);

  // Extract and validate date parameters
  const { startDate, endDate } = req.query;
  console.log(`[ADMIN_REPORT] Date parameters received - StartDate: ${startDate}, EndDate: ${endDate}`);

  if (!startDate || !endDate) {
    console.log('[ADMIN_REPORT] Error: Start and end dates not provided');
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  console.log(`[ADMIN_REPORT] Processed date range - Start: ${start}, End: ${end}`);

  // Fetch and filter appointments
  const appointments: Appointment[] = [];
  const records = kv.list({ prefix: ['appointments'] });
  console.log('[ADMIN_REPORT] Starting appointment search');

  for await (const entry of records) {
    const appointment = entry.value as Appointment;
    const appointmentDate = new Date(appointment.createdAt);
    if (appointmentDate >= start && appointmentDate <= end) {
      appointments.push(appointment);
    }
  }
  console.log(`[ADMIN_REPORT] Total appointments found: ${appointments.length}`);

  // Calculate report statistics
  const totalAppointments = appointments.length;
  const totalDuration = appointments.reduce((sum, app) => sum + app.duration, 0);
  const uniqueContacts = new Set(appointments.map(app => app.contactId)).size;

  console.log(`[ADMIN_REPORT] Statistics calculated - Total: ${totalAppointments}, Duration: ${totalDuration}, Unique contacts: ${uniqueContacts}`);

  // Prepare and send the report
  const report = {
    totalAppointments,
    totalDuration,
    uniqueContacts,
    appointments,
  };

  console.log('[ADMIN_REPORT] Report generated successfully');
  res.json(report);
});

export { adminReportRouter };