import express from "express";

import { getUserById } from "../utils/user.ts";
import { createCheckoutSession, createPortalSession } from "../utils/billing.ts";
import { Request, Response } from 'npm:@types/express@4.17.15';

const router = express.Router();

/**
 * Route to create a new checkout session.
 * 
 * @route POST /billing/checkout
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.post('/billing/checkout', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const user = await getUserById(userId);

  if(!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { url } = await createCheckoutSession(user);

  res.json({ 
    hasSubscription: user.stripeSubscriptionId !== null,
    checkoutUrl: url,
   });
});

/**
 * Route to create a new portal session for managing billing.
 * 
 * @route GET /billing/manage
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
router.get('/billing/manage', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const user = await getUserById(userId);

  if(!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { url } = await createPortalSession(user);
  
  res.json({ 
    hasSubscription: user.stripeSubscriptionId !== null,
    manageUrl: url,
   });
});

export const billingRouter = router;