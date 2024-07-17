import express from "express";

import { kv} from "../../config/kv.ts";
import { Contact } from "../../types.ts";
import { getUserByPhone } from "../../utils/user.ts";
import { Request, Response } from 'npm:@types/express@4.17.15';
import { authAdminMiddleware } from '../../middlewares/auth-admin.ts';
import { upsertContact } from '../../utils/contact.ts';

const adminContactsRouter = express.Router();

/**
 * Route to get all contacts.
 * 
 * @route GET /contacts
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminContactsRouter.get('/admin/contacts', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[ADMIN_CONTACTS] Fetching all contacts');

  const userId = req.headers['x-user-id'] as string;
  const channelId = req.headers['x-sender-channel'] as string;

  const userByChannel = await getUserByPhone(channelId);
  const isAdmin = userByChannel?.id === userId;

  const contacts: Contact[] = [];

  const records = isAdmin ? kv.list({ prefix: ['contacts'] }) : kv.list({ prefix: ['contacts', userId] });

  for await (const entry of records) {
    contacts.push(entry.value as Contact);
  }

  console.log(`[ADMIN_CONTACTS] Total contacts fetched: ${contacts.length}`);
  res.json(contacts);
});

/**
 * Route to upsert a contact.
 * 
 * @route PUT /contacts/:id
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminContactsRouter.put('/admin/contacts', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[ADMIN_CONTACTS] Starting contact update');
  const { id, name, phone, email } = req.body;

  const userId = req.headers['x-user-id'] as string;

  try {
    const updatedContact = await upsertContact(userId, {
      id,
      name: name,
      phone: phone,
      email: email
    });

    console.log(`[ADMIN_CONTACTS] Contact updated successfully - Id: ${updatedContact.id}`);
    res.json(updatedContact);
  } catch (error) {
    console.error(`[ADMIN_CONTACTS] Error updating contact: ${error}`);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

/**
 * Route to delete a contact.
 * 
 * @route DELETE /admin/contacts/:id
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminContactsRouter.delete('/admin/contacts/:id', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[ADMIN_CONTACTS] Starting contact deletion');
  
  const { id } = req.params;

  const userId = req.headers['x-user-id'] as string;
  const channelId = req.headers['x-sender-channel'] as string;

  const userByChannel = await getUserByPhone(channelId);
  const isAdmin = userByChannel?.id === userId;

  const contactKey = isAdmin ? ['contacts', id] : ['contacts', userId, id];
  const contact = await kv.get<Contact>(contactKey);

  if (!contact.value) {
    console.log(`[ADMIN_CONTACTS] Contact not found - Id: ${id}`);
    return res.status(404).json({ error: 'Contact not found' });
  }

  try {
    await kv.delete(contactKey);
    console.log(`[ADMIN_CONTACTS] Contact deleted successfully - Id: ${contact.value.id}`);
    res.status(204).end();
  } catch (error) {
    console.error(`[ADMIN_CONTACTS] Error deleting contact: ${error}`);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export { adminContactsRouter };