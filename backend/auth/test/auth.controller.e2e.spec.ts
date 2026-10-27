import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

type RegisterResponseBody = {
  message: string;
  securityCode: string;
};

type AuthenticatedUserBody = {
  id: string;
  name: string;
  email: string;
};

describe('AuthController E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const httpServer = () => app.getHttpServer() as App;

  const userData = {
    name: 'Test User',
    email: 'testuser@email.com',
    password: '123456',
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.COOKIE_SECURE = 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);

    configureApp(app);

    await app.init();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a new user', async () => {
    const response = await request(httpServer())
      .post('/auth/register')
      .send(userData)
      .expect(201);

    const body = response.body as RegisterResponseBody;

    expect(body.message).toBe('User registered successfully');
    expect(body.securityCode).toMatch(
      /^DGBX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    );

    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('securityCodeHash');
  });

  it('should reject registration without a password', async () => {
    await request(httpServer())
      .post('/auth/register')
      .send({ name: 'Test User', email: 'nopassword@email.com' })
      .expect(400);

    const user = await prisma.user.findUnique({
      where: { email: 'nopassword@email.com' },
    });

    expect(user).toBeNull();
  });

  it('should reject registration with a malformed email', async () => {
    await request(httpServer())
      .post('/auth/register')
      .send({ ...userData, email: 'abc' })
      .expect(400);
  });

  it('should reject registration with an unexpected field', async () => {
    await request(httpServer())
      .post('/auth/register')
      .send({ ...userData, isAdmin: true })
      .expect(400);
  });

  it('should login and set access_token cookie', async () => {
    await request(httpServer()).post('/auth/register').send(userData);

    const response = await request(httpServer())
      .post('/auth/login')
      .send({
        email: userData.email,
        password: userData.password,
      })
      .expect(201);

    expect(response.body).toEqual({
      message: 'User logged in successfully',
    });

    const cookies = response.headers['set-cookie'];

    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('access_token=');
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('SameSite=Lax');
  });

  it('should not set any cookie when the password is wrong', async () => {
    await request(httpServer()).post('/auth/register').send(userData);

    const response = await request(httpServer())
      .post('/auth/login')
      .send({
        email: userData.email,
        password: 'wrong-password',
      })
      .expect(401);

    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('should return authenticated user when access_token cookie is valid', async () => {
    await request(httpServer()).post('/auth/register').send(userData);

    const loginResponse = await request(httpServer()).post('/auth/login').send({
      email: userData.email,
      password: userData.password,
    });

    const cookies = loginResponse.headers['set-cookie'];

    const meResponse = await request(httpServer())
      .get('/auth/me')
      .set('Cookie', cookies)
      .expect(200);

    const body = meResponse.body as AuthenticatedUserBody;

    expect(body.email).toBe(userData.email);
    expect(body.name).toBe(userData.name);

    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('securityCodeHash');
  });

  it('should reject /auth/me without access_token cookie', async () => {
    await request(httpServer()).get('/auth/me').expect(401);
  });

  it('should logout and clear access_token cookie', async () => {
    const response = await request(httpServer())
      .post('/auth/logout')
      .expect(201);

    expect(response.body).toEqual({
      message: 'User logged out successfully',
    });

    const cookies = response.headers['set-cookie'];

    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('access_token=');
    expect(cookies[0]).toContain('Expires=Thu, 01 Jan 1970');
    expect(cookies[0]).toContain('HttpOnly');
  });

  it('should reset user password', async () => {
    const registerResponse = await request(httpServer())
      .post('/auth/register')
      .send(userData);

    const { securityCode } = registerResponse.body as RegisterResponseBody;

    const response = await request(httpServer())
      .post('/auth/reset-password')
      .send({
        email: userData.email,
        securityCode,
        newPassword: '654321',
      })
      .expect(201);

    expect(response.body).toBeDefined();

    await request(httpServer())
      .post('/auth/login')
      .send({
        email: userData.email,
        password: '654321',
      })
      .expect(201);
  });
});
