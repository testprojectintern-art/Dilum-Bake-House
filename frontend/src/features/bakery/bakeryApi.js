import api from '../../api/axios';

export const bakeryApi = {
    // Products
    getProducts: async (search = '') => {
        const response = await api.get('/bakery/products', { params: { search } });
        return response.data;
    },
    createProduct: async (name) => {
        const response = await api.post('/bakery/products', { name });
        return response.data;
    },
    deleteProduct: async (id) => {
        const response = await api.delete(`/bakery/products/${id}`);
        return response.data;
    },

    // Shops
    getShops: async (search = '') => {
        const response = await api.get('/bakery/shops', { params: { search } });
        return response.data;
    },
    createShop: async (data) => {
        const response = await api.post('/bakery/shops', data);
        return response.data;
    },
    suggestShops: async (search = '') => {
        const response = await api.get('/bakery/shops/suggest', { params: { search } });
        return response.data;
    },

    // Structures
    getStructures: async () => {
        const response = await api.get('/bakery/structures');
        return response.data;
    },
    getStructureById: async (id) => {
        const response = await api.get(`/bakery/structures/${id}`);
        return response.data;
    },
    createStructure: async (data) => {
        const response = await api.post('/bakery/structures', data);
        return response.data;
    },
    updateStructure: async (id, data) => {
        const response = await api.put(`/bakery/structures/${id}`, data);
        return response.data;
    },
    deleteStructure: async (id) => {
        const response = await api.delete(`/bakery/structures/${id}`);
        return response.data;
    },

    // Invoices
    getInvoices: async (params = {}) => {
        const response = await api.get('/bakery/invoices', { params });
        return response.data;
    },
    getInvoiceById: async (id) => {
        const response = await api.get(`/bakery/invoices/${id}`);
        return response.data;
    },
    createInvoice: async (data) => {
        const response = await api.post('/bakery/invoices', data);
        return response.data;
    },
    updateInvoice: async (id, data) => {
        const response = await api.put(`/bakery/invoices/${id}`, data);
        return response.data;
    },
    deleteInvoice: async (id) => {
        const response = await api.delete(`/bakery/invoices/${id}`);
        return response.data;
    },
    getDashboard: async (params = {}) => {
        const response = await api.get('/bakery/dashboard', { params });
        return response.data;
    },

    // Nuwara Eliya Delivery Consignments
    getNuwaraEliyaDeliveries: async (params = {}) => {
        const response = await api.get('/bakery/nuwara-eliya', { params });
        return response.data;
    },
    getLatestNuwaraEliyaOutstanding: async () => {
        const response = await api.get('/bakery/nuwara-eliya/latest');
        return response.data;
    },
    getNuwaraEliyaDeliveryById: async (id) => {
        const response = await api.get(`/bakery/nuwara-eliya/${id}`);
        return response.data;
    },
    createNuwaraEliyaDelivery: async (data) => {
        const response = await api.post('/bakery/nuwara-eliya', data);
        return response.data;
    },
    updateNuwaraEliyaDelivery: async (id, data) => {
        const response = await api.put(`/bakery/nuwara-eliya/${id}`, data);
        return response.data;
    },
    deleteNuwaraEliyaDelivery: async (id) => {
        const response = await api.delete(`/bakery/nuwara-eliya/${id}`);
        return response.data;
    },
};
