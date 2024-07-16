import { Router } from 'express';
import { kv } from '../config/kv.ts';
import { Request, Response } from 'express';

const dbRouter = Router();

/**
 * Route to reset and clear the Deno KV store.
 * @route GET /reset-kv
 * @group Database - Operations related to the database
 * @returns {object} 200 - KV store reset successfully
 * @returns {Error}  500 - Failed to reset KV store
 */
dbRouter.get('/reset-kv', async (req: Request, res: Response) => {
  console.log('[RESET-KV] Starting KV store reset');

  try {
    const entries = Promise.all([
      kv.get(["users"]),
      kv.get(["appointments"]),
      kv.get(["contacts"]),
      kv.get(["services"]),
    ])

    for (const entry of await entries) {
      if (entry.value) {
        for (const key of Object.keys(entry.value)) {
          await kv.delete([key]);
        }
      }
    }

    console.log('[RESET-KV] KV store reset successfully');
    res.send({ message: 'KV store reset successfully' });
  } catch (error) {
    console.error(`[RESET-KV] Error resetting KV store: ${error}`);
    res.status(500).json({ error: 'Failed to reset KV store' });
  }
});

export { dbRouter };