import { kv } from "../config/kv.ts";
import { Contact } from "../types.ts";
import { v1 } from "https://deno.land/std@0.177.0/uuid/mod.ts";

/**
 * Retrieves a contact by their channel ID.
 * 
 * @param {string} channelId - The channel ID of the contact.
 * @returns {Promise<Contact | null>} - A promise that resolves to the contact if found, otherwise null.
 */
export async function getContactByChannel(userId: string, channelId: string): Promise<Contact | null> {
  const contacts = await kv.get<Contact>(['contacts', userId]);

  for (const contact of contacts) {
    if (contact.value.phone === channelId && contact.value.userId === userId) {
      return contact.value;
    }
  }

  return null;
}

/**
 * Upserts a contact in the database.
 * 
 * @param {string} userId - The ID of the user to whom the contact belongs.
 * @param {Contact} contactData - The contact data to upsert.
 * @returns {Promise<Contact>} - A promise that resolves to the upserted contact object.
 * @throws {Error} - Throws an error if the upsert process fails.
 */

export async function upsertContact(userId: string, contactData: { name: string, phone: string, email?: string }): Promise<Contact> {
  const existingContact = await getContactByChannel(userId, contactData.phone);

  const now = new Date().toISOString();
  const contact: Contact = {
    ...existingContact,
    ...contactData,
    id: existingContact ? existingContact.id : v1.generate() as string,
    userId,
    updatedAt: now,
    createdAt: existingContact ? existingContact.createdAt : now,
  };

  await kv.set(['contacts', userId, contact.id], contact);
  return contact;
}

