/**
 * Unit tests for account.service.ts
 * Tests profile management and address CRUD with ownership enforcement.
 */

import {
  getAccountProfile,
  updateAccountProfile,
  listAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '@/lib/services/account.service';

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    address: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from '@/lib/db/prisma';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  role: 'CUSTOMER',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAddress = {
  id: 'addr-1',
  userId: 'user-1',
  fullName: 'Alice Smith',
  phone: '+1234567890',
  country: 'US',
  city: 'New York',
  addressLine: '123 Main St',
  postalCode: '10001',
  isDefault: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ─── getAccountProfile ────────────────────────────────────────────────────────

describe('getAccountProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns safe user profile', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    const result = await getAccountProfile('user-1');
    expect(result.id).toBe('user-1');
    expect(result.email).toBe('alice@example.com');
  });

  it('throws NotFoundError when user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(getAccountProfile('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── updateAccountProfile ─────────────────────────────────────────────────────

describe('updateAccountProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates name successfully', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    const updated = { ...mockUser, name: 'Alice Johnson' };
    (prisma.user.update as jest.Mock).mockResolvedValue(updated);

    const result = await updateAccountProfile('user-1', { name: 'Alice Johnson' });
    expect(result.name).toBe('Alice Johnson');
  });

  it('updates email successfully when not taken', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    const updated = { ...mockUser, email: 'newemail@example.com' };
    (prisma.user.update as jest.Mock).mockResolvedValue(updated);

    const result = await updateAccountProfile('user-1', { email: 'newemail@example.com' });
    expect(result.email).toBe('newemail@example.com');
  });

  it('throws ConflictError when email already taken', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-2', email: 'taken@example.com' });

    await expect(
      updateAccountProfile('user-1', { email: 'taken@example.com' })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('normalizes email to lowercase', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, email: 'alice@example.com' });

    await updateAccountProfile('user-1', { email: 'ALICE@EXAMPLE.COM' });
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: 'alice@example.com' }),
      })
    );
  });
});

// ─── listAddresses ────────────────────────────────────────────────────────────

describe('listAddresses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns user addresses ordered by default first', async () => {
    (prisma.address.findMany as jest.Mock).mockResolvedValue([mockAddress]);
    const result = await listAddresses('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].isDefault).toBe(true);
  });

  it('returns empty array when no addresses', async () => {
    (prisma.address.findMany as jest.Mock).mockResolvedValue([]);
    const result = await listAddresses('user-1');
    expect(result).toHaveLength(0);
  });
});

// ─── getAddressById ───────────────────────────────────────────────────────────

describe('getAddressById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns address when owned by user', async () => {
    (prisma.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);
    const result = await getAddressById('addr-1', 'user-1');
    expect(result.id).toBe('addr-1');
  });

  it('throws NotFoundError when address does not exist', async () => {
    (prisma.address.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(getAddressById('nonexistent', 'user-1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws ForbiddenError when address belongs to another user (IDOR prevention)', async () => {
    (prisma.address.findUnique as jest.Mock).mockResolvedValue({ ...mockAddress, userId: 'user-2' });
    await expect(getAddressById('addr-1', 'user-1')).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ─── createAddress ────────────────────────────────────────────────────────────

describe('createAddress', () => {
  const validInput = {
    fullName: 'Alice Smith',
    phone: '+1234567890',
    country: 'US',
    city: 'New York',
    addressLine: '123 Main St',
    isDefault: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default transaction mock — executes the callback immediately
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      // Create a mock tx proxy
      const tx = {
        address: {
          create: jest.fn().mockResolvedValue(mockAddress),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          count: jest.fn().mockResolvedValue(0),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });
  });

  it('creates first address and marks it as default', async () => {
    const result = await createAddress('user-1', validInput);
    expect(result.id).toBe('addr-1');
    expect(result.isDefault).toBe(true);
  });
});

// ─── updateAddress ────────────────────────────────────────────────────────────

describe('updateAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        address: {
          findUnique: jest.fn().mockResolvedValue({ id: 'addr-1', userId: 'user-1' }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          update: jest.fn().mockResolvedValue({ ...mockAddress, city: 'Boston' }),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });
  });

  it('updates address fields successfully', async () => {
    const result = await updateAddress('addr-1', 'user-1', { city: 'Boston' });
    expect(result.city).toBe('Boston');
  });
});

// ─── deleteAddress ────────────────────────────────────────────────────────────

describe('deleteAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes owned address', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        address: {
          findUnique: jest.fn().mockResolvedValue({ id: 'addr-1', userId: 'user-1', isDefault: false }),
          delete: jest.fn().mockResolvedValue({}),
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });
    await expect(deleteAddress('addr-1', 'user-1')).resolves.not.toThrow();
  });

  it('throws ForbiddenError when deleting another user\'s address', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        address: {
          findUnique: jest.fn().mockResolvedValue({ id: 'addr-1', userId: 'user-2', isDefault: false }),
          delete: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });
    await expect(deleteAddress('addr-1', 'user-1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws NotFoundError when address does not exist', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        address: {
          findUnique: jest.fn().mockResolvedValue(null),
          delete: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });
    await expect(deleteAddress('nonexistent', 'user-1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── setDefaultAddress ────────────────────────────────────────────────────────

describe('setDefaultAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        address: {
          findUnique: jest.fn().mockResolvedValue({ id: 'addr-1', userId: 'user-1' }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          update: jest.fn().mockResolvedValue({ ...mockAddress, isDefault: true }),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });
  });

  it('sets address as default', async () => {
    const result = await setDefaultAddress('addr-1', 'user-1');
    expect(result.isDefault).toBe(true);
  });

  it('throws ForbiddenError for another user\'s address', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        address: {
          findUnique: jest.fn().mockResolvedValue({ id: 'addr-1', userId: 'user-2' }),
          updateMany: jest.fn(),
          update: jest.fn(),
        },
      };
      return fn(tx as unknown as typeof prisma);
    });
    await expect(setDefaultAddress('addr-1', 'user-1')).rejects.toMatchObject({ statusCode: 403 });
  });
});
