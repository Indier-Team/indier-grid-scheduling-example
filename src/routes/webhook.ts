import express from 'express';
import Stripe from 'stripe';

import { Request, Response } from 'npm:@types/express@4.17.15';
import { stripe } from '../config/stripe.ts';
import { handleSubscriptionChange } from '../utils/billing.ts';
import { createUserWithStripeCustomer } from '../utils/user.ts';
import { updateUserFromStripeWebhook } from '../utils/user.ts';

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  console.log('[WEBHOOK] Starting webhook processing');

  const sig = req.headers['stripe-signature'];
  console.log(`[WEBHOOK] Stripe signature received: ${sig}`);

  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(req.body, sig as string, Deno.env.get('STRIPE_WEBHOOK_SECRET') || '');
    console.log(`[WEBHOOK] Event constructed successfully - Type: ${event.type}`);
  } catch (err) {
    console.log(`[WEBHOOK] ⚠️  Webhook signature verification failed: ${err.message}`);
    return res.sendStatus(400);
  }

  // Handle the event
  console.log(`[WEBHOOK] Processing event type: ${event.type}`);
  switch (event.type) {
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      console.log(`[WEBHOOK] Handling subscription change - ID: ${(event.data.object as Stripe.Subscription).id}`);
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
      console.log(`[WEBHOOK] Subscription was updated successfully`);
      break;
    case 'customer.created':
      console.log(`[WEBHOOK] Handling customer creation - ID: ${(event.data.object as Stripe.Customer).id}`);
      await createUserWithStripeCustomer(event.data.object as Stripe.Customer);
      console.log(`[WEBHOOK] Customer was created successfully`);
      break;
    default:
      console.log(`[WEBHOOK] Unhandled event type ${event.type}`);
  }

  console.log('[WEBHOOK] Webhook processing completed');
  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
});

export const webhook = router;