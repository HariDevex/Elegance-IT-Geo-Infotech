import { useState, useEffect, useCallback } from "react";
import leaveService from "../services/leaveService";

const useLeaves = (initialParams = {}) => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchLeaves = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await leaveService.getAll({ ...params });
      if (res.data.success) {
        setLeaves(res.data.leaves || []);
        setPagination(res.data.pagination || { page: 1, total: 0, pages: 1 });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves(initialParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLeaves]);

  return { leaves, loading, pagination, refetch: fetchLeaves };
};

export default useLeaves;
