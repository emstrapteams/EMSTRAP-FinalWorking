import API from "./api";

export const getHospitals = async () => {
  const res = await API.get("/api/hospitals");
  return res.data;
};

export const getHospitalById = async (hospitalId) => {
  const res = await API.get(`/api/hospitals/${hospitalId}`);
  return res.data;
};

export const addHospital = async (payload) => {
  const res = await API.post("/api/hospitals", payload);
  return res.data;
};

export const updateHospital = async (hospitalId, payload) => {
  const res = await API.put(`/api/hospitals/${hospitalId}`, payload);
  return res.data;
};

export const deleteHospital = async (hospitalId) => {
  const res = await API.delete(`/api/hospitals/${hospitalId}`);
  return res.data;
};
