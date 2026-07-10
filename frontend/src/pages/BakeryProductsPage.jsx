import { useState } from 'react';
import { Search, Plus, Trash2, Loader2, Package } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { useBakeryProducts, useCreateBakeryProduct, useDeleteBakeryProduct } from '../features/bakery/useBakery';
import { useAuthStore } from '../store/authStore';

export default function BakeryProductsPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager'].includes(user?.role);

    const [search, setSearch] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [deletingProduct, setDeletingProduct] = useState(null);

    const { data, isLoading } = useBakeryProducts(search);
    const createProduct = useCreateBakeryProduct();
    const deleteProduct = useDeleteBakeryProduct();

    const products = data?.data || [];

    const handleAddProduct = (e) => {
        e.preventDefault();
        if (!newProductName.trim()) return;
        createProduct.mutate(newProductName, {
            onSuccess: () => {
                setNewProductName('');
                setIsAddOpen(false);
            }
        });
    };

    const handleDeleteConfirm = () => {
        if (!deletingProduct) return;
        deleteProduct.mutate(deletingProduct._id, {
            onSuccess: () => {
                setDeletingProduct(null);
            }
        });
    };

    const columns = [
        {
            key: 'name',
            label: 'Product Name',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <Package size={16} className="text-indigo-600" />
                    </div>
                    <span className="font-semibold text-gray-800">{row.name}</span>
                </div>
            )
        },
        {
            key: 'createdAt',
            label: 'Added On',
            render: (row) => new Date(row.createdAt).toLocaleDateString()
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
                            setDeletingProduct(row);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete Product"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bakery Products"
                description="Manage products for Dilum Bake House with just their names."
                actions={
                    <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2">
                        <Plus size={18} />
                        Add Product
                    </Button>
                }
            />

            <Card className="p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Input
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                ) : products.length === 0 ? (
                    <EmptyState
                        title="No Products Found"
                        description="Start by adding bakery products to register them in the system."
                    />
                ) : (
                    <Table columns={columns} data={products} />
                )}
            </Card>

            {/* Add Product Modal */}
            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Bakery Product">
                <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                    <Input
                        label="Product Name"
                        placeholder="e.g. Bread, Chocolate Bun, Jam Bun"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        required
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={createProduct.isPending}>
                            Save Product
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={!!deletingProduct}
                onClose={() => setDeletingProduct(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Product"
                message={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                loading={deleteProduct.isPending}
            />
        </div>
    );
}
