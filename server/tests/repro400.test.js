import request from 'supertest';
import app from '../index.js';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Reproduction: POST /api/employees 400 error', () => {
  let adminToken;

  beforeAll(async () => {
    // Ensure an admin user exists
    await db('users').where('employee_id', 'REPRO_ADMIN').del();
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    await db('users').insert({
      name: 'Repro Admin',
      email: 'repro@test.com',
      password: hashedPassword,
      role: 'admin',
      employee_id: 'REPRO_ADMIN'
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        employee_id: 'REPRO_ADMIN',
        password: 'Password123!'
      });
    adminToken = loginRes.body.token;
  });

  afterAll(async () => {
    await db('users').where('employee_id', 'REPRO_ADMIN').del();
    await db('users').where('name', 'New Test Emp').del();
  });

  it('should create an employee with an empty string email', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Empty Email Emp')
      .field('password', 'Password123!')
      .field('branch', 'bengaluru')
      .field('email', '') // Test empty string
      .field('role', 'developer');

    if (res.status !== 201) {
      console.error('EMPTY EMAIL TEST FAILED. Status:', res.status, 'Body:', JSON.stringify(res.body, null, 2));
    }
    
    expect(res.status).toBe(201);
  });

  it('should fail with 400 if name is too short', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'A')
      .field('password', 'Password123!')
      .field('branch', 'bengaluru');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
