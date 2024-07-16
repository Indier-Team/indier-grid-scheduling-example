import { kv } from "../config/kv.ts";
import { Appointment } from "../types.ts";

/**
 * Lists all schedulings for a given user, optionally filtered by a start and end date.
 * 
 * @param {string} userId - The ID of the user whose schedulings are to be listed.
 * @param {Date} [startDate] - The optional start date to filter the schedulings.
 * @param {Date} [endDate] - The optional end date to filter the schedulings.
 * @returns {Promise<Scheduling[]>} - A promise that resolves to an array of schedulings.
 */
export async function listUserAppointments(userId: string, startDate?: Date, endDate?: Date): Promise<Appointment[]> {
  const records = kv.list<Appointment>({ prefix: ['schedulings', userId] });
  
  const schedulings: Appointment[] = [];
  for await (const res of records) {
    const scheduling = res.value as Appointment;
    if (startDate && new Date(scheduling.date) < startDate) continue;
    if (endDate && new Date(scheduling.date) > endDate) continue;
    schedulings.push(scheduling);
  }

  return schedulings;
}

/**
 * Lists all appointments for a given contact.
 * 
 * @param {string} contactId - The ID of the contact whose appointments are to be listed.
 * @returns {Promise<Appointment[]>} - A promise that resolves to an array of appointments.
 */
export async function listContactAppointments(contactId: string): Promise<Appointment[]> {
  const records = kv.list<Appointment>({ prefix: ['appointments', contactId] });
  
  const appointments: Appointment[] = [];
  for await (const res of records) {
    appointments.push(res.value as Appointment);
  }

  return appointments;
}