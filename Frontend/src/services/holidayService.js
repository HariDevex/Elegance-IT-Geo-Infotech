import api from "../config/axios";

const holidayService = {
  getAll: (params = {}) => api.get("/holidays", { params }),
  create: (data) => api.post("/holidays", data),
  delete: (id) => api.delete(`/holidays/${id}`),
};

export default holidayService;
