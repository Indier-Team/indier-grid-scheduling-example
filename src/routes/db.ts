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
    const entries = kv.list({});
    for await (const entry of entries) {
      await kv.delete(entry.key);
    }
    console.log('[RESET-KV] KV store reset successfully');
    res.send({ message: 'KV store reset successfully' });
  } catch (error) {
    console.error(`[RESET-KV] Error resetting KV store: ${error}`);
    res.status(500).json({ error: 'Failed to reset KV store' });
  }
});

export { dbRouter };