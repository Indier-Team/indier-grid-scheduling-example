/**
 * Initializes and exports the key-value store using Deno's openKv function.
 * 
 */

// @ts-expect-error This is a top-level await, which might cause a TypeScript error.
export const kv = await Deno.openKv();
