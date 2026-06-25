import API from "./api";

export const getUsers = async () => {
  const res = await API.get("/api/admin/users");
  return res.data;
};

export const addUser = async (data) => {
  const res = await API.post("/api/users", data);
  return res.data;
};

export const updateUser = async (id, data) => {
  const res = await API.put(`/api/admin/users/${id}`, data);
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await API.delete(`/api/admin/users/${id}`);
  return res.data;
};
