import express from "express";

import { Request, Response } from 'express';
import { Appointment, Service } from '../../types.ts';
import { kv } from '../../config/kv.ts';
import { checkAvailability } from '../../utils/availability.ts';
import { authAdminMiddleware } from '../../middlewares/auth-admin.ts';

const adminAppointmentRouter = express.Router();

/**
 * Route to get all appointments.
 * 
 * @route GET /admin/appointments
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminAppointmentRouter.get('/admin/appointments', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[APPOINTMENTS] Fetching all appointments');
  const userId = req.headers['x-user-id'] as string;

  const appointments: Appointment[] = [];

  const records = kv.list({ prefix: ['appointments', userId] });

  for await (const entry of records) {
    appointments.push(entry.value as Appointment);
  }

  console.log(`[APPOINTMENTS] Total appointments fetched: ${appointments.length}`);
  res.json(appointments);
});

/**
 * Route to update an existing appointment.
 * 
 * @route PUT /admin/appointments/:id
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminAppointmentRouter.put('/admin/appointments/:id', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[APPOINTMENTS] Starting appointment update');
  
  const { id } = req.params;
  const { contactId, serviceIds, date, time } = req.body;
  
  console.log(`[APPOINTMENTS] Received appointment data - Id: ${id}, ContactId: ${contactId}, ServiceIds: ${serviceIds}, Date: ${date}, Time: ${time}`);
  
  const userId = req.headers['x-user-id'] as string;

  const appointment = await kv.get<Appointment>(['appointments', userId, id]);

  if (!appointment.value) {
    console.log(`[APPOINTMENTS] Error: Appointment with id ${id} not found`);
    return res.status(404).json({ error: 'Appointment not found' });
  }

  let totalDuration = appointment.value.duration;

  if (serviceIds && Array.isArray(serviceIds)) {
    totalDuration = 0;
    for (const serviceId of serviceIds) {
      const service = await kv.get<Service>(['services', serviceId]);
      if (!service.value) {
        console.log(`[APPOINTMENTS] Error: Service with id ${serviceId} not found`);
        return res.status(400).json({ error: `Service with id ${serviceId} not found` });
      }
      totalDuration += service.value.duration;
    }
  }

  // Check availability if the date or time is changed
  if (date !== appointment.value.date || time !== appointment.value.time) {
    const isAvailable = await checkAvailability(userId, date ?? appointment.value.date, time ?? appointment.value.time, totalDuration);
    if (!isAvailable) {
      console.log('[APPOINTMENTS] Error: The selected time slot is not available');
      return res.status(400).json({ error: 'The selected time slot is not available' });
    }
  }

  const updatedAppointment: Appointment = {
    ...appointment.value,
    contactId: contactId ?? appointment.value.contactId,
    serviceIds: serviceIds ?? appointment.value.serviceIds,
    date: date ?? appointment.value.date,
    time: time ?? appointment.value.time,
    duration: totalDuration,
    updatedAt: new Date().toISOString(),
  };

  try {
    await kv.set(appointmentKey, updatedAppointment);
    console.log(`[APPOINTMENTS] Appointment updated successfully - Id: ${updatedAppointment.id}`);
    res.json(updatedAppointment);
  } catch (error) {
    console.error(`[APPOINTMENTS] Error updating appointment: ${error}`);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

/**
 * Route to delete an existing appointment.
 * 
 * @route DELETE /appointments/:id
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminAppointmentRouter.delete('/admin/appointments/:id', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[APPOINTMENTS] Starting appointment deletion');
  
  const { id } = req.params;

  const userId = req.headers['x-user-id'] as string;

  const appointmentKey = ['appointments', userId, id];
  const appointment = await kv.get<Appointment>(appointmentKey);

  if (!appointment.value) {
    console.log(`[APPOINTMENTS] Error: Appointment with id ${id} not found`);
    return res.status(404).json({ error: 'Appointment not found' });
  }

  try {
    await kv.delete(appointmentKey);
    console.log(`[APPOINTMENTS] Appointment deleted successfully - Id: ${appointment.value.id}`);
    res.status(204).end();
  } catch (error) {
    console.error(`[APPOINTMENTS] Error deleting appointment: ${error}`);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

export { adminAppointmentRouter };