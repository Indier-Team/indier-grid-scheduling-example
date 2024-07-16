import express from "express";

import { getUserById } from "../../utils/user.ts";
import { createCheckoutSession, createPortalSession } from "../../utils/billing.ts";
import { Request, Response } from 'npm:@types/express@4.17.15';
import { authAdminMiddleware } from '../../middlewares/auth-admin.ts';

const adminBillingRouter = express.Router();

/**
 * Route to create a new checkout session.
 * 
 * @route POST /admin/billing/checkout
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminBillingRouter.post('/admin/billing/checkout', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[BILLING] Starting checkout session creation');
  
  const userId = req.headers['x-user-id'] as string;
  console.log(`[BILLING] Received user ID: ${userId}`);

  const user = await getUserById(userId);
  if(!user) {
    console.log('[BILLING] Error: User not found');
    return res.status(404).json({ error: 'User not found' });
  }

  const { url } = await createCheckoutSession(user);
  console.log(`[BILLING] Checkout session created successfully - URL: ${url}`);

  res.json({ 
    hasSubscription: user.stripeSubscriptionId !== null,
    checkoutUrl: url,
   });
});

/**
 * Route to create a new portal session for managing billing.
 * 
 * @route GET /admin/billing/manage
 * @param {Request} req - The request object from Express.
 * @param {Response} res - The response object from Express.
 * @returns {Promise<void>} - A promise that resolves to void.
 */
adminBillingRouter.get('/admin/billing/manage', authAdminMiddleware, async (req: Request, res: Response) => {
  console.log('[BILLING] Starting portal session creation');
  
  const userId = req.headers['x-user-id'] as string;
  console.log(`[BILLING] Received user ID: ${userId}`);

  const user = await getUserById(userId);
  if(!user) {
    console.log('[BILLING] Error: User not found');
    return res.status(404).json({ error: 'User not found' });
  }

  const { url } = await createPortalSession(user);
  console.log(`[BILLING] Portal session created successfully - URL: ${url}`);

  res.json({ 
    hasSubscription: user.stripeSubscriptionId !== null,
    manageUrl: url,
   });
});


export { adminBillingRouter };