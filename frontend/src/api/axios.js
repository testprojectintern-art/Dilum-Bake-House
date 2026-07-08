import axios from 'axios';
import { useFilterStore } from '../store/filterStore';

const getBaseURL = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Dynamic fallback based on hostname
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:5005/api';
        }
    }
    return 'https://dilum-bake-house.onrender.com/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach JWT token and global date filters to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Apply global month/year filter for GET requests
        if (config.method?.toLowerCase() === 'get') {
            const { selectedMonth, selectedYear } = useFilterStore.getState();
            if (selectedYear !== 'all') {
                const yearNum = parseInt(selectedYear);
                let start, end;
                
                if (selectedMonth !== 'all') {
                    const monthNum = parseInt(selectedMonth); // 1-indexed (1-12)
                    start = new Date(yearNum, monthNum - 1, 1);
                    end = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
                } else {
                    start = new Date(yearNum, 0, 1);
                    end = new Date(yearNum, 11, 31, 23, 59, 59, 999);
                }
                
                config.params = config.params || {};
                if (config.params.startDate === undefined) {
                    config.params.startDate = start.toISOString();
                }
                if (config.params.endDate === undefined) {
                    config.params.endDate = end.toISOString();
                }
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401 (token expired/invalid) globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Import dynamically to avoid circular dependency
            import('../store/authStore').then((module) => {
                const { useAuthStore } = module;
                useAuthStore.getState().logout();
                window.location.href = '/login';
            });
        }
        return Promise.reject(error);
    }
);

export default api;