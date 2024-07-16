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

    const entries = await Promise.all([
      kv.get<User>(["users"]),
      kv.get<Appointment>(["appointments"]),
      kv.get<Contact>(["contacts"]),
      kv.get<Service>(["services"]),
    ]);

    for (const entry of entries) {
      if (entry.value) {
        const key = Object.keys(entry.value)[0];
        if (key in data) {
          // deno-lint-ignore no-explicit-any
          (data[key as keyof typeof data] as any[]).push(entry.value[key]);
        }
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