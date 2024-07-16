import express from "express";

import { v1 } from "https://deno.land/std@0.177.0/uuid/mod.ts";
import { Request, Response } from 'npm:@types/express@4.17.15';
import { getContactByChannel } from '../../utils/contact.ts';
import { kv } from '../../config/kv.ts';
import { Appointment, Service } from '../../types.ts';
import { checkAvailability } from '../../utils/availability.ts';
import { authPublicMiddleware } from '../../middlewares/auth-public.ts';

const publicAppointmentRouter = express.Router();

/**
 * Route to create a new appointment.
 * 
 * @route POST /public/appointments
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
publicAppointmentRouter.post('/public/appointments', authPublicMiddleware, async (req: Request, res: Response) => {
  const { serviceIds, date, time } = req.body;

  console.log('[APPOINTMENTS] Starting new appointment creation');
    
  const contactChannelId = req.headers['x-sender-channel'] as string;
  const userId = req.headers['x-user-id'] as string;

  console.log(`[APPOINTMENTS] Received appointment data - ContactId: ${contactChannelId}, ServiceIds: ${serviceIds}, Date: ${date}, Time: ${time}`);

  if (!contactChannelId || !serviceIds || !date || !time || !Array.isArray(serviceIds)) {
    console.log('[APPOINTMENTS] Error: Missing required fields');
    return res.status(400).json({ error: 'ContactId, serviceIds (array), date, and time are required' });
  }

  const contact = await getContactByChannel(userId, contactChannelId);
  if (!contact) {
    console.log(`[APPOINTMENTS] Error: Contact with channelId ${contactChannelId} not found. Needs start a chat and try again`);
    return res.status(400).json({ error: `Contact with channelId ${contactChannelId} not found. Needs start a chat and try again` });
  }

  // Calculate total duration and validate services
  let totalDuration = 0;
  for (const serviceId of serviceIds) {
    const service = await kv.get<Service>(['services', serviceId]);

    if (!service.value) {
      console.log(`[APPOINTMENTS] Error: Service with id ${serviceId} not found`);
      return res.status(400).json({ error: `Service with id ${serviceId} not found` });
    }

    totalDuration += service.value.duration;
  }

  // Check availability
  const isAvailable = await checkAvailability(userId, date, time, totalDuration);
  if (!isAvailable) {
    console.log('[APPOINTMENTS] Error: The selected time slot is not available');
    return res.status(400).json({ error: 'The selected time slot is not available' });
  }

  const id = v1.generate() as string;
  const now = new Date().toISOString();
  
  const appointment: Appointment = { 
    id, 
    contactId: contact.id, 
    serviceIds, 
    date, 
    time, 
    duration: totalDuration, 
    userId,
    createdAt: now,
    updatedAt: now
  };

  try {
    await kv.set(['appointments', userId, id], appointment);
    console.log(`[APPOINTMENTS] Appointment created successfully - Id: ${appointment.id}`);
    res.status(201).json(appointment);
  } catch (error) {
    console.error(`[APPOINTMENTS] Error creating appointment: ${error}`);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

/**
 * Route to get all contact appointments.
 * 
 * @route GET /public/appointments
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
publicAppointmentRouter.get('/public/appointments', authPublicMiddleware, async (req: Request, res: Response) => {
  console.log('[APPOINTMENTS] Fetching contact appointments');

  const userId = req.headers['x-user-id'] as string;
  const contactChannelId = req.headers['x-sender-channel'] as string;
  const contact = await getContactByChannel(userId, contactChannelId);

  if (!contact) {
    console.log(`[APPOINTMENTS] Error: Contact with channelId ${contactChannelId} not found. Needs start a chat and try again`);
    return res.status(400).json({ error: `Contact with channelId ${contactChannelId} not found. Needs start a chat and try again` });
  }

  const appointments: Appointment[] = [];

  const records = kv.list<Appointment>({ prefix: ['appointments', userId] });

  for await (const entry of records) {
    if (entry.value?.contactId === contact.id) {
      appointments.push(entry.value as Appointment);
    }
  }

  console.log(`[APPOINTMENTS] Total appointments fetched: ${appointments.length}`);
  res.json({
    message: 'Contact appointments fetched successfully',
    appointments
  });
});

/**
 * Route to update an existing contact appointment.
 * 
 * @route PUT /public/appointments/:id
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
publicAppointmentRouter.put('/public/appointments/:id', authPublicMiddleware, async (req: Request, res: Response) => {
  console.log('[APPOINTMENTS] Starting appointment update');
  
  const { id } = req.params;
  const { serviceIds, date, time } = req.body;
  console.log(`[APPOINTMENTS] Received appointment data - Id: ${id}, ServiceIds: ${serviceIds}, Date: ${date}, Time: ${time}`);
  
  const userId = req.headers['x-user-id'] as string;
  const contactChannelId = req.headers['x-sender-channel'] as string;

  const contact = await getContactByChannel(userId, contactChannelId);
  if (!contact) {
    console.log(`[APPOINTMENTS] Error: Contact with channelId ${contactChannelId} not found. Needs start a chat and try again`);
    return res.status(400).json({ error: `Contact with channelId ${contactChannelId} not found. Needs start a chat and try again` });
  }

  const appointmentKey = ['appointments', userId, id];
  const appointment = await kv.get<Appointment>(appointmentKey);

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
 * Route to delete an existing contact appointment.
 * 
 * @route DELETE /public/appointments/:id
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
publicAppointmentRouter.delete('/public/appointments/:id', authPublicMiddleware, async (req: Request, res: Response) => {
  console.log('[APPOINTMENTS] Starting appointment deletion');
  
  const { id } = req.params;

  const userId = req.headers['x-user-id'] as string;
  const contactChannelId = req.headers['x-sender-channel'] as string;

  const contact = await getContactByChannel(userId, contactChannelId);
  if (!contact) {
    console.log(`[APPOINTMENTS] Error: Contact with channelId ${contactChannelId} not found. Needs start a chat and try again`);
    return res.status(400).json({ error: `Contact with channelId ${contactChannelId} not found. Needs start a chat and try again` });
  }

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

/**
 * @route GET /public/appointments/check
 * @description Check if the appointment is available.
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
publicAppointmentRouter.get('/public/appointments/check', async (req: Request, res: Response) => {
  console.log('[APPOINTMENTS] Checking appointment availability');
  
  const { date, time, duration } = req.query;

  if (!date || !time || !duration) {
    console.log('[APPOINTMENTS] Error: Date and time are required');
    return res.status(400).json({ error: 'Date and time are required' });
  }

  const userId = req.headers['x-user-id'] as string;
  const isAvailable = await checkAvailability(userId, date as string, time as string, parseInt(duration as string));

  if (isAvailable) {
    console.log('[APPOINTMENTS] The selected time slot is available');
    res.json({ available: true });
  } else {
    console.log('[APPOINTMENTS] The selected time slot is not available');
    res.json({ available: false });
  }
});

export { publicAppointmentRouter }