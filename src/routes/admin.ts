import express from "express";

import { kv } from "../config/kv.ts";
import { Appointment } from "../types.ts";
import { getUserByPhone } from "../utils/user.ts";
import { Request, Response } from 'npm:@types/express@4.17.15';

const router = express.Router();

/**
 * @route GET /admin/reports
 * @description Generates a report of appointments within a specified date range.
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.get('/admin/reports', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const channelId = req.headers['x-channel'] as string;

  const userByChannel = await getUserByPhone(channelId);
  const isAdmin = userByChannel?.id === userId;

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  const appointments: Appointment[] = [];
  const records = kv.list({ prefix: ['appointments'] });

  for await (const entry of records) {
    const appointment = entry.value as Appointment;
    const appointmentDate = new Date(appointment.createdAt);
    if (appointmentDate >= start && appointmentDate <= end) {
      appointments.push(appointment);
    }
  }

  const totalAppointments = appointments.length;
  const totalDuration = appointments.reduce((sum, app) => sum + app.duration, 0);
  const uniqueContacts = new Set(appointments.map(app => app.contactId)).size;

  const report = {
    totalAppointments,
    totalDuration,
    uniqueContacts,
    appointments,
  };

  res.json(report);
});

export const adminRouter = router;