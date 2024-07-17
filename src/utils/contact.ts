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
  channelId = channelId.split('@')[0];
  const records = kv.list<Contact>({ prefix: ['contacts', userId] });
  
  const contacts = [];
  for await (const res of records) {
    contacts.push(res.value as Contact);
  }

  return contacts.find((contact) => contact.phone === channelId && contact.userId === userId) || null;
}

/**
 * Upserts a contact in the database.
 * 
 * @param {string} userId - The ID of the user to whom the contact belongs.
 * @param {Contact} contactData - The contact data to upsert.
 * @returns {Promise<Contact>} - A promise that resolves to the upserted contact object.
 * @throws {Error} - Throws an error if the upsert process fails.
 */

export async function upsertContact(userId: string, contactData: { id?: string, name: string, phone: string, email?: string }): Promise<Contact> {
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

/**
 * Lists all contacts for a given user.
 * 
 * @param {string} userId - The ID of the user whose contacts are to be listed.
 * @returns {Promise<Contact[]>} - A promise that resolves to an array of contacts.
 */
export async function listUserContacts(userId: string): Promise<Contact[]> {
  const records = kv.list<Contact>({ prefix: ['contacts'] });
  
  const contacts: Contact[] = [];
  for await (const res of records) {
    if(res.value?.userId === userId) {
      contacts.push(res.value as Contact);
    }
  }

  return contacts;
}

/**
 * Retrieves a contact by its ID for a given user.
 * 
 * @param {string} userId - The ID of the user to whom the contact belongs.
 * @param {string} contactId - The ID of the contact to retrieve.
 * @returns {Promise<Contact | null>} - A promise that resolves to the contact object if found, or null if not found.
 */
export async function getContactById(userId: string, contactId: string): Promise<Contact | null> {
  const contactKey = ['contacts', userId, contactId];
  const contact = await kv.get<Contact>(contactKey);

  return contact.value || null;
}
