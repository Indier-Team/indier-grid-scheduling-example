import Stripe from "npm:stripe@12.18.0";

/**
 * Initializes and exports the Stripe client using the secret key from environment variables.
 * 
 * @constant {Stripe} stripe - The initialized Stripe client.
 * @param {string} apiKey - The secret key for authenticating with the Stripe API.
 * @param {Object} options - Additional options for the Stripe client.
 * @param {string} options.apiVersion - The version of the Stripe API to use.
 */
export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: '2024-04-10',
});