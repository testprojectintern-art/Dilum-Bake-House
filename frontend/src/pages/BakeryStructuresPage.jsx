import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Loader2, Save, FileText, PlusCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import {
    useBakeryStructures,
    useCreateBakeryStructure,
    useUpdateBakeryStructure,
    useDeleteBakeryStructure,
    useBakeryProducts
} from '../features/bakery/useBakery';
import toast from 'react-hot-toast';

export default function BakeryStructuresPage() {
    const { data: structuresData, isLoading: structuresLoading } = useBakeryStructures();
    const { data: productsData } = useBakeryProducts();

    const createStructure = useCreateBakeryStructure();
    const updateStructure = useUpdateBakeryStructure();
    const deleteStructure = useDeleteBakeryStructure();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingStructure, setEditingStructure] = useState(null);
    const [structureName, setStructureName] = useState('');
    const [prices, setPrices] = useState([]); // Array of { productName: '', price: 0 }
    const [deletingStructure, setDeletingStructure] = useState(null);

    const structures = structuresData?.data || [];
    const dbProducts = productsData?.data || [];

    // Pre-fill form when editing or adding
    const handleOpenCreate = () => {
        setEditingStructure(null);
        setStructureName('');
        // Populate all existing registered products with price = 0
        const initialPrices = dbProducts.map(p => ({
            productName: p.name,
            price: 0
        }));
        setPrices(initialPrices);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (structure) => {
        setEditingStructure(structure);
        setStructureName(structure.name);
        
        // Merge structure prices with any new products in DB
        const structPrices = [...structure.prices];
        const structProdNames = structPrices.map(sp => sp.productName.toLowerCase());

        dbProducts.forEach(p => {
            if (!structProdNames.includes(p.name.toLowerCase())) {
                structPrices.push({
                    productName: p.name,
                    price: 0
                });
            }
        });

        setPrices(structPrices);
        setIsFormOpen(true);
    };

    const handleAddCustomProductLine = () => {
        setPrices(prev => [...prev, { productName: '', price: 0, isNew: true }]);
    };

    const handlePriceChange = (index, value) => {
        const val = Number(value) || 0;
        setPrices(prev => {
            const copy = [...prev];
            copy[index].price = val;
            return copy;
        });
    };

    const handleProductNameChange = (index, value) => {
        setPrices(prev => {
            const copy = [...prev];
            copy[index].productName = value;
            return copy;
        });
    };

    const handleRemoveProductLine = (index) => {
        setPrices(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!structureName.trim()) {
            toast.error('Structure name is required');
            return;
        }

        // Filter out pricing items with empty product name
        const filteredPrices = prices
            .filter(p => p.productName && p.productName.trim() !== '')
            .map(p => ({
                productName: p.productName.trim(),
                price: Number(p.price || 0)
            }));

        const data = {
            name: structureName.trim(),
            prices: filteredPrices
        };

        if (editingStructure) {
            updateStructure.mutate(
                { id: editingStructure._id, data },
                {
                    onSuccess: () => {
                        setIsFormOpen(false);
                        setEditingStructure(null);
                    }
                }
            );
        } else {
            createStructure.mutate(data, {
                onSuccess: () => {
                    setIsFormOpen(false);
                }
            });
        }
    };

    const handleDeleteConfirm = () => {
        if (!deletingStructure) return;
        deleteStructure.mutate(deletingStructure._id, {
            onSuccess: () => {
                setDeletingStructure(null);
            }
        });
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
            label: 'Structure Name',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-emerald-600" />
                    </div>
                    <span className="font-semibold text-gray-800">{row.name}</span>
                </div>
            )
        },
        {
            key: 'pricesCount',
            label: 'Products Count',
            render: (row) => `${row.prices?.length || 0} Products`
        },
        {
            key: 'createdAt',
            label: 'Created Date',
            render: (row) => new Date(row.createdAt).toLocaleDateString()
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '120px',
            render: (row) => (
                <div className="flex gap-1 justify-end">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(row);
                        }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        title="Edit Structure"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeletingStructure(row);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete Structure"
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
                title="Pricing Structures"
                description="Create customized pricing groups or price lists (e.g. Retail, Wholesale, Custom shop pricing)."
                actions={
                    <Button onClick={handleOpenCreate} className="flex items-center gap-2">
                        <Plus size={18} />
                        Add Structure
                    </Button>
                }
            />

            <Card className="p-6">
                {structuresLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                ) : structures.length === 0 ? (
                    <EmptyState
                        title="No Pricing Structures"
                        description="Start creating custom pricing layouts to easily generate bills with loaded prices."
                    />
                ) : (
                    <Table columns={columns} data={structures} />
                )}
            </Card>

            {/* Pricing Structure Edit/Add Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingStructure ? 'Edit Pricing Structure' : 'Create Pricing Structure'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[80vh]">
                    <div className="p-6 space-y-4 flex-shrink-0 border-b">
                        <Input
                            label="Structure Name"
                            placeholder="e.g. Retail Pricing, Special Wholesale, Gayan Stores Custom Pricing"
                            value={structureName}
                            onChange={(e) => setStructureName(e.target.value)}
                            required
                        />
                        <div className="flex justify-between items-center pt-2">
                            <h3 className="font-semibold text-gray-700 text-sm">Product Price List</h3>
                            <button
                                type="button"
                                onClick={handleAddCustomProductLine}
                                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                                <PlusCircle size={14} />
                                Add Custom Product Line
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-[250px]">
                        {prices.length === 0 ? (
                            <p className="text-gray-400 text-center py-8 text-sm">
                                No products listed. Click 'Add Custom Product Line' to begin.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {prices.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                        <div className="flex-1">
                                            {p.isNew ? (
                                                <Input
                                                    placeholder="Product Name"
                                                    value={p.productName}
                                                    onChange={(e) => handleProductNameChange(idx, e.target.value)}
                                                    required
                                                    className="w-full"
                                                />
                                            ) : (
                                                <span className="font-medium text-gray-700 text-sm pl-2 block truncate">
                                                    {p.productName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="w-40">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    value={p.price === 0 ? '' : p.price}
                                                    onChange={(e) => handlePriceChange(idx, e.target.value)}
                                                    className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-8 pr-3 py-1.5 text-sm font-semibold text-gray-700 focus:outline-none"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">LKR</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveProductLine(idx)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded transition shrink-0"
                                            title="Remove Item"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t flex justify-end gap-2 flex-shrink-0 bg-white">
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={createStructure.isPending || updateStructure.isPending}>
                            <Save size={16} className="mr-2" />
                            Save Structure
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={!!deletingStructure}
                onClose={() => setDeletingStructure(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Structure"
                message={`Are you sure you want to delete "${deletingStructure?.name}"? Shops currently using this will not be affected, but you won't be able to apply this structure to new invoices.`}
                confirmText="Delete"
                loading={deleteStructure.isPending}
            />
        </div>
    );
}
