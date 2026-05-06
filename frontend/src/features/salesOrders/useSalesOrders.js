import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { salesOrdersApi } from './salesOrdersApi';

export const useSalesOrders = (filters = {}) => useQuery({
    queryKey: ['salesOrders', filters],
    queryFn: () => salesOrdersApi.list(filters),
    placeholderData: (prev) => prev,
});

export const useSalesOrder = (id) => useQuery({
    queryKey: ['salesOrder', id],
    queryFn: () => salesOrdersApi.getById(id),
    enabled: !!id,
});

export const useCreateSalesOrder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: salesOrdersApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['salesOrders'] });
            toast.success('Order created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create order'),
    });
};

export const useChangeOrderStatus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, reason }) => salesOrdersApi.changeStatus(id, status, reason),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['salesOrders'] });
            qc.invalidateQueries({ queryKey: ['salesOrder'] });
            toast.success(data.message);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useDeleteSalesOrder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: salesOrdersApi.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['salesOrders'] });
            toast.success('Order deleted');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};