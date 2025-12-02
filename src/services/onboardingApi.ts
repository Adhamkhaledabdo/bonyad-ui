import { API_ENDPOINTS, buildApiUrl } from '../config/api';

interface AvailabilitySlotPayload {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

interface AvailabilityPayload {
  status: 'AVAILABLE_ANYTIME' | 'FIXED_TIMES';
  slots?: AvailabilitySlotPayload[];
}

export interface Service {
  id: number;
  nameEn: string;
  nameAr?: string;
  description?: string;
}

export interface SubscriptionPlan {
  id: number;
  nameEn: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  price: number;
  finalPrice: number;
  hasActiveDiscount?: boolean;
  hasLimitedTimeDiscount?: boolean;
  discountTimeRemainingSeconds?: number;
}

const withAuthHeaders = (token: string, headers: Record<string, string> = {}) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  ...headers,
});

const replaceUserId = (endpoint: string, userId: number) => endpoint.replace(':userId', String(userId));

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  if (!response.ok) {
    const errorText = await response.text();
    let message = 'Request failed';
    if (contentType?.includes('application/json')) {
      try {
        const json = JSON.parse(errorText);
        message = json.message || json.error || message;
      } catch {
        message = errorText || message;
      }
    } else {
      message = errorText || message;
    }
    throw new Error(message);
  }

  if (contentType?.includes('application/json')) {
    return response.json();
  }

  // @ts-expect-error - allow returning void
  return undefined;
}

export async function getOnboardingStatus(token: string, userId: number): Promise<{ userId: number; completed: boolean; currentStep?: number }> {
  const endpoint = replaceUserId(API_ENDPOINTS.ONBOARDING.STATUS, userId);
  const res = await fetch(buildApiUrl(endpoint), {
    method: 'GET',
    headers: withAuthHeaders(token),
  });
  return handleResponse(res);
}

export async function markOnboardingComplete(token: string, userId: number): Promise<void> {
  const endpoint = replaceUserId(API_ENDPOINTS.ONBOARDING.COMPLETE, userId);
  const res = await fetch(buildApiUrl(endpoint), {
    method: 'PUT',
    headers: withAuthHeaders(token),
  });
  await handleResponse(res);
}

export async function saveAvailability(token: string, payload: AvailabilityPayload): Promise<void> {
  try {
    console.log('📤 [Onboarding] Saving availability with payload:', JSON.stringify(payload, null, 2));
  } catch (error) {
    console.log('📤 [Onboarding] Saving availability (payload too large to stringify)');
  }
  const res = await fetch(buildApiUrl(API_ENDPOINTS.TECHNICIANS.SET_AVAILABILITY), {
    method: 'POST',
    headers: withAuthHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  console.log('📥 [Onboarding] Availability response status:', res.status, res.statusText);
  await handleResponse(res);
  console.log('✅ [Onboarding] Availability saved successfully');
}

export async function fetchServices(token: string): Promise<Service[]> {
  const res = await fetch(buildApiUrl(API_ENDPOINTS.SERVICES.LIST), {
    method: 'GET',
    headers: withAuthHeaders(token),
  });
  return handleResponse(res);
}

export async function saveServices(token: string, serviceIds: number[]): Promise<void> {
  const res = await fetch(buildApiUrl(API_ENDPOINTS.TECHNICIANS.ADD_SERVICES), {
    method: 'POST',
    headers: withAuthHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ serviceIds }),
  });
  await handleResponse(res);
}

export async function fetchSubscriptionPlans(token: string): Promise<SubscriptionPlan[]> {
  const res = await fetch(buildApiUrl(API_ENDPOINTS.SUBSCRIPTIONS.CATEGORIES), {
    method: 'GET',
    headers: withAuthHeaders(token),
  });
  return handleResponse(res);
}

export async function subscribeToPlan(token: string, planId: number, durationMonths: number = 1): Promise<void> {
  const res = await fetch(buildApiUrl(API_ENDPOINTS.TECHNICIANS.SUBSCRIBE), {
    method: 'POST',
    headers: withAuthHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ subscriptionCategoryId: planId, durationMonths }),
  });
  await handleResponse(res);
}


