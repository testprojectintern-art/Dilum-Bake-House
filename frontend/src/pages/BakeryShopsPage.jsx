import { useState } from 'react';
import { Search, Plus, Loader2, Phone, DollarSign, Edit, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useBakeryShops, useCreateBakeryShop } from '../features/bakery/useBakery';

export default function BakeryShopsPage() {
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingShop, setEditingShop] = useState(null);

    const [shopName, setShopName] = useState('');
    const [shopPhone, setShopPhone] = useState('');
    const [shopBalance, setShopBalance] = useState('0');
    const [contacts, setContacts] = useState([]); // Array of { name: '', role: 'Owner', phone: '' }

    const { data, isLoading } = useBakeryShops(search);
    const saveShop = useCreateBakeryShop();

    const shops = data?.data || [];

    const handleOpenCreate = () => {
        setEditingShop(null);
        setShopName('');
        setShopPhone('');
        setShopBalance('0');
        setContacts([]);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (shop) => {
        setEditingShop(shop);
        setShopName(shop.name);
        setShopPhone(shop.phone || '');
        setShopBalance(String(shop.balance || 0));
        setContacts(shop.contacts || []);
        setIsFormOpen(true);
    };

    const handleAddContactLine = () => {
        setContacts(prev => [...prev, { name: '', role: 'Owner', phone: '' }]);
    };

    const handleRemoveContactLine = (idx) => {
        setContacts(prev => prev.filter((_, i) => i !== idx));
    };

    const handleContactChange = (idx, field, val) => {
        setContacts(prev => {
            const copy = [...prev];
            copy[idx][field] = val;
            return copy;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!shopName.trim()) return;

        saveShop.mutate(
            {
                name: shopName,
                phone: shopPhone,
                balance: Number(shopBalance),
                contacts: contacts.filter(c => c.name.trim() || c.phone.trim())
            },
            {
                onSuccess: () => {
                    setIsFormOpen(false);
                    setEditingShop(null);
                },
            }
        );
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(price || 0);
    };

    const columns = [
        {
            key: 'name',
            label: 'Shop Name',
            render: (row) => <span className="font-semibold text-gray-800">{row.name}</span>,
        },
        {
            key: 'phone',
            label: 'Phone Number & Contacts',
            render: (row) => (
                <div className="space-y-1">
                    {row.phone && (
                        <div className="flex items-center gap-1 text-gray-700 font-semibold text-xs">
                            <Phone size={12} className="text-gray-400" />
                            <span>{row.phone}</span>
                        </div>
                    )}
                    {row.contacts && row.contacts.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {row.contacts.map((c, i) => (
                                <span 
                                    key={i} 
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-750 border border-indigo-150"
                                    title={`${c.name} (${c.role}): ${c.phone}`}
                                >
                                    <span className="text-[9px] uppercase tracking-wider text-indigo-500 font-bold mr-1">{c.role}:</span>
                                    <span>{c.phone}</span>
                                    {c.name && <span className="text-gray-400 font-normal ml-0.5">({c.name})</span>}
                                </span>
                            ))}
                        </div>
                    )}
                    {!row.phone && (!row.contacts || row.contacts.length === 0) && (
                        <span className="text-gray-400 text-xs">—</span>
                    )}
                </div>
            ),
        },
        {
            key: 'balance',
            label: 'Outstanding Balance',
            render: (row) => {
                const bal = row.balance || 0;
                return (
                    <span className={`font-bold ${bal > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatPrice(bal)}
                    </span>
                );
            },
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '100px',
            render: (row) => (
                <div className="flex justify-end">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(row);
                        }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        title="Edit Shop Details"
                    >
                        <Edit size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Shop Balances"
                description="Monitor running outstanding balances and contact details for all bakery client shops."
                actions={
                    <Button onClick={handleOpenCreate} className="flex items-center gap-2">
                        <Plus size={18} />
                        Add Shop
                    </Button>
                }
            />

            <Card className="p-6">
                <div className="mb-6 relative">
                    <Input
                        placeholder="Search shops by name or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                ) : shops.length === 0 ? (
                    <EmptyState
                        title="No Shops Found"
                        description="Start registering bakery client shops to monitor balances."
                    />
                ) : (
                    <Table columns={columns} data={shops} />
                )}
            </Card>

            {/* Shop Form Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingShop ? 'Edit Shop Details' : 'Add New Bakery Shop'}
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <Input
                        label="Shop Name"
                        placeholder="e.g. Nimal Bakers, Gayan Stores"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        required
                        disabled={!!editingShop} // Don't allow changing shop name, since invoices reference it by name string
                    />
                    <Input
                        label="Primary Phone Number"
                        placeholder="e.g. 0762125472"
                        value={shopPhone}
                        onChange={(e) => setShopPhone(e.target.value)}
                    />
                    <Input
                        label="Outstanding Balance (LKR)"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={shopBalance}
                        onChange={(e) => setShopBalance(e.target.value)}
                        required
                    />

                    {/* Contacts Management */}
                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-semibold text-gray-700">Shop Contacts / Staff Numbers</label>
                            <button
                                type="button"
                                onClick={handleAddContactLine}
                                className="text-xs text-indigo-650 hover:text-indigo-850 font-bold flex items-center gap-1"
                            >
                                <Plus size={14} />
                                Add Contact Number
                            </button>
                        </div>
                        {contacts.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No contacts added yet. Add numbers for Owner, Manager, Worker, etc.</p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {contacts.map((c, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200 animate-in fade-in duration-100">
                                        <input
                                            type="text"
                                            placeholder="Contact Name"
                                            value={c.name}
                                            onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                                            className="flex-1 bg-white border border-gray-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-gray-700"
                                            required
                                        />
                                        <select
                                            value={c.role}
                                            onChange={(e) => handleContactChange(idx, 'role', e.target.value)}
                                            className="w-24 bg-white border border-gray-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-gray-700"
                                        >
                                            <option value="Owner">Owner</option>
                                            <option value="Manager">Manager</option>
                                            <option value="Worker">Worker</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <input
                                            type="text"
                                            placeholder="Phone Number"
                                            value={c.phone}
                                            onChange={(e) => handleContactChange(idx, 'phone', e.target.value)}
                                            className="w-32 bg-white border border-gray-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-gray-750"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveContactLine(idx)}
                                            className="p-1.5 text-gray-400 hover:text-red-650 rounded transition shrink-0"
                                            title="Remove Contact"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={saveShop.isPending}>
                            Save Shop
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
