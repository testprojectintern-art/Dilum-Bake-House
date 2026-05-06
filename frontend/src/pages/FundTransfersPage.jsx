import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ArrowRightLeft, Landmark, Calendar, FileText, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import api from '../api/axios';

export default function FundTransfersPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        fromBankAccountId: '', toBankAccountId: '', amount: '', reference: '', notes: ''
    });

    const { data: accountsData } = useQuery({ queryKey: ['bank-accounts'], queryFn: async () => (await api.get('/bank-accounts')).data });
    const { data, isLoading } = useQuery({ queryKey: ['fund-transfers'], queryFn: async () => (await api.get('/fund-transfers')).data });

    const createMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post('/fund-transfers', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fund-transfers'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            toast.success('Transfer completed');
            setIsModalOpen(false);
            setFormData({ fromBankAccountId: '', toBankAccountId: '', amount: '', reference: '', notes: '' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => (await api.delete(`/fund-transfers/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fund-transfers'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            toast.success('Transfer reversed');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => (await api.put(`/fund-transfers/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fund-transfers'] });
            toast.success('Transfer updated');
            closeModal();
        }
    });

    const openEdit = (transfer) => {
        setEditingId(transfer._id);
        setFormData({
            fromBankAccountId: transfer.fromBankAccountId?._id || transfer.fromBankAccountId,
            toBankAccountId: transfer.toBankAccountId?._id || transfer.toBankAccountId,
            amount: transfer.amount,
            reference: transfer.reference || '',
            notes: transfer.notes || ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ fromBankAccountId: '', toBankAccountId: '', amount: '', reference: '', notes: '' });
    };

    const transfers = data?.data || [];
    const accounts = accountsData?.data || [];
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n || 0);

    const columns = [
        { key: 'transferNumber', label: 'Ref #', render: (r) => <span className="font-mono font-bold">{r.transferNumber}</span> },
        { key: 'date', label: 'Date', render: (r) => new Date(r.transferDate).toLocaleDateString() },
        { key: 'from', label: 'From Account', render: (r) => <div><p className="font-medium">{r.fromBankAccountId?.accountName}</p><Badge variant="default" className="text-[10px] uppercase">{r.fromBankAccountId?.category}</Badge></div> },
        { key: 'arrow', label: '', render: () => <ArrowRightLeft size={16} className="text-gray-400" /> },
        { key: 'to', label: 'To Account', render: (r) => <div><p className="font-medium">{r.toBankAccountId?.accountName}</p><Badge variant="default" className="text-[10px] uppercase">{r.toBankAccountId?.category}</Badge></div> },
        { key: 'amount', label: 'Amount', render: (r) => <span className="font-bold text-primary-600">{fmt(r.amount)}</span> },
        { key: 'reference', label: 'Reference', render: (r) => r.reference || '—' },
        { 
            key: 'actions', label: '', render: (r) => (
                <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(r)} className="p-1 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded"><Edit2 size={16} /></button>
                    <button 
                        onClick={() => { if(window.confirm('Reverse this transfer?')) deleteMutation.mutate(r._id) }}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        },
    ];

    const handleSubmit = () => {
        if (!formData.fromBankAccountId || !formData.toBankAccountId || !formData.amount) {
            return toast.error('Please fill all required fields');
        }
        if (formData.fromBankAccountId === formData.toBankAccountId) {
            return toast.error('Source and destination accounts must be different');
        }
        createMutation.mutate({ ...formData, amount: +formData.amount });
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Fund Transfers" 
                description="Transfer money between your bank accounts"
                icon={ArrowRightLeft}
                actions={
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} className="mr-1.5" /> New Transfer
                    </Button>
                }
            />

            <Card>
                {isLoading ? (
                    <div className="py-20 text-center">Loading transfers...</div>
                ) : (
                    <Table columns={columns} data={transfers} />
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Edit Fund Transfer' : 'New Fund Transfer'} size="md">
                <div className="p-6 space-y-4">
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm text-amber-800">
                        Select source and destination accounts to move funds.
                    </div>

                    <Select 
                        label="From Account" required
                        options={accounts.map(a => ({ value: a._id, label: `${a.accountName} (${a.category.toUpperCase()} - Balance: ${fmt(a.currentBalance)})` }))}
                        value={formData.fromBankAccountId}
                        onChange={(e) => setFormData({...formData, fromBankAccountId: e.target.value})}
                        disabled={!!editingId}
                    />

                    <Select 
                        label="To Account" required
                        options={accounts.map(a => ({ value: a._id, label: `${a.accountName} (${a.category.toUpperCase()})` }))}
                        value={formData.toBankAccountId}
                        onChange={(e) => setFormData({...formData, toBankAccountId: e.target.value})}
                        disabled={!!editingId}
                    />

                    <Input 
                        label="Amount to Transfer" required type="number" step="0.01" min="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        disabled={!!editingId}
                    />

                    <Input 
                        label="Reference"
                        placeholder="e.g., Monthly saving transfer"
                        value={formData.reference}
                        onChange={(e) => setFormData({...formData, reference: e.target.value})}
                    />

                    <div className="pt-4 flex gap-2">
                        <Button 
                            variant="primary" fullWidth 
                            onClick={() => editingId ? updateMutation.mutate({ id: editingId, data: formData }) : handleSubmit()} 
                            loading={createMutation.isPending || updateMutation.isPending}
                        >
                            {editingId ? 'Update Transfer' : 'Execute Transfer'}
                        </Button>
                        <Button variant="outline" fullWidth onClick={closeModal}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
