import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import EmployeesList from '../components/EmployeesList'
import api from '../config/axios'

vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('EmployeesList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state then employees', async () => {
    const mockEmployees = [
      { _id: '1', name: 'John Doe', email: 'john@test.com', employeeId: 'EMP001', role: 'developer' }
    ];
    api.get.mockResolvedValueOnce({ data: { users: mockEmployees, pagination: { page: 1, pages: 1, total: 1 } } });

    render(<EmployeesList />);

    // Initially shows skeleton (handled by SkeletonTable in the component)
    // We can check for the presence of the table headers eventually
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
    });
  });

  it('handles search input', async () => {
    api.get.mockResolvedValue({ data: { users: [], pagination: { page: 1, pages: 1 } } });
    render(<EmployeesList />);

    const searchInput = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/employees', expect.objectContaining({
        params: expect.objectContaining({ search: 'Jane' })
      }));
    });
  });
});
