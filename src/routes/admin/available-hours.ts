import express from "express";

import { kv } from "../../config/kv.ts";
import { User } from "../../types.ts";
import { getUserByPhone } from "../../utils/user.ts";
import { Request, Response } from 'npm:@types/express@4.17.15';
import { authAdminMiddleware } from '../../middlewares/auth-admin.ts';

const adminAvailableHoursRouter = express.Router();

/**
 * @route PUT /admin/available-hours
 * @description Updates the available hours for a user. Admin access is required.
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminAvailableHoursRouter.put('/admin/available-hours', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[ADMIN_AVAILABLE_HOURS] Updating user available hours');
  const userId = req.headers['x-user-id'] as string;

  const { availableHours } = req.body;

  if (!availableHours || typeof availableHours !== 'object') {
    console.log('[ADMIN_AVAILABLE_HOURS] Error: Available hours are required and must be an object');
    return res.status(400).json({ error: 'Available hours are required and must be an object' });
  }

  const user = await kv.get<User>(['users', userId]);

  if (!user.value) {
    console.log(`[ADMIN_AVAILABLE_HOURS] Error: User not found - Id: ${userId}`);
    return res.status(404).json({ error: 'User not found' });
  }

  const updatedUser: User = {
    ...user.value,
    availableHours,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(['users', userId], updatedUser);

  console.log(`[ADMIN_AVAILABLE_HOURS] Available hours updated successfully - User: ${updatedUser.name}`);
  res.json({ message: 'Available hours updated successfully', user: updatedUser });
});

export { adminAvailableHoursRouter };