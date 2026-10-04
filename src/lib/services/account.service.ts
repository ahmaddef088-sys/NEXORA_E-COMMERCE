/**
 * Account service — user profile management and address CRUD.
 *
 * Security contract:
 * - All operations require authentication (enforced by route handlers).
 * - Users can only access their own account and addresses (ownership enforced here).
 * - Never returns passwordHash or salt.
 * - Email uniqueness is enforced on update.
 */

import { prisma } from '@/lib/db/prisma';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors/HttpError';
import { logger } from '@/lib/logger';
import type { UpdateAccountInput, CreateAddressInput, UpdateAddressInput } from '@/lib/validation/account.schema';
import type { SafeUser } from '@/types';

// ─── Account ──────────────────────────────────────────────────────────────────

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Get a user's profile (safe — no password fields).
 */
export async function getAccountProfile(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw NotFoundError('Account');
  }

  return user as SafeUser;
}

/**
 * Update a user's profile (name and/or email).
 * Enforces email uniqueness.
 */
export async function updateAccountProfile(
  userId: string,
  input: UpdateAccountInput
): Promise<SafeUser> {
  // Email uniqueness check
  if (input.email) {
    const normalized = input.email.toLowerCase().trim();
    const conflict = await prisma.user.findFirst({
      where: { email: normalized, NOT: { id: userId } },
    });
    if (conflict) {
      throw ConflictError('An account with this email already exists');
    }
    input = { ...input, email: normalized };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
    },
    select: userSelect,
  });

  logger.info('Account profile updated', { userId });

  return updated as SafeUser;
}

// ─── Address types ────────────────────────────────────────────────────────────

export type SafeAddress = {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  addressLine: string;
  postalCode: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const addressSelect = {
  id: true,
  userId: true,
  fullName: true,
  phone: true,
  country: true,
  city: true,
  addressLine: true,
  postalCode: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── List addresses ───────────────────────────────────────────────────────────

export async function listAddresses(userId: string): Promise<SafeAddress[]> {
  const addresses = await prisma.address.findMany({
    where: { userId },
    select: addressSelect,
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  return addresses as SafeAddress[];
}

// ─── Get address ──────────────────────────────────────────────────────────────

export async function getAddressById(addressId: string, userId: string): Promise<SafeAddress> {
  const address = await prisma.address.findUnique({
    where: { id: addressId },
    select: addressSelect,
  });

  if (!address) {
    throw NotFoundError('Address');
  }

  // Ownership check — prevent IDOR
  if (address.userId !== userId) {
    throw ForbiddenError('Access denied');
  }

  return address as SafeAddress;
}

// ─── Create address ───────────────────────────────────────────────────────────

export async function createAddress(
  userId: string,
  input: CreateAddressInput
): Promise<SafeAddress> {
  return prisma.$transaction(async (tx) => {
    // If this is the first address or marked as default, unset existing defaults
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If no addresses exist yet, make this one default regardless
    const count = await tx.address.count({ where: { userId } });
    const makeDefault = input.isDefault || count === 0;

    const address = await tx.address.create({
      data: {
        userId,
        fullName: input.fullName,
        phone: input.phone,
        country: input.country,
        city: input.city,
        addressLine: input.addressLine,
        postalCode: input.postalCode ?? null,
        isDefault: makeDefault,
      },
      select: addressSelect,
    });

    logger.info('Address created', { userId, addressId: address.id });
    return address as SafeAddress;
  });
}

// ─── Update address ───────────────────────────────────────────────────────────

export async function updateAddress(
  addressId: string,
  userId: string,
  input: UpdateAddressInput
): Promise<SafeAddress> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findUnique({
      where: { id: addressId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      throw NotFoundError('Address');
    }

    if (existing.userId !== userId) {
      throw ForbiddenError('Access denied');
    }

    // If marking as default, unset others
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await tx.address.update({
      where: { id: addressId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.addressLine !== undefined ? { addressLine: input.addressLine } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      },
      select: addressSelect,
    });

    logger.info('Address updated', { userId, addressId });
    return updated as SafeAddress;
  });
}

// ─── Delete address ───────────────────────────────────────────────────────────

export async function deleteAddress(addressId: string, userId: string): Promise<void> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findUnique({
      where: { id: addressId },
      select: { id: true, userId: true, isDefault: true },
    });

    if (!existing) {
      throw NotFoundError('Address');
    }

    if (existing.userId !== userId) {
      throw ForbiddenError('Access denied');
    }

    await tx.address.delete({ where: { id: addressId } });

    // If the deleted address was default, make the most recent remaining address default
    if (existing.isDefault) {
      const nextAddress = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (nextAddress) {
        await tx.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    logger.info('Address deleted', { userId, addressId });
  });
}

// ─── Set default address ──────────────────────────────────────────────────────

export async function setDefaultAddress(addressId: string, userId: string): Promise<SafeAddress> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findUnique({
      where: { id: addressId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      throw NotFoundError('Address');
    }

    if (existing.userId !== userId) {
      throw ForbiddenError('Access denied');
    }

    // Unset all defaults for this user
    await tx.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await tx.address.update({
      where: { id: addressId },
      data: { isDefault: true },
      select: addressSelect,
    });

    logger.info('Default address set', { userId, addressId });
    return updated as SafeAddress;
  });
}
