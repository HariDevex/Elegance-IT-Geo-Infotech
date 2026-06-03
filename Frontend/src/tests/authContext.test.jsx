import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../context/authContext'
import api from '../config/axios.js'

vi.mock('../config/axios.js', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }
  };
});

const TestComponent = () => {
  const { user, login, logout, loading } = useAuth();
  if (loading) return <div data-testid="loading">Loading...</div>;
  return (
    <div>
      <div data-testid="user">{user ? user.name : 'Guest'}</div>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides guest state initially', async () => {
    localStorage.getItem.mockReturnValue(null);
    api.get.mockRejectedValue({ response: { status: 401 } });
    
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('user').textContent).toBe('Guest');
    });
  });

  it('loads user if token exists', async () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'fake-token';
      return null;
    });
    
    const mockUser = { name: 'John Doe', role: 'admin' };
    api.get.mockResolvedValue({ data: { success: true, user: mockUser } });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('user').textContent).toBe('John Doe');
    }, { timeout: 2000 });
  });
});
