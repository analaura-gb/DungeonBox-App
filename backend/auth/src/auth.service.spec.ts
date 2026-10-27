import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersRepository, CreateUserData } from './users/users.repository';
import { User } from '../generated/prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;

  const anyString = expect.any(String) as string;

  const activeUser: User = {
    id: 'user-1',
    name: 'Ana Laura',
    email: 'ana.laura@email.com',
    passwordHash: 'hashed-password',
    securityCodeHash: 'hashed-security-code',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  const usersRepositoryMock = {
    findByEmail: mock(
      (_email: string): Promise<User | null> => Promise.resolve(null),
    ),
    findById: mock(
      (_id: string): Promise<User | null> => Promise.resolve(null),
    ),
    create: mock(
      (_data: CreateUserData): Promise<User> => Promise.resolve(activeUser),
    ),
    updatePassword: mock(
      (_id: string, _passwordHash: string): Promise<void> => Promise.resolve(),
    ),
  };

  const jwtServiceMock = {
    signAsync: mock(() => Promise.resolve('fake-access-token')),
  };

  beforeEach(async () => {
    usersRepositoryMock.findByEmail.mockClear();
    usersRepositoryMock.findById.mockClear();
    usersRepositoryMock.create.mockClear();
    usersRepositoryMock.updatePassword.mockClear();
    jwtServiceMock.signAsync.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: usersRepositoryMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const result = await service.register({
        name: 'Ana Laura',
        email: 'ana.laura@email.com',
        password: '123456',
      });

      expect(result).toEqual({
        message: 'User registered successfully',
        securityCode: anyString,
      });

      const createCall = usersRepositoryMock.create.mock.calls[0]?.[0];

      expect(createCall.passwordHash).not.toBe('123456');
      expect(createCall.securityCodeHash).not.toBe(result.securityCode);

      const passwordMatches = await Bun.password.verify(
        '123456',
        createCall.passwordHash,
      );

      expect(passwordMatches).toBe(true);

      const securityCodeMatches = await Bun.password.verify(
        result.securityCode,
        createCall.securityCodeHash,
      );

      expect(securityCodeMatches).toBe(true);
    });

    it('should not register a user with duplicated email', async () => {
      usersRepositoryMock.findByEmail.mockResolvedValueOnce(activeUser);

      await expect(
        service.register({
          name: 'Ana Laura',
          email: 'ana.laura@email.com',
          password: '123456',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should propagate the original error when user creation fails', async () => {
      usersRepositoryMock.create.mockRejectedValueOnce(
        new Error('Database unavailable'),
      );

      await expect(
        service.register({
          name: 'Ana Laura',
          email: 'ana.laura@email.com',
          password: '123456',
        }),
      ).rejects.toThrow('Database unavailable');
    });
  });

  describe('login', () => {
    it('should login a user with valid credentials', async () => {
      const passwordHash = await Bun.password.hash('123456');

      usersRepositoryMock.findByEmail.mockResolvedValueOnce({
        ...activeUser,
        passwordHash,
      });

      const result = await service.login({
        email: 'ana.laura@email.com',
        password: '123456',
      });

      expect(result).toEqual({
        message: 'User logged in successfully',
        accessToken: 'fake-access-token',
      });
    });

    it('should not login when email does not exist', async () => {
      usersRepositoryMock.findByEmail.mockResolvedValueOnce(null);

      await expect(
        service.login({
          email: 'ana.laura@email.com',
          password: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not login when password is invalid', async () => {
      const passwordHash = await Bun.password.hash('correct-password');

      usersRepositoryMock.findByEmail.mockResolvedValueOnce({
        ...activeUser,
        passwordHash,
      });

      await expect(
        service.login({
          email: 'ana.laura@email.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getAuthenticatedUser', () => {
    it('should return the authenticated user public data', async () => {
      usersRepositoryMock.findById.mockResolvedValueOnce(activeUser);

      const result = await service.getAuthenticatedUser('user-1');

      expect(result).toEqual({
        id: 'user-1',
        name: 'Ana Laura',
        email: 'ana.laura@email.com',
      });
    });

    it('should throw unauthorized when user does not exist', async () => {
      usersRepositoryMock.findById.mockResolvedValueOnce(null);

      await expect(service.getAuthenticatedUser('user-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid email and security code', async () => {
      const securityCode = 'DGBX-ABCD-EFGH-2345';
      const securityCodeHash = await Bun.password.hash(securityCode);

      usersRepositoryMock.findByEmail.mockResolvedValueOnce({
        ...activeUser,
        securityCodeHash,
      });

      const result = await service.resetPassword({
        email: 'ana.laura@email.com',
        securityCode,
        newPassword: 'new-password-123',
      });

      expect(result).toEqual({
        message: 'Password reset successfully',
      });

      const updatePasswordCall =
        usersRepositoryMock.updatePassword.mock.calls[0];
      const newPasswordHash = updatePasswordCall?.[1];

      expect(newPasswordHash).not.toBe('new-password-123');

      const passwordMatches = await Bun.password.verify(
        'new-password-123',
        newPasswordHash,
      );

      expect(passwordMatches).toBe(true);
    });

    it('should not reset password when email does not exist', async () => {
      usersRepositoryMock.findByEmail.mockResolvedValueOnce(null);

      await expect(
        service.resetPassword({
          email: 'ana.laura@email.com',
          securityCode: 'DGBX-ABCD-EFGH-2345',
          newPassword: 'new-password-123',
        }),
      ).rejects.toThrow('Email not found');
    });

    it('should not reset password when security code is invalid', async () => {
      const correctSecurityCode = 'DGBX-CORR-ECTC-ODE2';
      const securityCodeHash = await Bun.password.hash(correctSecurityCode);

      usersRepositoryMock.findByEmail.mockResolvedValueOnce({
        ...activeUser,
        securityCodeHash,
      });

      await expect(
        service.resetPassword({
          email: 'ana.laura@email.com',
          securityCode: 'DGBX-WRON-GCOD-E123',
          newPassword: 'new-password-123',
        }),
      ).rejects.toThrow('Invalid security code');
    });

    it('should propagate the original error when password update fails', async () => {
      const securityCode = 'DGBX-ABCD-EFGH-2345';
      const securityCodeHash = await Bun.password.hash(securityCode);

      usersRepositoryMock.findByEmail.mockResolvedValueOnce({
        ...activeUser,
        securityCodeHash,
      });

      usersRepositoryMock.updatePassword.mockRejectedValueOnce(
        new Error('Database unavailable'),
      );

      await expect(
        service.resetPassword({
          email: 'ana.laura@email.com',
          securityCode,
          newPassword: 'new-password-123',
        }),
      ).rejects.toThrow('Database unavailable');
    });
  });
});
