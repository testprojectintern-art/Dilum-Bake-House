import { useState } from 'react';
import { useProducts, useUpdateProduct } from '../features/products/useProducts';
import { Search, DollarSign, Plus, Trash2, Save, Calculator } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function WholesalePricesPage() {
    const [search, setSearch] = useState('');
    const { data: productsData, isLoading } = useProducts({ search });
    const products = productsData?.data || [];
    const updateProduct = useUpdateProduct();

    const [editingId, setEditingId] = useState(null);
    const [tempTiers, setTempTiers] = useState([]);

    const handleStartEdit = (product) => {
        setEditingId(product._id);
        setTempTiers(product.tierPricing || []);
    };

    const handleAddTier = (productName) => {
        setTempTiers([...tempTiers, { tierName: productName, minQuantity: 1, maxQuantity: null, price: 0 }]);
    };

    const handleRemoveTier = (index) => {
        setTempTiers(tempTiers.filter((_, i) => i !== index));
    };

    const handleTierChange = (index, field, value) => {
        const newTiers = [...tempTiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setTempTiers(newTiers);
    };

    const handleSave = async (product) => {
        try {
            await updateProduct.mutateAsync({
                id: product._id,
                data: {
                    tierPricing: tempTiers
                }
            });
            setEditingId(null);
        } catch (err) {
            // Error handled by hook
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Wholesale Price Management</h1>
                    <p className="text-gray-500">Manage tiered pricing tables for all products in one place.</p>
                </div>
            </div>

            <Card className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </Card>

            <div className="grid gap-6">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    </div>
                ) : products.map((product) => (
                    <Card key={product._id} className="overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-900">{product.name}</h3>
                                <p className="text-xs text-gray-500 font-mono">{product.productCode} | Buying Price: LKR {product.costs?.standardCost?.toLocaleString()}</p>
                            </div>
                            {editingId === product._id ? (
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                                    <Button variant="primary" size="sm" onClick={() => handleSave(product)} loading={updateProduct.isPending}>
                                        <Save className="w-4 h-4 mr-1" /> Save Prices
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="outline" size="sm" onClick={() => handleStartEdit(product)}>
                                    <Calculator className="w-4 h-4 mr-1" /> Manage Prices
                                </Button>
                            )}
                        </div>

                        <div className="p-4">
                            {editingId === product._id ? (
                                <div className="space-y-4">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead>
                                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase">
                                                    <th className="px-3 py-2">Tier Name</th>
                                                    <th className="px-3 py-2">Min Qty</th>
                                                    <th className="px-3 py-2">Max Qty</th>
                                                    <th className="px-3 py-2">Price (LKR)</th>
                                                    <th className="px-3 py-2">Profit %</th>
                                                    <th className="px-3 py-2 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {tempTiers.map((tier, idx) => {
                                                    const buyingPrice = product.costs?.standardCost || 0;
                                                    const profit = buyingPrice > 0 ? ((tier.price - buyingPrice) / buyingPrice * 100).toFixed(2) : 0;
                                                    
                                                    return (
                                                        <tr key={idx}>
                                                            <td className="px-2 py-2">
                                                                <input 
                                                                    className="w-full p-1 border rounded text-sm" 
                                                                    value={tier.tierName} 
                                                                    onChange={(e) => handleTierChange(idx, 'tierName', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-2">
                                                                <input 
                                                                    type="number"
                                                                    className="w-20 p-1 border rounded text-sm" 
                                                                    value={tier.minQuantity} 
                                                                    onChange={(e) => handleTierChange(idx, 'minQuantity', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-2">
                                                                <input 
                                                                    type="number"
                                                                    className="w-20 p-1 border rounded text-sm" 
                                                                    value={tier.maxQuantity || ''} 
                                                                    placeholder="No limit"
                                                                    onChange={(e) => handleTierChange(idx, 'maxQuantity', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-2">
                                                                <input 
                                                                    type="number"
                                                                    className="w-32 p-1 border rounded text-sm font-bold text-primary-700" 
                                                                    value={tier.price} 
                                                                    onChange={(e) => handleTierChange(idx, 'price', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <span className={`text-sm font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {profit}%
                                                                </span>
                                                            </td>
                                                            <td className="px-2 py-2 text-right">
                                                                <button onClick={() => handleRemoveTier(idx)} className="text-red-500 hover:text-red-700">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => handleAddTier(product.name)} fullWidth>
                                        <Plus className="w-4 h-4 mr-1" /> Add New Price Tier
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {/* Default Price */}
                                    <div className="p-3 bg-primary-50 rounded-lg border border-primary-100">
                                        <p className="text-[10px] uppercase font-bold text-primary-400">Retail / Base</p>
                                        <p className="text-lg font-bold text-primary-700">LKR {product.basePrice?.toLocaleString()}</p>
                                    </div>

                                    {/* Existing Tiers Summary */}
                                    {product.tierPricing?.map((tier, idx) => (
                                        <div key={idx} className="p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                            <p className="text-[10px] uppercase font-bold text-gray-400">
                                                {tier.tierName || `Qty ${tier.minQuantity}+`}
                                            </p>
                                            <p className="text-lg font-bold text-gray-800">LKR {tier.price?.toLocaleString()}</p>
                                        </div>
                                    ))}

                                    {(!product.tierPricing || product.tierPricing.length === 0) && (
                                        <div className="col-span-3 flex items-center text-sm text-gray-400 italic">
                                            No additional wholesale tiers defined.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
