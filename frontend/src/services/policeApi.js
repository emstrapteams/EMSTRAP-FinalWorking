import API from "./api";

export const getPoliceRecords = async () => {
    const res = await API.get("/api/police");
    return res.data;
};

export const getPoliceById = async (id) => {
    const res = await API.get(`/api/police/${id}`);
    return res.data;
};

export const addPoliceRecord = async (data) => {
    const res = await API.post("/api/police", data);
    return res.data;
};

export const updatePoliceRecord = async (id, data) => {
    const res = await API.put(`/api/police/${id}`, data);
    return res.data;
};

export const deletePoliceRecord = async (id) => {
    const res = await API.delete(`/api/police/${id}`);
    return res.data;
};
