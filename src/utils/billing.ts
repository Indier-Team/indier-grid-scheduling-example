import Stripe from "stripe";

import { stripe } from "../config/stripe.ts";
import { kv } from "../config/kv.ts";
import { User } from "../types.ts";
import { getUserByStripeCustomerId } from './user.ts';

/**
 * Checks if a customer is on the PRO or FREE plan based on the provided price ID.
 * 
 * @param {string} priceId - The price ID to check.
 * @returns {'PRO' | 'FREE'} - Returns 'PRO' if the customer is on the PRO plan, 'FREE' otherwise.
 * @throws {Error} - Throws an error if the price check fails.
 */
export function getUserPlan(priceId: string): 'PRO' | 'FREE' {
  const proPriceId = Deno.env.get("STRIPE_PRO_PLAN_PRICE_ID") as string;
  const freePriceId = Deno.env.get("STRIPE_FREE_PLAN_PRICE_ID") as string;

  if (priceId === proPriceId) {
    return 'PRO';
  } else if (priceId === freePriceId) {
    return 'FREE';
  } else {
    throw new Error('[BILLING] Invalid price ID');
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
              id: subscription.data[0].id,
              price: Deno.env.get("STRIPE_PRO_PLAN_PRICE_ID") || "",
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
    throw new Error('[BILLING] Error creating checkout session');
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
  const user = await getUserByStripeCustomerId(subscription.customer as string);
  if (!user) {
    console.error('[BILLING] No userId found in subscription metadata');
    return;
  }

  const updatedUser: User = {
    ...user,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionPriceId: subscription.items.data[0].price.id,
    stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    stripeCurrentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    stripeSubscriptionStatus: subscription.status as 'active' | 'inactive' | 'trial',
    updatedAt: new Date().toISOString(),
  };

  await kv.set(['users', user.id], updatedUser);
  console.log(`[BILLING] Updated subscription for user ${user.id}`);
}

