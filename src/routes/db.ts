import { Router } from 'express';
import { kv } from '../config/kv.ts';
import { Request, Response } from 'express';
import { Appointment, Contact, Service, User } from '../types.ts';

const dbRouter = Router();

/**
 * Route to reset and clear the Deno KV store.
 * @route GET /reset-kv
 * @group Database - Operations related to the database
 * @returns {object} 200 - KV store reset successfully
 * @returns {Error}  500 - Failed to reset KV store
 */
dbRouter.get('/db/reset', async (_: Request, res: Response) => {
  console.log('[RESET-KV] Starting KV store reset');

  try {
    const entries = {
      users: kv.list<User>({ prefix: ["users"] }),
      appointments: kv.list<Appointment>({ prefix: ["appointments"] }),
      contacts: kv.list<Contact>({ prefix: ["contacts"] }),
      services: kv.list<Service>({ prefix: ["services"] }),
    };

    for (const key of Object.keys(entries)) {
      for await (const res of entries[key as keyof typeof entries]) {
        await kv.delete(res.key);
      }
    }

    console.log('[RESET-KV] KV store reset successfully');
    res.send({ message: 'KV store reset successfully' });
  } catch (error) {
    console.error(`[RESET-KV] Error resetting KV store: ${error}`);
    res.status(500).json({ error: 'Failed to reset KV store' });
  }
});

/**
 * Route to view the contents of the Deno KV store.
 * @route GET /db/view
 * @group Database - Operations related to the database
 * @returns {object} 200 - KV store fetched successfully
 * @returns {Error}  500 - Failed to fetch KV store
 */
dbRouter.get('/db/view', async (_: Request, res: Response) => {
  console.log('[DB-VIEW] Starting KV store fetch');

  try {
    const data: {
      users: User[],
      appointments: Appointment[],
      contacts: Contact[],
      services: Service[],
    } = {
      users: [],
      appointments: [],
      contacts: [],
      services: [],
    }

    const entries = {
      users: kv.list<User>({ prefix: ["users"] }),
      appointments: kv.list<Appointment>({ prefix: ["appointments"] }),
      contacts: kv.list<Contact>({ prefix: ["contacts"] }),
      services: kv.list<Service>({ prefix: ["services"] }),
    };

    for (const key of Object.keys(entries)) {
      for await (const res of entries[key as keyof typeof entries]) {
        data[key as keyof typeof data].push(res.value as any);
      }
    }

    console.log('[DB-VIEW] KV store fetched successfully');

    res.send({ 
      message: 'KV store fetched successfully',
      data,
     });
  } catch (error) {
    console.error(`[DB-VIEW] Error fetching KV store: ${error}`);
    res.status(500).json({ error: 'Failed to fetch KV store' });
  }
});


export { dbRouter };