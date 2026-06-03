import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

describe('Chat API', () => {
  let user1Token, user2Token, user1Id, user2Id;
  const user1 = {
    id: crypto.randomUUID(),
    name: 'User One',
    email: 'user1@test.com',
    password: 'Password123!',
    role: 'developer',
    employee_id: 'C-DEV001'
  };
  const user2 = {
    id: crypto.randomUUID(),
    name: 'User Two',
    email: 'user2@test.com',
    password: 'Password123!',
    role: 'developer',
    employee_id: 'C-DEV002'
  };

  beforeAll(async () => {
    await db('chat_messages').del();
    await db('users').del();
    
    const hash1 = await bcrypt.hash(user1.password, 10);
    const hash2 = await bcrypt.hash(user2.password, 10);

    await db('users').insert([
      { ...user1, password: hash1 },
      { ...user2, password: hash2 }
    ]);
    user1Id = user1.id;
    user2Id = user2.id;

    const login1 = await request(app).post('/api/auth/login').send({
      employee_id: user1.employee_id,
      password: user1.password
    });
    user1Token = login1.body.token;

    const login2 = await request(app).post('/api/auth/login').send({
      employee_id: user2.employee_id,
      password: user2.password
    });
    user2Token = login2.body.token;
  });

  describe('POST /api/chat', () => {
    it('should allow sending a message', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          contactId: user2.employee_id,
          type: 'direct',
          text: 'Hello User Two!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message.text).toBe('Hello User Two!');
    });
  });

  describe('GET /api/chat', () => {
    it('should retrieve messages between users', async () => {
      const res = await request(app)
        .get('/api/chat')
        .set('Authorization', `Bearer ${user2Token}`)
        .query({ contactId: user1.employee_id, type: 'direct' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messages).toHaveLength(1);
      expect(res.body.messages[0].text).toBe('Hello User Two!');
    });
  });
});
