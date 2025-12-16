// API Configuration
// Production API endpoint

import { Platform } from 'react-native';

const getBaseUrl = () => {
  // API URL - Production API endpoint
  return 'https://www.bonyad-hub.com/api';
};

export const API_BASE_URL = getBaseUrl();

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/users/register',
    REGISTER_WITH_FILES: '/users/register-with-files',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    FORGOT_PASSWORD_RESEND: '/auth/forgot-password/resend',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_OTP: '/auth/verify-otp',
    RESEND_OTP: '/auth/resend-otp',
    REFRESH_TOKEN: '/auth/refresh-token',
    VALIDATE_TOKEN: '/auth/validate-token',
  },
  
  // User Profile
  USER: {
    PROFILE: '/users/profile',
    PROFILE_BY_ID: '/users/:id/profile',
    UPDATE_PROFILE: '/users/profile',
    PROFILE_IMAGE: '/users/update-profile-image',
    CHANGE_PHONE_REQUEST: '/users/:userId/change-phone-request',
    CHANGE_PHONE_VERIFY: '/users/:userId/change-phone-verify',
    CHANGE_PASSWORD: '/users/:userId/change-password',
    USER_DETAILS: '/user-details',
  },
  
  // Zones (Regions)
  ZONES: {
    LIST: '/regions',
  },
  
  // Projects
  PROJECTS: {
    LIST: '/projects',
    CREATE: '/projects/create',
    UPDATE: '/projects/:id',
    DELETE: '/projects/:id',
    DETAILS: '/projects/:id',
    OWNER_EDIT: '/projects/:id/owner-edit',
    COMPLETE: '/projects/:id/complete',
    PHASES: '/phases',
    PROJECT_PHASES: '/projects/:id/phases',
    MY_PROJECTS: '/projects/my',
    MY_ASSIGNED: '/projects/my-assigned',
  },
  
  // Bids
  BIDS: {
    CREATE: '/bids/create',
    LIST: '/bids/project/:projectId',
    MY_BIDS: '/bids/my',
    UPDATE: '/bids/:id',
    DELETE: '/bids/:id',
    ACCEPT: '/bids/:id/accept',
  },
  
  // Visit Requests
  VISIT_REQUESTS: {
    CREATE: '/visit-requests',
    LIST: '/visit-requests/project/:projectId',
    UPDATE: '/visit-requests/:id',
    DELETE: '/visit-requests/:id',
  },
  
  // Chat
  CHAT: {
    MY_CHATS: '/chat/my-chats',
    MESSAGES: '/chat/room/:roomId/messages',
    SEND: '/chat/send',
    SEND_WITH_FILE: '/chat/send-with-file',
    MARK_READ: '/chat/messages/:messageId/mark-read',
    MARK_ALL_READ: '/chat/rooms/:roomId/mark-all-read',
  },
  
  // Services
  SERVICES: {
    LIST: '/services',
    CATEGORIES: '/services/categories',
  },
  
  // Technicians
  TECHNICIANS: {
    LIST: '/technicians',
    SEARCH: '/technicians/search',
    DETAILS: '/technicians/:id',
    REVIEWS: '/technicians/:id/reviews',
    SERVICES: '/technician/services/my-services',
    ADD_SERVICES: '/technician/services/add',
    REMOVE_SERVICE: '/technicians/services/:serviceId',
    AVAILABILITY: '/technicians/availability',
    ADD_AVAILABILITY: '/technicians/availability',
    SET_AVAILABILITY: '/technicians/availability/set',
    ADD_AVAILABILITY_BULK: '/technicians/availability/bulk',
    DELETE_AVAILABILITY: '/technicians/availability/:slotId',
    SUBSCRIPTION: '/users/subscription',
    SUBSCRIBE: '/users/subscribe',
    CANCEL_SUBSCRIPTION: '/users/subscription',
    SUBSCRIPTION_BIDS: '/users/subscription/bids',
    RESERVATIONS: '/technician/reservations/:id/:action',
  },
  
  // Portfolio
  PORTFOLIO: {
    CREATE: '/portfolios/create',
    MY: '/portfolios/my',
    BY_USER: '/portfolios/user/:userId',
    UPDATE: '/portfolios/update',
    ADD_PROJECT: '/portfolios/projects/add',
    UPDATE_PROJECT: '/portfolios/projects/:projectId',
    DELETE_PROJECT: '/portfolios/projects/:projectId',
    MY_PROJECTS: '/portfolios/projects/my',
    USER_PROJECTS: '/portfolios/projects/user/:userId',
    UPLOAD_PHOTO: '/portfolios/projects/upload-photo',
  },
  
  // Reviews
  REVIEWS: {
    CREATE: '/reviews',
    BY_USER: '/reviews/user/:userId',
    STATUS_BY_PROJECT: '/reviews/project/:projectId/status',
    MY_REVIEWS: '/reviews/my-reviews',
    REVIEW_DETAIL: '/reviews/:reviewId',
  },
  
  // Phases
  PHASES: {
    LIST: '/phases/project/:projectId',
    CREATE: '/phases',
    UPDATE: '/phases/:phaseId',
    DELETE: '/phases/:phaseId',
    APPROVE_ALL: '/phases/project/:projectId/approve-all',
    COMPLETE: '/phases/:phaseId/complete',
    PAY: '/phases/:phaseId/pay',
  },
  
  // Feedbacks
  FEEDBACKS: {
    CREATE: '/feedbacks',
    LIST: '/feedbacks/project/:projectId',
    PENDING: '/feedbacks/project/:projectId/pending',
    RESOLVE: '/feedbacks/:feedbackId/resolve',
  },
  
  // Contracts/Signatures
  CONTRACTS: {
    CREATE: '/signatures',
    STATUS: '/signatures/:projectId/status',
    VIEW: '/contracts/:projectId',
    GENERATE_PDF: '/contracts/test/generate-pdf',
  },
  
  // Notifications
  NOTIFICATIONS: {
    MY_NOTIFICATIONS: '/notifications/my-notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/mark-all-read',
    DELETE: '/notifications/:id',
  },
  
  // Appointments (Time Requests)
  APPOINTMENTS: {
    MY_REQUESTS: '/time-requests/my-requests',
    FOR_ME: '/time-requests/for-me',
    MY_BOOKINGS: '/time-requests/my-bookings',
    UPCOMING: '/time-requests/upcoming-appointments',
    COMPLETED: '/time-requests/completed-appointments',
    ACCEPT: '/time-requests/:id/accept',
    REJECT: '/time-requests/:id/reject',
    COMPLETE: '/time-requests/appointments/:id/complete',
    DELETE: '/time-requests/:id',
    CREATE: '/time-requests',
  },
  
  // Technician Availability (Public)
  TECHNICIAN_AVAILABILITY: '/technicians/:id/availability',

  SUBSCRIPTIONS: {
    CATEGORIES: '/subscriptions/categories',
  },

  // Onboarding
  ONBOARDING: {
    STATUS: '/onboarding/:userId',
    COMPLETE: '/onboarding/:userId/complete',
  },
  
  // AI Features
  AI: {
    VOICE_TRANSCRIBE: '/ai/speech/transcribe',
    VOICE_TRANSCRIBE_AND_CHAT: '/ai/speech/transcribe-and-chat',
    VOICE_SPEECH: '/ai/voice/speech',
    COST_ESTIMATE: '/ai/cost/estimate',
    ROOM_DESIGN: '/ai/design/generate',
    CHAT: '/ai/chat',
    CHAT_SERVICES: '/ai/chat/services',
    CHAT_SUGGESTIONS: '/ai/chat/suggestions',
    CHAT_RECOMMENDATIONS: '/ai/chat/recommendations',
    MAP_SUMMARIZE: '/ai/map/summarize',
    MAP_PROJECTS: '/ai/map/projects',
  },
};

// Export getApiUrl for convenience
export const getApiUrl = (): string => {
  return getBaseUrl();
};

// Helper function to get server base URL (without /api)
export const getServerBaseUrl = (): string => {
  return API_BASE_URL.replace('/api', '');
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function to build URL with parameters
export const buildApiUrlWithParams = (endpoint: string, params: Record<string, string | number>): string => {
  let url = `${API_BASE_URL}${endpoint}`;
  
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, String(value));
  });
  
  return url;
};

