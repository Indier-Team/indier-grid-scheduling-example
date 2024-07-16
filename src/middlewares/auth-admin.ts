import { Request, Response, NextFunction } from "npm:express@4.18.2";
import { getUserById } from '../utils/user.ts';

/**
 * Middleware to authenticate admin user based on the 'x-channel' or 'x-user-id' headers.
 * 
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @param {NextFunction} next - The next middleware function in the Express stack.
 * 
 * @returns {Promise<void>} - A promise that resolves to void.
 */
export const authAdminMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const contactChannel = req.headers['x-sender-channel'];
  const userId = req.headers['x-user-id'];

  if (!contactChannel && !userId) {
    return res.status(400).json({ error: 'x-channel or x-user-id header is required' });
  }

  const account = await getUserById(userId as string);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const isAdmin = contactChannel.split('@')[0] === account.phone

  console.log({
    contactChannel,
    account,
    isAdmin
  })

  if (!isAdmin) {
    return res.status(403).json({ error: 'You are not authorized to access this resource' });
  }

  next();
};