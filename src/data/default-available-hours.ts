import { User } from '../types.ts';

/**
 * Default available hours for a user.
 * 
 * @constant {User['availableHours']} defaultAvailableHours - The default available hours for a user.
 */
export const defaultAvailableHours: User['availableHours'] = {
  monday: [{ start: '09:00', end: '18:00' }],
  tuesday: [{ start: '09:00', end: '18:00' }],
  wednesday: [{ start: '09:00', end: '18:00' }],
  thursday: [{ start: '09:00', end: '18:00' }],
  friday: [{ start: '09:00', end: '18:00' }],
};