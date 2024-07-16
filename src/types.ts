export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;

  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionPriceId?: string;
  stripeCurrentPeriodEnd?: string;
  stripeCurrentPeriodStart?: string;
  stripeSubscriptionStatus?: 'active' | 'inactive' | 'trial';
  
  availableHours: {
    [key: string]: { start: string; end: string }[];
  };

  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;

  userId: string;

  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;

  userId: string;

  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  duration: number;
  
  userId: string;
  contactId: string;
  serviceIds: string[];

  createdAt: string;
  updatedAt: string;
}