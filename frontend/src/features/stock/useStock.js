import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { stockApi } from './stockApi';

export const useStockItems = (filters = {}) => useQuery({
    queryKey: ['stock', filters],
    queryFn: () => stockApi.list(filters),
    placeholderData: (prev) => prev,
});

export const useStockMovements = (filters = {}) => useQuery({
    queryKey: ['stockMovements', filters],
    queryFn: () => stockApi.movements(filters),
    placeholderData: (prev) => prev,
});

export const useReservations = (filters = {}) => useQuery({
    queryKey: ['stockReservations', filters],
    queryFn: () => stockApi.reservations(filters),
});

export const useOpeningStock = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: stockApi.openingStock,
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['stock'] });
            qc.invalidateQueries({ queryKey: ['stockMovements'] });
            toast.success(data.message);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useTransferStock = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: stockApi.transfer,
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['stock'] });
            qc.invalidateQueries({ queryKey: ['stockMovements'] });
            toast.success(data.message);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useAdjustStock = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: stockApi.adjust,
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['stock'] });
            qc.invalidateQueries({ queryKey: ['stockMovements'] });
            toast.success(data.message);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};