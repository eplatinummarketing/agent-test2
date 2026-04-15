import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const dealsApi = {
  getAll: () => api.get('/deals').then(r => r.data),
  getOne: (id) => api.get(`/deals/${id}`).then(r => r.data),
  create: (data) => api.post('/deals', data).then(r => r.data),
  update: (id, data) => api.put(`/deals/${id}`, data).then(r => r.data),
  updateStage: (id, stage) => api.patch(`/deals/${id}/stage`, { stage }).then(r => r.data),
  delete: (id) => api.delete(`/deals/${id}`).then(r => r.data),
  getAnalytics: () => api.get('/deals/meta/analytics').then(r => r.data),

  addContact: (dealId, data) => api.post(`/deals/${dealId}/contacts`, data).then(r => r.data),
  deleteContact: (dealId, contactId) => api.delete(`/deals/${dealId}/contacts/${contactId}`).then(r => r.data),

  addNote: (dealId, data) => api.post(`/deals/${dealId}/notes`, data).then(r => r.data),
  deleteNote: (dealId, noteId) => api.delete(`/deals/${dealId}/notes/${noteId}`).then(r => r.data),
};

export const documentsApi = {
  getAll: (dealId) => api.get(`/documents/${dealId}`).then(r => r.data),
  upload: (dealId, file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/documents/${dealId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }).then(r => r.data);
  },
  delete: (dealId, docId) => api.delete(`/documents/${dealId}/${docId}`).then(r => r.data),
  getDownloadUrl: (dealId, docId) => `/api/documents/${dealId}/${docId}/download`,
};

export default api;
