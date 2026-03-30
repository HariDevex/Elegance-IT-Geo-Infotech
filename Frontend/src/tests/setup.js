/* eslint-disable no-unused-vars */
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

/* eslint-disable no-undef */
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

/* eslint-disable no-undef */
global.fetch = vi.fn();
