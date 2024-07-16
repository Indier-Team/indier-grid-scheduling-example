import express from "express";

import { v1 } from "https://deno.land/std@0.177.0/uuid/mod.ts";
import { kv} from "../config/kv.ts";
import { Contact } from "../types.ts";
import { getUserByPhone } from "../utils/user.ts";
import { Request, Response } from 'npm:@types/express@4.17.15';

const router = express.Router();

/**
 * Route to create a new contact.
 * 
 * @route POST /contacts
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.post('/contacts', async (req: Request, res: Response) => {
  const { name, phone } = req.body;
  
  const userId = req.headers['x-user-id'] as string;
  const phoneWithFallback = (phone || req.headers['x-channel']).split('@')[0];

  if (!name || !phoneWithFallback) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  const id = v1.generate() as string;
  const now = new Date().toISOString();
  const contact: Contact = { id, name, phone, userId, createdAt: now, updatedAt: now };

  await kv.set(['contacts', userId, id], contact);

  res.status(201).json(contact);
});

/**
 * Route to get all contacts.
 * 
 * @route GET /contacts
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.get('/contacts', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const channelId = req.headers['x-channel'] as string;

  const userByChannel = await getUserByPhone(channelId);
  const isAdmin = userByChannel?.id === userId;

  const contacts: Contact[] = [];

  const records = isAdmin ? kv.list({ prefix: ['contacts'] }) : kv.list({ prefix: ['contacts', userId] });

  for await (const entry of records) {
    contacts.push(entry.value as Contact);
  }

  res.json(contacts);
});

/**
 * Route to update a contact.
 * 
 * @route PUT /contacts/:id
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.put('/contacts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone } = req.body;

  const userId = req.headers['x-user-id'] as string;
  const channelId = req.headers['x-channel'] as string;

  const userByChannel = await getUserByPhone(channelId);
  const isAdmin = userByChannel?.id === userId;

  const contactKey = isAdmin ? ['contacts', id] : ['contacts', userId, id];
  const contact = await kv.get<Contact>(contactKey);

  if (!contact.value) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const updatedContact: Contact = {
    ...contact.value,
    name: name ?? contact.value.name,
    phone: phone ?? contact.value.phone,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(contactKey, updatedContact);

  res.json(updatedContact);
});

/**
 * Route to delete a contact.
 * 
 * @route DELETE /contacts/:id
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.delete('/contacts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const userId = req.headers['x-user-id'] as string;
  const channelId = req.headers['x-channel'] as string;

  const userByChannel = await getUserByPhone(channelId);
  const isAdmin = userByChannel?.id === userId;

  const contactKey = isAdmin ? ['contacts', id] : ['contacts', userId, id];
  const contact = await kv.get<Contact>(contactKey);

  if (!contact.value) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  await kv.delete(contactKey);

  res.status(204).end();
});

export const contactsRouter = router;