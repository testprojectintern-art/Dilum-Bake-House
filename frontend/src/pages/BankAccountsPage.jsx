import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Landmark, CreditCard, PiggyBank, History, Edit2, Trash2 } from 'lucide-react';
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

const categoryIcons = {
    received: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
    payment: { icon: History, color: 'text-blue-600', bg: 'bg-blue-50' },
    saving: { icon: PiggyBank, color: 'text-amber-600', bg: 'bg-amber-50' }
};

export default function BankAccountsPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        accountName: '', accountNumber: '', bankName: '', branchName: '', category: 'received'
    });

    const { data, isLoading } = useQuery({
        queryKey: ['bank-accounts'],
        queryFn: async () => {
            const { data } = await api.get('/bank-accounts');
            return data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await api.post('/bank-accounts', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            toast.success('Bank account added');
            closeModal();
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => (await api.put(`/bank-accounts/${id}`, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            toast.success('Bank account updated');
            closeModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => (await api.delete(`/bank-accounts/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            toast.success('Bank account deleted');
        }
    });

    const openEdit = (account) => {
        setEditingId(account._id);
        setFormData({
            accountName: account.accountName,
            accountNumber: account.accountNumber,
            bankName: account.bankName,
            branchName: account.branchName,
            category: account.category
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ accountName: '', accountNumber: '', bankName: '', branchName: '', category: 'received' });
    };

    const accounts = data?.data || [];
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n || 0);

    const columns = [
        { key: 'category', label: 'Category', render: (r) => {
            const cfg = categoryIcons[r.category];
            const Icon = cfg.icon;
            return (
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 ${cfg.bg} ${cfg.color} rounded-lg`}><Icon size={16} /></div>
                    <span className="capitalize text-xs font-bold">{r.category}</span>
                </div>
            );
        }},
        { key: 'bankName', label: 'Bank', render: (r) => <div><p className="font-bold text-gray-900">{r.bankName}</p><p className="text-xs text-gray-500">{r.branchName}</p></div> },
        { key: 'accountName', label: 'Account Name', render: (r) => r.accountName },
        { key: 'accountNumber', label: 'Account Number', render: (r) => <span className="font-mono text-gray-600">{r.accountNumber}</span> },
        { key: 'balance', label: 'Balance', render: (r) => <span className="font-bold text-gray-900">{fmt(r.currentBalance)}</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
        { key: 'actions', label: '', width: '100px', render: (r) => (
            <div className="flex gap-1 justify-end">
                <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors"><Edit2 size={16} /></button>
                <button 
                    onClick={() => { if(window.confirm(`Delete ${r.accountName}?`)) deleteMutation.mutate(r._id) }} 
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    disabled={deleteMutation.isPending}
                ><Trash2 size={16} /></button>
            </div>
        )},
    ];

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Bank Accounts" 
                description="Manage Received, Payment, and Saving bank accounts"
                icon={Landmark}
                actions={
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} className="mr-1.5" /> Add Account
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['received', 'payment', 'saving'].map(cat => {
                    const cfg = categoryIcons[cat];
                    const Icon = cfg.icon;
                    const total = accounts.filter(a => a.category === cat).reduce((s, a) => s + a.currentBalance, 0);
                    return (
                        <Card key={cat} className="p-6 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 p-8 -mr-4 -mt-4 opacity-10 group-hover:opacity-20 transition-opacity ${cfg.color}`}><Icon size={80} /></div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{cat} Accounts</p>
                            <h3 className="text-2xl font-black text-gray-900 mb-4">{fmt(total)}</h3>
                            <div className="flex items-center justify-between text-xs font-medium">
                                <span className="text-gray-500">{accounts.filter(a => a.category === cat).length} active accounts</span>
                                <Badge variant="info">Category: {cat}</Badge>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <Card>
                {isLoading ? (
                    <div className="py-20 text-center text-gray-500">Loading accounts...</div>
                ) : accounts.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed rounded-xl m-4 border-gray-100">
                        <Landmark size={48} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-gray-900 font-bold">No bank accounts added</h3>
                        <p className="text-gray-500 text-sm">Add your first bank account to start tracking balances.</p>
                        <Button variant="primary" className="mt-4" onClick={() => setIsModalOpen(true)}>Add Account</Button>
                    </div>
                ) : (
                    <Table columns={columns} data={accounts} />
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Edit Bank Account' : 'Add Bank Account'} size="md">
                <div className="p-6 space-y-4">
                    <Select 
                        label="Account Category" required
                        options={[
                            { value: 'received', label: 'Received Bank Account' },
                            { value: 'payment', label: 'Payment Bank Account' },
                            { value: 'saving', label: 'Saving Bank Account' },
                        ]}
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                    />
                    <Input label="Bank Name" required placeholder="e.g., Bank of Ceylon" value={formData.bankName} onChange={(e) => setFormData({...formData, bankName: e.target.value})} />
                    <Input label="Branch Name" placeholder="e.g., Colombo Main" value={formData.branchName} onChange={(e) => setFormData({...formData, branchName: e.target.value})} />
                    <Input label="Account Name" required placeholder="e.g., Rishan Wholesale Main" value={formData.accountName} onChange={(e) => setFormData({...formData, accountName: e.target.value})} />
                    <Input label="Account Number" required placeholder="e.g., 0012345678" value={formData.accountNumber} onChange={(e) => setFormData({...formData, accountNumber: e.target.value})} />
                    
                    <div className="pt-4 flex gap-2">
                        <Button 
                            variant="primary" fullWidth 
                            onClick={() => editingId ? updateMutation.mutate({ id: editingId, data: formData }) : createMutation.mutate(formData)} 
                            loading={createMutation.isPending || updateMutation.isPending}
                        >
                            {editingId ? 'Update Account' : 'Save Account'}
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
