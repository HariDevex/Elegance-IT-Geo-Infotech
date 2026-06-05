import { useState, useEffect, useCallback } from "react";
import attendanceService from "../services/attendanceService";

const useAttendance = (initialParams = {}) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await attendanceService.getAll({ ...params });
      if (res.data.success) {
        setRecords(res.data.records || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance(initialParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAttendance]);

  return { records, loading, refetch: fetchAttendance };
};

export default useAttendance;
