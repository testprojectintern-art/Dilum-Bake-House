import { useState } from 'react';
import { Search, Plus, Loader2, Phone, DollarSign, Edit } from 'lucide-react';
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

    const { data, isLoading } = useBakeryShops(search);
    const saveShop = useCreateBakeryShop();

    const shops = data?.data || [];

    const handleOpenCreate = () => {
        setEditingShop(null);
        setShopName('');
        setShopPhone('');
        setShopBalance('0');
        setIsFormOpen(true);
    };

    const handleOpenEdit = (shop) => {
        setEditingShop(shop);
        setShopName(shop.name);
        setShopPhone(shop.phone || '');
        setShopBalance(String(shop.balance || 0));
        setIsFormOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!shopName.trim()) return;

        saveShop.mutate(
            {
                name: shopName,
                phone: shopPhone,
                balance: Number(shopBalance),
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
            label: 'Phone Number',
            render: (row) => row.phone ? (
                <div className="flex items-center gap-1 text-gray-600">
                    <Phone size={14} />
                    <span>{row.phone}</span>
                </div>
            ) : (
                <span className="text-gray-400 text-xs">—</span>
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
                    <Search className="absolute left-3 top-[36px] -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                        label="Phone Number(s)"
                        placeholder="e.g. 0762125472, 0774334046 (separate with commas)"
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

                    <div className="flex justify-end gap-2 pt-4">
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
