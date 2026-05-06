import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { paymentsApi } from './paymentsApi';

export const usePayments = (filters = {}) => useQuery({
    queryKey: ['payments', filters],
    queryFn: () => paymentsApi.list(filters),
    placeholderData: (prev) => prev,
});

export const useCreatePayment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: paymentsApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['payments'] });
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['bills'] });
            qc.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Payment recorded');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useDeletePayment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: paymentsApi.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['payments'] });
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['bills'] });
            qc.invalidateQueries({ queryKey: ['bank-accounts'] });
            qc.invalidateQueries({ queryKey: ['cheques'] });
            toast.success('Payment deleted');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Delete failed'),
    });
};