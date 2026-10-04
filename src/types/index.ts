/**
 * Shared TypeScript types used across the application.
 * Service layer types, API payload types, and utility types.
 */

// ─── Authentication ───────────────────────────────────────────────────────────

export type UserRole = 'CUSTOMER' | 'ADMIN';

/** The decoded session payload embedded in the JWT cookie */
export type SessionPayload = {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
};

/** Safe user object — never includes passwordHash or salt */
export type SafeUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type PaymentMethod = 'CARD' | 'CASH' | 'BANK_TRANSFER' | 'PAYPAL';

// ─── Inventory ───────────────────────────────────────────────────────────────

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';

// ─── Coupons ─────────────────────────────────────────────────────────────────

export type CouponType = 'PERCENTAGE' | 'FIXED';

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'ORDER_CREATED'
  | 'PAYMENT_SUCCESSFUL'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'LOW_STOCK';

// ─── API Utilities ────────────────────────────────────────────────────────────

/** Context attached to authenticated requests */
export type AuthContext = {
  userId: string;
  email: string;
  role: UserRole;
};

/** Generic sort options */
export type SortOrder = 'asc' | 'desc';
