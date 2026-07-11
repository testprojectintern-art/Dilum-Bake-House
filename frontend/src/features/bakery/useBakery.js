import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { bakeryApi } from './bakeryApi';

// Products Hooks
export const useBakeryProducts = (search = '') => {
    return useQuery({
        queryKey: ['bakeryProducts', search],
        queryFn: () => bakeryApi.getProducts(search),
        placeholderData: (prev) => prev,
    });
};

export const useCreateBakeryProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryProducts'] });
            toast.success('Product added successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to add product');
        },
    });
};

export const useDeleteBakeryProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryProducts'] });
            toast.success('Product deleted successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to delete product');
        },
    });
};

// Shops Hooks
export const useBakeryShops = (search = '') => {
    return useQuery({
        queryKey: ['bakeryShops', search],
        queryFn: () => bakeryApi.getShops(search),
        placeholderData: (prev) => prev,
    });
};

export const useCreateBakeryShop = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.createShop,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryShops'] });
            toast.success('Shop saved successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to save shop');
        },
    });
};

export const useDeleteBakeryShop = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.deleteShop,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryShops'] });
            toast.success('Shop deleted successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to delete shop');
        },
    });
};

// Structures Hooks
export const useBakeryStructures = () => {
    return useQuery({
        queryKey: ['bakeryStructures'],
        queryFn: bakeryApi.getStructures,
    });
};

export const useBakeryStructure = (id) => {
    return useQuery({
        queryKey: ['bakeryStructure', id],
        queryFn: () => bakeryApi.getStructureById(id),
        enabled: !!id,
    });
};

export const useCreateBakeryStructure = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.createStructure,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryStructures'] });
            toast.success('Pricing structure created');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to create structure');
        },
    });
};

export const useUpdateBakeryStructure = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => bakeryApi.updateStructure(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryStructures'] });
            toast.success('Pricing structure updated');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to update structure');
        },
    });
};

export const useDeleteBakeryStructure = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.deleteStructure,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryStructures'] });
            toast.success('Pricing structure deleted');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to delete structure');
        },
    });
};

// Invoices Hooks
export const useBakeryInvoices = (filters = {}) => {
    return useQuery({
        queryKey: ['bakeryInvoices', filters],
        queryFn: () => bakeryApi.getInvoices(filters),
        placeholderData: (prev) => prev,
    });
};

export const useBakeryInvoice = (id) => {
    return useQuery({
        queryKey: ['bakeryInvoice', id],
        queryFn: () => bakeryApi.getInvoiceById(id),
        enabled: !!id,
    });
};

export const useCreateBakeryInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.createInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryInvoices'] });
            queryClient.invalidateQueries({ queryKey: ['bakeryShops'] });
            queryClient.invalidateQueries({ queryKey: ['bakeryProducts'] });
            toast.success('Invoice generated successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to generate invoice');
        },
    });
};

export const useUpdateBakeryInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => bakeryApi.updateInvoice(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryInvoices'] });
            queryClient.invalidateQueries({ queryKey: ['bakeryShops'] });
            queryClient.invalidateQueries({ queryKey: ['bakeryProducts'] });
            toast.success('Invoice updated successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to update invoice');
        },
    });
};

export const useDeleteBakeryInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.deleteInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryInvoices'] });
            queryClient.invalidateQueries({ queryKey: ['bakeryShops'] });
            toast.success('Invoice deleted successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to delete invoice');
        },
    });
};

export const useBakeryDashboard = (filters = {}) => {
    return useQuery({
        queryKey: ['bakeryDashboard', filters],
        queryFn: () => bakeryApi.getDashboard(filters),
    });
};

// Nuwara Eliya Delivery Consignments Hooks
export const useNuwaraEliyaDeliveries = (params = {}) => {
    return useQuery({
        queryKey: ['nuwaraEliyaDeliveries', params],
        queryFn: () => bakeryApi.getNuwaraEliyaDeliveries(params),
        placeholderData: (prev) => prev,
    });
};

export const useLatestNuwaraEliyaOutstanding = () => {
    return useQuery({
        queryKey: ['latestNuwaraEliyaOutstanding'],
        queryFn: bakeryApi.getLatestNuwaraEliyaOutstanding,
    });
};

export const useNuwaraEliyaDelivery = (id) => {
    return useQuery({
        queryKey: ['nuwaraEliyaDelivery', id],
        queryFn: () => bakeryApi.getNuwaraEliyaDeliveryById(id),
        enabled: !!id,
    });
};

export const useCreateNuwaraEliyaDelivery = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.createNuwaraEliyaDelivery,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nuwaraEliyaDeliveries'] });
            queryClient.invalidateQueries({ queryKey: ['latestNuwaraEliyaOutstanding'] });
            queryClient.invalidateQueries({ queryKey: ['bakeryProducts'] });
            toast.success('Nuwara Eliya delivery record created');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to create record');
        },
    });
};

export const useUpdateNuwaraEliyaDelivery = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => bakeryApi.updateNuwaraEliyaDelivery(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nuwaraEliyaDeliveries'] });
            queryClient.invalidateQueries({ queryKey: ['nuwaraEliyaDelivery'] });
            queryClient.invalidateQueries({ queryKey: ['latestNuwaraEliyaOutstanding'] });
            queryClient.invalidateQueries({ queryKey: ['bakeryProducts'] });
            toast.success('Nuwara Eliya delivery record updated');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to update record');
        },
    });
};

export const useDeleteNuwaraEliyaDelivery = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.deleteNuwaraEliyaDelivery,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nuwaraEliyaDeliveries'] });
            queryClient.invalidateQueries({ queryKey: ['latestNuwaraEliyaOutstanding'] });
            toast.success('Nuwara Eliya delivery record deleted');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to delete record');
        },
    });
};

// Finance & Leases Hooks
export const useBakeryFinanceItems = (params = {}) => {
    return useQuery({
        queryKey: ['bakeryFinanceItems', params],
        queryFn: () => bakeryApi.getFinanceItems(params),
        placeholderData: (prev) => prev,
    });
};

export const useCreateBakeryFinanceItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.createFinanceItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryFinanceItems'] });
            queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
            toast.success('Finance item saved successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to save item');
        },
    });
};

export const useUpdateBakeryFinanceItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => bakeryApi.updateFinanceItem(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryFinanceItems'] });
            queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
            toast.success('Finance item updated successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to update item');
        },
    });
};

export const useDeleteBakeryFinanceItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.deleteFinanceItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryFinanceItems'] });
            queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
            toast.success('Finance item deleted successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to delete item');
        },
    });
};

export const useAutoAllocateBakeryIncome = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bakeryApi.autoAllocateBakeryIncome,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bakeryFinanceItems'] });
            toast.success('Income allocated successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to allocate income');
        },
    });
};
