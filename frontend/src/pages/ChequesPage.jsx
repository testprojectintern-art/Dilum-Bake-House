import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, FileCheck, CheckCircle, XCircle, AlertCircle, Clock, ExternalLink, Trash2 } from 'lucide-react';
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

export default function ChequesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({ status: '', direction: '', search: '', page: 1, limit: 15 });
    const [statusModal, setStatusModal] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [statusDate, setStatusDate] = useState(new Date().toISOString().split('T')[0]);
    const [bouncedReason, setBouncedReason] = useState('');
    const [depositedBankAccountId, setDepositedBankAccountId] = useState('');

    const { data: bankAccountsData } = useQuery({
        queryKey: ['bank-accounts'],
        queryFn: async () => (await api.get('/bank-accounts')).data
    });
    const bankAccounts = bankAccountsData?.data || [];
    const bankOptions = bankAccounts.map(a => ({ value: a._id, label: `${a.accountName} (${a.bankName})` }));

    const { data, isLoading } = useQuery({
        queryKey: ['cheques', filters],
        queryFn: async () => {
            const { data } = await api.get('/cheques', { params: filters });
            return data;
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await api.put(`/cheques/${id}/status`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cheques'] });
            toast.success('Cheque status updated');
            setStatusModal(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => (await api.delete(`/cheques/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cheques'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            toast.success('Cheque record deleted');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Delete failed')
    });

    const cheques = data?.data || [];
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n || 0);

    const columns = [
        { 
            key: 'chequeNumber', 
            label: 'Cheque #', 
            render: (r) => (
                <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-700">{r.chequeNumber}</span>
                    {r.paymentId && (
                        <button 
                            onClick={() => navigate(`/payments/${r.paymentId?._id || r.paymentId}`)}
                            className="p-1 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="View Payment"
                        >
                            <ExternalLink size={12} />
                        </button>
                    )}
                </div>
            )
        },
        { key: 'chequeDate', label: 'Date', render: (r) => new Date(r.chequeDate).toLocaleDateString() },
        { key: 'party', label: 'Party', render: (r) => r.payeeName || r.customerId?.displayName || r.supplierId?.displayName || '—' },
        { key: 'bank', label: 'Bank', render: (r) => <div><p className="text-sm">{r.bankName}</p><p className="text-xs text-gray-500">{r.branchName}</p></div> },
        { key: 'amount', label: 'Amount', render: (r) => <span className="font-bold">{fmt(r.amount)}</span> },
        { key: 'direction', label: 'Type', render: (r) => <Badge variant={r.direction === 'incoming' ? 'success' : 'warning'}>{r.direction}</Badge> },
        { key: 'status', label: 'Status', render: (r) => (
            <Badge variant={r.status === 'cleared' ? 'success' : r.status === 'bounced' ? 'danger' : 'info'}>
                {r.status.toUpperCase()}
            </Badge>
        )},
        { key: 'actions', label: 'Actions', render: (r) => (
            <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setStatusModal(r); setNewStatus(r.status); }}>
                    Update Status
                </Button>
                <button 
                    onClick={() => { if(window.confirm('Delete this cheque record?')) deleteMutation.mutate(r._id) }}
                    className="p-1.5 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors"
                    title="Delete Cheque"
                    disabled={deleteMutation.isPending}
                >
                    <Trash2 size={16} />
                </button>
            </div>
        )}
    ];

    const handleUpdateStatus = () => {
        const payload = { status: newStatus };
        if (newStatus === 'cleared') {
            payload.clearedDate = statusDate;
            payload.depositedBankAccountId = depositedBankAccountId;
        }
        if (newStatus === 'bounced') {
            payload.bouncedDate = statusDate;
            payload.bouncedReason = bouncedReason;
        }
        updateStatusMutation.mutate({ id: statusModal._id, data: payload });
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Cheque Management" 
                description="Track and manage incoming and outgoing cheques"
                icon={FileCheck}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Clock size={24} /></div>
                    <div><p className="text-xs text-gray-500 uppercase font-bold">Pending</p><p className="text-xl font-bold">{cheques.filter(c => c.status === 'pending').length}</p></div>
                </Card>
                <Card className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircle size={24} /></div>
                    <div><p className="text-xs text-gray-500 uppercase font-bold">Cleared</p><p className="text-xl font-bold">{cheques.filter(c => c.status === 'cleared').length}</p></div>
                </Card>
                <Card className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl"><XCircle size={24} /></div>
                    <div><p className="text-xs text-gray-500 uppercase font-bold">Bounced</p><p className="text-xl font-bold">{cheques.filter(c => c.status === 'bounced').length}</p></div>
                </Card>
                <Card className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><AlertCircle size={24} /></div>
                    <div><p className="text-xs text-gray-500 uppercase font-bold">Incoming</p><p className="text-xl font-bold">{cheques.filter(c => c.direction === 'incoming').length}</p></div>
                </Card>
            </div>

            <Card>
                <div className="p-4 border-b flex flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search cheques..." 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value, page: 1})}
                        />
                    </div>
                    <Select 
                        className="w-40"
                        options={[
                            { value: '', label: 'All Statuses' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'cleared', label: 'Cleared' },
                            { value: 'bounced', label: 'Bounced' },
                        ]}
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
                    />
                    <Select 
                        className="w-40"
                        options={[
                            { value: '', label: 'All Types' },
                            { value: 'incoming', label: 'Incoming' },
                            { value: 'outgoing', label: 'Outgoing' },
                        ]}
                        value={filters.direction}
                        onChange={(e) => setFilters({...filters, direction: e.target.value, page: 1})}
                    />
                </div>
                
                {isLoading ? (
                    <div className="py-20 text-center text-gray-500">Loading cheques...</div>
                ) : (
                    <Table columns={columns} data={cheques} />
                )}
            </Card>

            <Modal 
                isOpen={!!statusModal} 
                onClose={() => setStatusModal(null)} 
                title={`Update Cheque — ${statusModal?.chequeNumber}`}
                size="sm"
            >
                <div className="p-6 space-y-4">
                    <Select 
                        label="New Status"
                        options={[
                            { value: 'pending', label: 'Pending' },
                            { value: 'cleared', label: 'Cleared' },
                            { value: 'bounced', label: 'Bounced' },
                            { value: 'cancelled', label: 'Cancelled' },
                        ]}
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                    />
                    
                    {(newStatus === 'cleared' || newStatus === 'bounced') && (
                        <Input 
                            label={newStatus === 'cleared' ? 'Cleared Date' : 'Bounced Date'}
                            type="date"
                            value={statusDate}
                            onChange={(e) => setStatusDate(e.target.value)}
                        />
                    )}

                    {newStatus === 'cleared' && (
                        <Select 
                            label="Deposit To Account"
                            required
                            placeholder="Select bank account..."
                            options={bankOptions}
                            value={depositedBankAccountId}
                            onChange={(e) => setDepositedBankAccountId(e.target.value)}
                        />
                    )}

                    {newStatus === 'bounced' && (
                        <Input 
                            label="Reason for Bouncing"
                            placeholder="e.g., Insufficient funds"
                            value={bouncedReason}
                            onChange={(e) => setBouncedReason(e.target.value)}
                        />
                    )}

                    <div className="pt-4 flex gap-2">
                        <Button variant="primary" fullWidth onClick={handleUpdateStatus} loading={updateStatusMutation.isPending}>
                            Update Status
                        </Button>
                        <Button variant="outline" fullWidth onClick={() => setStatusModal(null)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
