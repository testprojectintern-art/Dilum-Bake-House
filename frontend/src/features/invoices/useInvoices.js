import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invoicesApi } from './invoicesApi';

export const useInvoices = (filters = {}) => useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoicesApi.list(filters),
    placeholderData: (prev) => prev,
});

export const useInvoice = (id) => useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getById(id),
    enabled: !!id,
});

export const useCreateInvoice = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: invoicesApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Invoice created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useGenerateFromSO = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: invoicesApi.createFromSalesOrder,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['salesOrders'] });
            qc.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Invoice generated from sales order');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useChangeInvoiceStatus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, reason }) => invoicesApi.changeStatus(id, status, reason),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['invoice'] });
            toast.success('Status updated');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
};

export const useAgingSummary = (filters = {}) => useQuery({
    queryKey: ['invoicesAging', filters],
    queryFn: () => invoicesApi.agingSummary(filters),
});