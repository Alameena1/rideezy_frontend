// API Base URLs
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const CLIENT_API_BASE_URL = '/api'; // For client-side API routes

// Authentication Routes
export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  GOOGLE_AUTH: '/auth/google-auth',
  VERIFY_OTP: '/auth/verify-otp',
  RESEND_OTP: '/auth/resend-otp',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
} as const;

// Vehicle Routes
export const VEHICLE_ROUTES = {
  BASE: '/vehicles',
  GET_ALL: '/vehicles',
  CREATE: '/vehicles',
  UPDATE: (id: string) => `/vehicles/${id}`,
  DELETE: (id: string) => `/vehicles/${id}`,
  REAPPLY: (id: string) => `/vehicles/${id}/reapply`,
} as const;

// User Routes
export const USER_ROUTES = {
  PROFILE: '/user/profile',
  GET_USER: (id: string) => `/user/${id}`,
  UPDATE_PROFILE: '/user/profile',
  SUBMIT_GOV_ID: '/user/profile',
} as const;

// Tracking Routes
export const TRACKING_ROUTES = {
  START: (rideId: string) => `/tracking/${rideId}/start`,
  UPDATE_POSITION: (rideId: string) => `/tracking/${rideId}/position`,
  GET_STATUS: (rideId: string) => `/tracking/${rideId}/status`,
  GET_POSITION: (rideId: string) => `/tracking/${rideId}/position`,
  STOP: (rideId: string) => `/tracking/${rideId}/stop`,
} as const;

// Subscription Routes
export const SUBSCRIPTION_ROUTES = {
  PLANS: '/subscriptions/plans',
  CHECK: (userId: string) => `/subscriptions/check/${userId}`,
  CREATE_ORDER: '/subscriptions/create-order',
  VERIFY: '/subscriptions/verify',
  SUBSCRIBE_WALLET: '/subscriptions/subscribe-wallet',
  STATUS: '/subscriptions/status',
} as const;

// Ride Routes
export const RIDE_ROUTES = {
  // Initiate Rides
  START_RIDE: '/initiate-rides/start',
  GET_RIDES: '/initiate-rides/rides',
  UPDATE_RIDE: (id: string) => `/initiate-rides/${id}/update`,
  EDIT_RIDE: (id: string) => `/initiate-rides/${id}`,
  CANCEL_RIDE: (id: string) => `/initiate-rides/${id}`,
  START_TRACKING: (id: string) => `/initiate-rides/${id}/start-tracking`,

  // Join Rides
  GET_JOINED_RIDES: '/join-rides/joined',
  FIND_NEAREST_RIDES: '/join-rides/nearest',
  JOIN_RIDE: '/join-rides/join',
  HANDLE_JOIN_REQUEST: (rideId: string, passengerId: string) => `/join-rides/${rideId}/requests/${passengerId}`,
  CREATE_RIDE_PAYMENT_ORDER: '/join-rides/create-ride-order',
  VERIFY_AND_JOIN: '/join-rides/verify-and-join',
  CANCEL_JOINED_RIDE: (id: string) => `/join-rides/joined/${id}`,
} as const;

// Notification Routes
export const NOTIFICATION_ROUTES = {
  GET_USER_NOTIFICATIONS: (userId: string) => `/notifications/${userId}`,
  MARK_AS_READ: (id: string) => `/notifications/${id}/read`,
} as const;

//wallet Routes
export const WALLET_ROUTES = {
  BALANCE: (userId: string) => `/wallet/balance/${userId}`,
  TRANSACTIONS: (userId: string) => `/wallet/transactions/${userId}`,
  CREATE_DEPOSIT_ORDER: '/wallet/create-deposit-order',
  DEPOSIT: '/wallet/deposit',
} as const;

// Geo Routes
export const GEO_ROUTES = {
  SEARCH_ADDRESS: 'https://nominatim.openstreetmap.org/search',
  REVERSE_GEOCODE: 'https://nominatim.openstreetmap.org/reverse',
  CALCULATE_ROUTE: '/route',
} as const;

// Chat Routes
export const CHAT_ROUTES = {
  CONVERSATIONS: {
    BASE: '/api/chat/conversations',
    GET: (id: string) => `/api/chat/conversations/${id}`,
    MESSAGES: (id: string) => `/api/chat/conversations/${id}/messages`,
    SEND_MESSAGE: (id: string) => `/api/chat/conversations/${id}/messages`,
    SEND_IMAGE: (id: string) => `/api/chat/conversations/${id}/image`,
    USER_CONVERSATIONS: (userId: string) => `/api/chat/users/${userId}/conversations`,
  },
  MESSAGES: {
    DELETE: (id: string) => `/api/chat/messages/${id}`,
  },
  UPLOAD: {
    IMAGE: '/api/chat/upload-image',
  },
  RIDE_CONVERSATION: '/api/chat/ride-conversation',
} as const;

// External Services
export const EXTERNAL_SERVICES = {
  NOMINATIM: {
    SEARCH: 'https://nominatim.openstreetmap.org/search',
    REVERSE: 'https://nominatim.openstreetmap.org/reverse',
  },
} as const;