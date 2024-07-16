import express from "express";

import { v1 } from "https://deno.land/std@0.177.0/uuid/mod.ts";
import { kv } from "../config/kv.ts";
import { Appointment, Service } from "../types.ts";
import { getUserByPhone } from "../utils/user.ts";
import { checkAvailability } from "../utils/availability.ts";
import { Request, Response } from 'npm:@types/express@4.17.15';

const router = express.Router();

/**
 * Route to create a new appointment.
 * 
 * @route POST /appointments
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.post('/appointments', async (req: Request, res: Response) => {
  const { contactId, serviceIds, date, time } = req.body;
  
  const owner = req.headers['x-channel'] as string;
  const userId = req.headers['x-user-id'] as string;

  if (!contactId || !serviceIds || !date || !time || !Array.isArray(serviceIds)) {
    return res.status(400).json({ error: 'ContactId, serviceIds (array), date, and time are required' });
  }

  // Calculate total duration and validate services
  let totalDuration = 0;
  for (const serviceId of serviceIds) {
    const service = await kv.get<Service>(['services', serviceId]);
    if (!service.value) {
      return res.status(400).json({ error: `Service with id ${serviceId} not found` });
    }
    totalDuration += service.value.duration;
  }

  // Check availability
  const isAvailable = await checkAvailability(owner, date, time, totalDuration);
  if (!isAvailable) {
    return res.status(400).json({ error: 'The selected time slot is not available' });
  }

  const id = v1.generate() as string;
  const now = new Date().toISOString();
  const appointment: Appointment = { 
    id, 
    contactId, 
    serviceIds, 
    date, 
    time, 
    duration: totalDuration, 
    userId,
    createdAt: now,
    updatedAt: now
  };

  await kv.set(['appointments', owner, id], appointment);

  res.status(201).json(appointment);
});

/**
 * Route to get all appointments.
 * 
 * @route GET /appointments
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.get('/appointments', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const channelId = req.headers['x-channel'] as string;

  const userByChannel = await getUserByPhone(channelId);
  const isAdmin = userByChannel?.id === userId;

  const appointments: Appointment[] = [];

  const records = isAdmin ? kv.list({ prefix: ['appointments'] }) : kv.list({ prefix: ['appointments', userId] });

  for await (const entry of records) {
    appointments.push(entry.value as Appointment);
  }

  res.json(appointments);
});

/**
 * Route to update an existing appointment.
 * 
 * @route PUT /appointments/:id
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.put('/appointments/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { contactId, serviceIds, date, time } = req.body;
  
  const userId = req.headers['x-user-id'] as string;
  const channelId = req.headers['x-channel'] as string;

  const userByChannel = await getUserByPhone(channelId);
  const isAdmin = userByChannel?.id === userId;

  const appointmentKey = isAdmin ? ['appointments', id] : ['appointments', userId, id];
  const appointment = await kv.get<Appointment>(appointmentKey);

  if (!appointment.value) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  let totalDuration = appointment.value.duration;

  if (serviceIds && Array.isArray(serviceIds)) {
    totalDuration = 0;
    for (const serviceId of serviceIds) {
      const service = await kv.get<Service>(['services', serviceId]);
      if (!service.value) {
        return res.status(400).json({ error: `Service with id ${serviceId} not found` });
      }
      totalDuration += service.value.duration;
    }
  }

  // Check availability if the date or time is changed
  if (date !== appointment.value.date || time !== appointment.value.time) {
    const isAvailable = await checkAvailability(channelId, date ?? appointment.value.date, time ?? appointment.value.time, totalDuration);
    if (!isAvailable) {
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

  await kv.set(appointmentKey, updatedAppointment);

  res.json(updatedAppointment);
});

/**
 * Route to delete an existing appointment.
 * 
 * @route DELETE /appointments/:id
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.delete('/appointments/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const userId = req.headers['x-user-id'] as string;
  const channelId = req.headers['x-channel'] as string;

  const userByChannel = await getUserByPhone(channelId);
  const isAdmin = userByChannel?.id === userId;

  const appointmentKey = isAdmin ? ['appointments', id] : ['appointments', userId, id];
  const appointment = await kv.get<Appointment>(appointmentKey);

  if (!appointment.value) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  await kv.delete(appointmentKey);

  res.status(204).end();
});

export const appointmentsRouter = router;