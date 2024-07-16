import express from "express";

import { Request, Response } from 'npm:@types/express@4.17.15';
import { getUserById, getUserByPhone } from '../../utils/user.ts';
import { upsertContact } from '../../utils/contact.ts';
import { Contact } from '../../types.ts';
import { getUserPlan } from '../../utils/billing.ts';
import { listUserServices } from '../../utils/service.ts';
import { listContactAppointments } from '../../utils/appointment.ts';
import { authPublicMiddleware } from '../../middlewares/auth-public.ts';

const publicChatRouter = express.Router();

/**
 * @route POST /chat
 * @description Starts a chat.
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
publicChatRouter.post('/public/chat', authPublicMiddleware, async (req: Request, res: Response) => {
  console.log('[PUBLIC_CHAT] Verifying user identity');
  
  const channelId = req.headers['x-channel'] as string;
  const userId = req.headers['x-user-id'] as string;
  const senderName = req.headers['x-sender-name'] as string;
  const senderChannel = req.headers['x-sender-channel'] as string;

  console.log(`[PUBLIC_CHAT] Context: ${JSON.stringify({
    channelId,
    userId,
    senderName,
    senderChannel,
  })}`);

  if (!channelId) {
    console.log('[PUBLIC_CHAT] Error: Channel ID is required');
    return res.status(400).json({ error: 'Channel ID is required' });
  }

  const owner = await getUserById(userId);
  if(!owner) {
    console.log('[PUBLIC_CHAT] Error: This account is invalid. Dont try start chat with this account.');
    return res.status(404).json({ error: 'This account is invalid. Dont try start chat with this account.' });
  }

  const userByChannel = await getUserByPhone(channelId);
  const isAdmin = owner?.id === userId;

  let contact: Contact | null = null;

  if (!isAdmin) {
    contact = await upsertContact(userId, {
      name: senderName,
      phone: senderChannel,
    });
  }

  console.log(`[PUBLIC_CHAT] Chat started - ${userByChannel?.name || contact?.id} ON (${owner?.name} - ${owner?.phone})`);
  res.json({ 
    message: 'Chat started', 
    data: {
      sender: {
        type: isAdmin ? 'admin' : 'customer',
        id: isAdmin ? owner.id : contact?.id,
        name: isAdmin ? owner.name : contact?.name,
        phone: isAdmin ? owner.phone : contact?.phone,

        appointments: !isAdmin ? await listContactAppointments(contact?.id as string) : [],
      },
      account: {
        id: owner.id,
        name: owner.name,
        phone: owner.phone,
        email: owner.email,

        plan: getUserPlan(owner.stripeSubscriptionPriceId as string),
        services: await listUserServices(owner.id),
        availableHours: owner.availableHours,
        
        stripeCurrentPeriodEnd: owner.stripeCurrentPeriodEnd,
        stripeCurrentPeriodStart: owner.stripeCurrentPeriodStart,
        stripeSubscriptionStatus: owner.stripeSubscriptionStatus,

        createdAt: owner.createdAt,
      }
    }
  });
});

export { publicChatRouter };