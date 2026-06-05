import { useState, useEffect, useCallback } from "react";
import employeeService from "../services/employeeService";

const useEmployees = (initialParams = {}) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchEmployees = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await employeeService.getAll({ limit: 100, ...params });
      if (res.data.success) {
        setEmployees(res.data.users || []);
        setPagination(res.data.pagination || { page: 1, total: 0, pages: 1 });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees(initialParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchEmployees]);

  return { employees, loading, pagination, refetch: fetchEmployees };
};

export default useEmployees;
