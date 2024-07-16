import express from 'express';
import Stripe from 'stripe';

import { Request, Response } from 'npm:@types/express@4.17.15';
import { stripe } from '../config/stripe.ts';
import { handleSubscriptionChange } from '../utils/billing.ts';
import { createUserWithStripeCustomer } from '../utils/user.ts';
import { updateUserFromStripeWebhook } from '../utils/user.ts';

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, Deno.env.get('STRIPE_WEBHOOK_SECRET') || '');
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.sendStatus(400);
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
      console.log(`Subscription was updated!`, event.data.object);
      break;
    case 'customer.updated':
      await updateUserFromStripeWebhook(event.data.object as Stripe.Customer);
      console.log(`Customer was updated!`, event.data.object);
      break;
    case 'customer.created':
      await createUserWithStripeCustomer(event.data.object as Stripe.Customer);
      console.log(`Customer was deleted!`, event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
});

export const webhook = router;
