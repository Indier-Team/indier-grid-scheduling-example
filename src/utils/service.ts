import { kv } from "../config/kv.ts";
import { Service } from "../types.ts";

/**
 * Lists all services for a given user.
 * 
 * @param {string} userId - The ID of the user whose services are to be listed.
 * @returns {Promise<Service[]>} - A promise that resolves to an array of services.
 */
export async function listUserServices(userId: string): Promise<Service[]> {
  const records = kv.list<Service>({ prefix: ['services', userId] });
  
  const services: Service[] = [];
  for await (const res of records) {
    services.push(res.value as Service);
  }

  return services;
}
