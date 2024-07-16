import { Request, Response, NextFunction } from "npm:express@4.18.2";
import { getUserById } from '../utils/user.ts';
import { getUserPlan } from '../utils/billing.ts';

/**
 * Middleware to authenticate a user based on the 'x-channel' or 'x-user-id' headers.
 * 
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @param {NextFunction} next - The next middleware function in the Express stack.
 * 
 * @returns {Promise<void>} - A promise that resolves to void.
 */
export const authPublicMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const contactChannel = req.headers['x-sender-channel'];
  const userId = req.headers['x-user-id'];
  const path = req.path;

  if (!contactChannel && !userId) {
    return res.status(400).json({ error: 'x-channel or x-user-id header is required' });
  }

  const user = await getUserById(userId as string);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userPlan = getUserPlan(user.stripePriceId as string);
  const isAdmin = contactChannel.split('@')[0] === user.phone
  const hasProPlan = userPlan === 'PRO'
  const isStartChatPath = path.includes('/chat')

  if (!isAdmin && !hasProPlan && !isStartChatPath) {
    return res.status(403).json({ error: 'User is on the FREE plan and cannot send messages. Say to customer try again later.' });
  }

  next();
};