import express from "express";

import { v1 } from "https://deno.land/std@0.177.0/uuid/mod.ts";
import { kv } from "../../config/kv.ts";
import { Service } from "../../types.ts";
import { Request, Response } from 'npm:@types/express@4.17.15';
import { authAdminMiddleware } from '../../middlewares/auth-admin.ts';

const adminServicesRouter = express.Router();

/**
 * @route POST /admin/services
 * @description Creates a new service. Admin access required.
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminServicesRouter.post('/admin/services', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[SERVICES] Starting new service creation');
  const userId = req.headers['x-user-id'] as string;

  const { name, price, duration } = req.body;
  console.log(`[SERVICES] Received service data - Name: ${name}, Price: ${price}, Duration: ${duration}`);

  if (!name || !price || !duration) {
    console.log('[SERVICES] Error: Missing required fields');
    return res.status(400).json({ error: 'Name, price, and duration are required' });
  }

  const id = v1.generate() as string;
  const now = new Date().toISOString();
  const service: Service = { id, name, price, duration, createdAt: now, updatedAt: now, userId };

  try {
    await kv.set(['services', id], service);
    console.log(`[SERVICES] Service created successfully - Id: ${id}`);
    res.status(201).json(service);
  } catch (error) {
    console.error(`[SERVICES] Error creating service: ${error}`);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

/**
 * @route GET /admin/services
 * @description Retrieves a list of services for the admin.
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminServicesRouter.get('/admin/services', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[SERVICES] Fetching all services');
  const userId = req.headers['x-user-id'] as string;

  const services: Service[] = [];
  const records = kv.list({ prefix: ['services', userId] });

  for await (const entry of records) {
    services.push(entry.value as Service);
  }

  console.log(`[SERVICES] Total services fetched: ${services.length}`);
  res.json(services);
});

/**
 * @route PUT /admin/services/:id
 * @description Updates an existing service. Admin access required.
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminServicesRouter.put('/admin/services/:id', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[SERVICES] Starting service update');
  const { id } = req.params;
  const { name, price, duration } = req.body;

  const service = await kv.get<Service>(['services', id]);

  if (!service.value) {
    console.log(`[SERVICES] Service not found - Id: ${id}`);
    return res.status(404).json({ error: 'Service not found' });
  }

  const updatedService: Service = {
    ...service.value,
    name: name ?? service.value.name,
    price: price ?? service.value.price,
    duration: duration ?? service.value.duration,
    updatedAt: new Date().toISOString(),
  };

  try {
    await kv.set(['services', id], updatedService);
    console.log(`[SERVICES] Service updated successfully - Id: ${id}`);
    res.json(updatedService);
  } catch (error) {
    console.error(`[SERVICES] Error updating service: ${error}`);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

/**
 * @route DELETE /services/:id
 * @description Deletes an existing service. Admin access required.
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminServicesRouter.delete('/admin/services/:id', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[SERVICES] Starting service deletion');
  const { id } = req.params;

  const service = await kv.get<Service>(['services', id]);

  if (!service.value) {
    return res.status(404).json({ error: 'Service not found' });
  }

  await kv.delete(['services', id]);
  res.status(204).end();
});

export { adminServicesRouter };