import Stripe from 'stripe';

import { v1 } from 'https://deno.land/std@0.177.0/uuid/mod.ts';
import { kv } from "../config/kv.ts";
import { stripe } from '../config/stripe.ts';
import { User } from "../types.ts";
import { defaultAvailableHours } from '../data/default-available-hours.ts';

/**
 * Retrieves a user by their ID.
 * 
 * @async
 * @function getUserById
 * @param {string} id - The ID of the user.
 * @returns {Promise<User | undefined>} - A promise that resolves to the user object or undefined if not found.
 */
export async function getUserById(id: string): Promise<User | undefined> {
  const user = await kv.get<User>(['users', id]);
  return user.value;
}

/**
 * Retrieves a user by their phone number.
 * 
 * @async
 * @function getUserByPhone
 * @param {string} phone - The phone number of the user.
 * @returns {Promise<User | undefined>} - A promise that resolves to the user object or undefined if not found.
 */
export async function getUserByPhone(phone: string): Promise<User | undefined> {
  const users: User[] = [];
  const records = kv.list({ prefix: ['users'] });

  for await (const entry of records) {
    users.push(entry.value as User);
  }

  return users.find(user => user.phone === phone);
}

/**
 * Retrieves a user by their email address.
 * 
 * @async
 * @function getUserByEmail
 * @param {string} email - The email address of the user.
 * @returns {Promise<User | undefined>} - A promise that resolves to the user object or undefined if not found.
 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const users: User[] = [];
  const records = kv.list({ prefix: ['users'] });

  for await (const entry of records) {
    users.push(entry.value as User);
  }

  return users.find(user => user.email === email);
}

/**
 * Creates a new user when a customer is created in Stripe.
 * After creating the user in the database, it saves the user ID in the metadata of the Stripe customer
 * and creates a subscription with the plan price ID 'free'.
 * 
 * @async
 * @function createUserWithStripeCustomer
 * @param {Stripe.Customer} customer - The Stripe customer object.
 * @returns {Promise<User>} - A promise that resolves to the created user object.
 * @throws {Error} - Throws an error if the user creation or subscription process fails.
 */
export async function createUserWithStripeCustomer(customer: Stripe.Customer): Promise<User> {
  const userId = v1.generate() as string;
  const now = new Date().toISOString();

  const newUser: User = {
    id: userId,
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    stripeCustomerId: customer.id,
    availableHours: defaultAvailableHours,
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(['users', userId], newUser);

  // Update Stripe customer metadata with the user ID
  await stripe.customers.update(customer.id, {
    metadata: {
      userId: userId,
    },
  });

  // Create a subscription with the plan price ID 'free'
  await stripe.subscriptions.create({
    customer: customer.id,
    items: [
      {
        price: Deno.env.get("STRIPE_FREE_PLAN_PRICE_ID") || "",
      },
    ],
  });

  return newUser;
}
