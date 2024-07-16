import Stripe from "stripe";

import { stripe } from "../config/stripe.ts";
import { kv } from "../config/kv.ts";
import { User } from "../types.ts";
import { getUserById } from './user.ts';

/**
 * Checks if a customer is on the PRO or FREE plan based on the provided price ID.
 * 
 * @param {string} priceId - The price ID to check.
 * @returns {'PRO' | 'FREE'} - Returns 'PRO' if the customer is on the PRO plan, 'FREE' otherwise.
 * @throws {Error} - Throws an error if the price check fails.
 */
export function getUserPlan(priceId: string): 'PRO' | 'FREE' {
  try {
    const proPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID") as string;
    const freePriceId = Deno.env.get("STRIPE_FREE_PRICE_ID") as string;

    const plans: { [key: string]: 'PRO' | 'FREE' } = {
      [proPriceId]: 'PRO',
      [freePriceId]: 'FREE',
    }
    
    return plans[priceId]
  } catch (error) {
    console.error(error);
    throw new Error('Error checking customer plan');
  }
}


/**
 * Creates a checkout session for a user to update their subscription.
 * 
 * @param {User} user - The user object containing stripeCustomerId and stripeSubscriptionId.
 * @returns {Promise<{url: string}>} - The URL of the created checkout session.
 * @throws {Error} - Throws an error if the checkout session creation fails.
 */
export async function createCheckoutSession(user: User) {
  const { stripeCustomerId, stripeSubscriptionId } = user;

  try {
    const subscription = await stripe.subscriptionItems.list({
      subscription: stripeSubscriptionId as string,
      limit: 1,
    });

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId as string,
      flow_data: {
        type: 'subscription_update_confirm',
        after_completion: {
          type: 'portal_homepage',
        },
        subscription_update_confirm: {
          subscription: stripeSubscriptionId as string,
          items: [
            {
              id: subscription.data[0].price.id,
              price: Deno.env.get("STRIPE_PRO_PRICE_ID") || "",
              quantity: 1,
            },
          ],
        },
      },
    });

    return {
      url: session.url,
    };
  } catch (error) {
    console.error(error);
    throw new Error('Error creating checkout session');
  }
}

/**
 * Creates a portal session for a user to manage their billing settings.
 * 
 * @param {User} user - The user object containing stripeCustomerId.
 * @returns {Promise<{url: string}>} - The URL of the created portal session.
 */
export async function createPortalSession(user: User) {
  const { stripeCustomerId } = user;

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId as string,
  });

  return {
    url: session.url,
  };
}

/**
 * Handles subscription changes and updates the user data accordingly.
 * 
 * @param {Stripe.Subscription} subscription - The subscription object from Stripe.
 * @returns {Promise<void>} - A promise that resolves when the user data is updated.
 */
export async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.error('No userId found in subscription metadata');
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    console.error(`User not found for id: ${userId}`);
    return;
  }

  const updatedUser: User = {
    ...user,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0].price.id,
    stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    stripeCurrentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    stripeSubscriptionStatus: subscription.status as 'active' | 'inactive' | 'trial',
    updatedAt: new Date().toISOString(),
  };

  await kv.set(['users', userId], updatedUser);
  console.log(`Updated subscription for user ${userId}`);
}

