import express from "express";

import { Request, Response } from 'npm:@types/express@4.17.15';
import { Contact } from '../../types.ts';
import { getContactByChannel, upsertContact } from '../../utils/contact.ts';

const publicContactRouter = express.Router();

/**
 * Update current customer's contact.
 * 
 * @route PUT /public/contact
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
publicContactRouter.put('/public/contact', async (req: Request, res: Response) => {
  console.log('[CONTACTS] Starting contact update');
  
  const { name, phone, email } = req.body;

  const userId = req.headers['x-user-id'] as string;
  const senderChannel = req.headers['x-sender-channel'] as string;
  const senderChannelName = req.headers['x-sender-name'] as string;

  const contact = await getContactByChannel(userId, senderChannel);

  if (!contact) {
    console.log(`[CONTACTS] Contact not found - UserId: ${userId}, ChannelId: ${senderChannel}`);
    return res.status(404).json({ error: 'Contact not found' });
  }

  const updatedContact: Contact = {
    ...contact,
    name: name ?? contact.name ?? senderChannelName,
    phone: phone ?? contact.phone ?? senderChannel.split('@')[0],
    email: email ?? contact.email,
    updatedAt: new Date().toISOString(),
  };

  try {
    await upsertContact(userId, {
      name: updatedContact.name,
      phone: updatedContact.phone,
      email: updatedContact.email,
    });
    
    console.log(`[CONTACTS] Contact updated successfully - Id: ${updatedContact.id}`);
    res.json(updatedContact);
  } catch (error) {
    console.error(`[CONTACTS] Error updating contact: ${error}`);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

export { publicContactRouter };