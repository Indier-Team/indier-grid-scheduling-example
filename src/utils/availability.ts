import { kv } from "../config/kv.ts";
import { Appointment } from "../types.ts";
import { getUserById } from './user.ts';

/**
 * Checks the availability of a user for a given date, time, and duration.
 * 
 * @async
 * @function checkAvailability
 * @param {string} owner - The owner of the appointment.
 * @param {string} date - The date of the appointment in YYYY-MM-DD format.
 * @param {string} time - The start time of the appointment in HH:MM format.
 * @param {number} duration - The duration of the appointment in minutes.
 * @returns {Promise<boolean>} - A promise that resolves to a boolean indicating whether the time slot is available.
 */
export async function checkAvailability(userId: string, date: string, time: string, duration: number): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) {
    return false;
  }

  const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
  const availableHours = user.availableHours[dayOfWeek];

  if (!availableHours) {
    return false;
  }

  const appointmentStart = new Date(`${date}T${time}`);
  const appointmentEnd = new Date(appointmentStart.getTime() + duration * 60000);

  // Check if the appointment falls within the available hours
  const isWithinAvailableHours = availableHours.some(range => {
    const [startHour, startMinute] = range.start.split(':').map(Number);
    const [endHour, endMinute] = range.end.split(':').map(Number);
    const rangeStart = new Date(appointmentStart);
    rangeStart.setHours(startHour, startMinute, 0, 0);
    const rangeEnd = new Date(appointmentStart);
    rangeEnd.setHours(endHour, endMinute, 0, 0);

    return appointmentStart >= rangeStart && appointmentEnd <= rangeEnd;
  });

  if (!isWithinAvailableHours) {
    return false;
  }

  // Check for conflicts with existing appointments
  const appointments: Appointment[] = [];
  const records = kv.list<Appointment>({ prefix: ['appointments'] });
  
  for await (const entry of records) {
    if(entry.value?.userId === userId) {
      appointments.push(entry.value as Appointment);
    }
  }

  for (const appointment of appointments) {
    const existingStart = new Date(`${appointment.date}T${appointment.time}`);
    const existingEnd = new Date(existingStart.getTime() + appointment.duration * 60000);

    if (appointmentStart < existingEnd && appointmentEnd > existingStart) {
      return false;
    }
  }

  return true;
}