import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateInviteDto } from './invites.dto';
import { InvitesService } from './invites.service';

describe('CreateInviteDto — phone field validation', () => {
  function toDto(plain: Record<string, unknown>): CreateInviteDto {
    return plainToInstance(CreateInviteDto, plain);
  }

  it('should pass with a valid international phone number', async () => {
    const dto = toDto({
      email: 'test@example.com',
      role: 'FIELD_WORKER',
      phone: '+233241234567',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass when phone is omitted entirely', async () => {
    const dto = toDto({
      email: 'test@example.com',
      role: 'FIELD_WORKER',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when phone is an empty string (does not match regex)', async () => {
    const dto = toDto({
      email: 'test@example.com',
      role: 'FIELD_WORKER',
      phone: '',
    });
    const errors = await validate(dto);
    const phoneError = errors.find((e) => e.property === 'phone');
    expect(phoneError).toBeDefined();
  });

  it('should fail when phone contains letters', async () => {
    const dto = toDto({
      email: 'test@example.com',
      role: 'FIELD_WORKER',
      phone: '+233abc1234',
    });
    const errors = await validate(dto);
    const phoneError = errors.find((e) => e.property === 'phone');
    expect(phoneError).toBeDefined();
  });

  it('should fail when phone is too short (< 7 digits)', async () => {
    const dto = toDto({
      email: 'test@example.com',
      role: 'FIELD_WORKER',
      phone: '12345',
    });
    const errors = await validate(dto);
    const phoneError = errors.find((e) => e.property === 'phone');
    expect(phoneError).toBeDefined();
  });

  it('should pass with a valid local number (no + prefix)', async () => {
    const dto = toDto({
      email: 'test@example.com',
      role: 'FIELD_WORKER',
      phone: '0241234567',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});

describe('InvitesService.create() — phone storage', () => {
  function buildService() {
    const mockPrisma = {
      user: { findFirst: jest.fn().mockResolvedValue(null) },
      invite: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'inv-1',
          token: 'tok-1',
          tenant: { name: 'Test Org' },
          invitedBy: { name: 'Admin' },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'inv-1',
          token: 'tok-rotated',
          tenant: { name: 'Test Org' },
          invitedBy: { name: 'Admin' },
        }),
      },
    };
    const mockEmail = { enabled: false, sendInvite: jest.fn() };
    const service = new InvitesService(mockPrisma as never, mockEmail as never);
    return { service, mockPrisma };
  }

  it('should store phone as null when phone is undefined', async () => {
    const { service, mockPrisma } = buildService();
    await service.create('t1', 'u1', 'OWNER', {
      email: 'a@b.com',
      role: 'FIELD_WORKER',
    });
    expect(mockPrisma.invite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: null }),
      }),
    );
  });

  it('should store the phone value when a valid phone is provided', async () => {
    const { service, mockPrisma } = buildService();
    await service.create('t1', 'u1', 'OWNER', {
      email: 'a@b.com',
      role: 'FIELD_WORKER',
      phone: '+233241234567',
    });
    expect(mockPrisma.invite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: '+233241234567' }),
      }),
    );
  });

  it('should store phone as null when phone is an empty string', async () => {
    const { service, mockPrisma } = buildService();
    await service.create('t1', 'u1', 'OWNER', {
      email: 'a@b.com',
      role: 'FIELD_WORKER',
      phone: '',
    });
    // `'' || null` evaluates to `null`
    expect(mockPrisma.invite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: null }),
      }),
    );
  });
});

describe('InvitesService.create() — refresh on existing active invite', () => {
  function buildServiceWithExisting() {
    const existingInvite = {
      id: 'inv-existing',
      token: 'old-token',
      email: 'a@b.com',
      tenantId: 't1',
    };
    const mockPrisma = {
      user: { findFirst: jest.fn().mockResolvedValue(null) },
      invite: {
        findFirst: jest.fn().mockResolvedValue(existingInvite),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({
          id: existingInvite.id,
          token: 'rotated-token',
          tenant: { name: 'Test Org' },
          invitedBy: { name: 'Admin' },
        }),
      },
    };
    const mockEmail = { enabled: false, sendInvite: jest.fn() };
    const service = new InvitesService(mockPrisma as never, mockEmail as never);
    return { service, mockPrisma, existingInvite };
  }

  it('updates the existing invite (not create) and rotates the token', async () => {
    const { service, mockPrisma, existingInvite } = buildServiceWithExisting();
    await service.create('t1', 'u-new', 'OWNER', {
      email: 'a@b.com',
      role: 'FOREMAN',
      name: 'Updated Name',
      phone: '+233241234567',
    });

    expect(mockPrisma.invite.create).not.toHaveBeenCalled();
    expect(mockPrisma.invite.update).toHaveBeenCalledTimes(1);

    const call = mockPrisma.invite.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: existingInvite.id });
    expect(call.data.token).toBeDefined();
    expect(call.data.token).not.toEqual(existingInvite.token);
    expect(call.data.role).toBe('FOREMAN');
    expect(call.data.name).toBe('Updated Name');
    expect(call.data.phone).toBe('+233241234567');
    expect(call.data.invitedById).toBe('u-new');

    // expiresAt should be ~7 days from now (allow ±5s for test latency)
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const expectedAt = Date.now() + sevenDays;
    const actualAt = (call.data.expiresAt as Date).getTime();
    expect(Math.abs(actualAt - expectedAt)).toBeLessThan(5_000);
  });

  it('coerces empty phone to null on refresh', async () => {
    const { service, mockPrisma } = buildServiceWithExisting();
    await service.create('t1', 'u1', 'OWNER', {
      email: 'a@b.com',
      role: 'FIELD_WORKER',
      phone: '',
    });
    const call = mockPrisma.invite.update.mock.calls[0][0];
    expect(call.data.phone).toBeNull();
  });
});
