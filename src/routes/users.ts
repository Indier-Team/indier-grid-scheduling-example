import express from "express";

import { kv } from "../config/kv.ts";
import { User } from "../types.ts";
import { getUserByPhone } from "../utils/user.ts";
import { Request, Response } from 'npm:@types/express@4.17.15';
import { upsertContact } from "../utils/contact.ts";

const router = express.Router();

/**
 * @route GET /users/identity
 * @description Verifies if the x-channel number matches any registered user in the database.
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.get('/users/identity', async (req: Request, res: Response) => {
  console.log('[USERS] Verifying user identity');
  
  const channelId = req.headers['x-channel'] as string;
  const userId = req.headers['x-user-id'] as string;
  const senderName = req.headers['x-sender-name'] as string;
  const senderChannel = req.headers['x-sender-channel'] as string;

  if (!channelId) {
    console.log('[USERS] Error: Channel ID is required');
    return res.status(400).json({ error: 'Channel ID is required' });
  }

  const userByChannel = await getUserByPhone(channelId);

  if (!userByChannel) {
    console.log('[USERS] User not found, creating contact');
    const contact = await upsertContact(userId, {
      name: senderName,
      phone: senderChannel,
    });

    console.log(`[USERS] Contact created - ${contact.name}`);
    return res.json({ 
      message: 'Is not a admin, its a customer of user.',
      contact: contact,
    });
  }

  console.log(`[USERS] User found - ${userByChannel.name}`);
  res.json({ 
    message: 'User found, its a admin', 
    user: userByChannel 
  });
});


/**
 * @route PUT /users/available-hours
 * @description Updates the available hours for a user. Admin access is required.
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.put('/users/available-hours', async (req: Request, res: Response) => {
  console.log('[USERS] Updating user available hours');
  
  const userId = req.headers['x-user-id'] as string;
  const channelId = req.headers['x-channel'] as string;

  const userByChannel = await getUserByPhone(channelId);
  const isAdmin = userByChannel?.id === userId;

  if (!isAdmin) {
    console.log('[USERS] Error: Admin access required');
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { availableHours } = req.body;

  if (!availableHours || typeof availableHours !== 'object') {
    console.log('[USERS] Error: Available hours are required and must be an object');
    return res.status(400).json({ error: 'Available hours are required and must be an object' });
  }

  const user = await kv.get<User>(['users', userId]);

  if (!user.value) {
    console.log(`[USERS] Error: User not found - Id: ${userId}`);
    return res.status(404).json({ error: 'User not found' });
  }

  const updatedUser: User = {
    ...user.value,
    availableHours,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(['users', userId], updatedUser);

  console.log(`[USERS] Available hours updated successfully - User: ${updatedUser.name}`);
  res.json({ message: 'Available hours updated successfully', user: updatedUser });
});

export const usersRouter = router;