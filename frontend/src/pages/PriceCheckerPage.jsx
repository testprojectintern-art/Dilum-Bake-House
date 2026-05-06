import { useState } from 'react';
import { Search, Package, Info, ArrowLeft, LogOut, ShoppingBag, ChevronRight, Tag, X, LayoutGrid, List } from 'lucide-react';
import { useProducts } from '../features/products/useProducts';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';

export default function PriceCheckerPage() {
    const { logout, user } = useAuthStore();
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);

    const { data: productsData, isLoading } = useProducts({ search, limit: 40 });
    const products = productsData?.data || [];

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        setSelectedProduct(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col antialiased selection:bg-primary-500 selection:text-white">
            {/* Background Layer */}
            <div className="fixed inset-0 z-0">
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
                    style={{ backgroundImage: `url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/80 to-primary-100/40" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
                        <Package className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">RISHAN <span className="text-primary-600">WHOLESALE</span></h1>
                </div>
                
                <button 
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-600 hover:text-white transition-all border border-red-100"
                >
                    <LogOut size={16} />
                    <span>Exit</span>
                </button>
            </header>

            <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 relative z-10">
                {!selectedProduct ? (
                    <div className="space-y-8">
                        {/* Search Bar */}
                        <div className="w-full">
                            <div className="bg-white rounded-3xl shadow-2xl shadow-primary-900/10 p-2 border border-gray-100 flex items-center focus-within:ring-4 focus-within:ring-primary-500/10 transition-all">
                                <div className="p-3">
                                    <Search className="text-primary-500 w-7 h-7" />
                                </div>
                                <input
                                    type="text"
                                    className="flex-1 bg-transparent border-none outline-none text-xl md:text-2xl font-bold text-gray-900 placeholder-gray-400 py-3 pr-4"
                                    placeholder="Search products..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    autoFocus
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="p-2 mr-2 hover:bg-gray-100 rounded-full text-gray-400">
                                        <X size={24} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Vertical Product List - Shows items one below the other */}
                        <div className="space-y-3">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="h-24 bg-white/80 rounded-2xl animate-pulse border border-gray-100" />
                                ))
                            ) : products.length > 0 ? (
                                products.map((product) => (
                                    <button
                                        key={product._id}
                                        onClick={() => handleSelectProduct(product)}
                                        className="group w-full bg-white/95 backdrop-blur-sm p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-primary-900/5 hover:-translate-y-1 transition-all duration-300 text-left flex items-center gap-4 md:gap-6 relative overflow-hidden cursor-pointer"
                                    >
                                        <div className="p-3 bg-primary-50 rounded-2xl text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300 flex-shrink-0">
                                            <ShoppingBag size={24} />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[9px] font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-gray-100">
                                                    {product.productCode}
                                                </span>
                                                {product.sku && <span className="text-[9px] font-bold text-gray-300">SKU: {product.sku}</span>}
                                            </div>
                                            <h3 className="font-black text-gray-900 text-lg md:text-xl leading-tight group-hover:text-primary-600 transition-colors truncate">
                                                {product.name}
                                            </h3>
                                        </div>
                                        
                                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Retail Price</p>
                                            <p className="text-lg md:text-2xl font-black text-primary-600 italic leading-none">LKR {product.basePrice?.toLocaleString()}</p>
                                        </div>

                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary-600 group-hover:text-white transition-all flex-shrink-0">
                                            <ChevronRight size={24} />
                                        </div>
                                    </button>
                                ))
                            ) : search ? (
                                <div className="py-20 text-center bg-white/60 rounded-3xl border-2 border-dashed border-gray-200">
                                    <p className="text-gray-500 text-lg font-bold">No results for "{search}"</p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto w-full animate-in fade-in zoom-in-95 duration-300 pb-10">
                        <button 
                            onClick={handleBack}
                            className="flex items-center gap-2 text-gray-900 font-black text-xs md:text-sm mb-6 px-6 py-3 rounded-2xl bg-white shadow-md hover:shadow-lg transition-all"
                        >
                            <ArrowLeft size={16} />
                            BACK TO RESULTS
                        </button>

                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100">
                            {/* Product Header */}
                            <div className="bg-gradient-to-br from-primary-600 to-blue-700 p-8 md:p-10 text-white">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div className="space-y-2">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                                            <Tag size={12} />
                                            OFFICIAL WHOLESALE PRICE
                                        </div>
                                        <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">{selectedProduct.name}</h2>
                                        <p className="px-2.5 py-0.5 bg-black/20 rounded-lg text-sm font-mono text-primary-200 border border-white/10 font-bold w-fit">
                                            {selectedProduct.productCode}
                                        </p>
                                    </div>
                                    <div className="bg-white p-5 rounded-3xl shadow-xl flex flex-col items-end min-w-[180px]">
                                        <p className="text-[10px] font-black uppercase text-gray-400 mb-0.5">Base Retail</p>
                                        <p className="text-2xl md:text-3xl font-black text-primary-600 italic">LKR {selectedProduct.basePrice?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-8 md:p-10 space-y-8 bg-white">
                                {selectedProduct.description && (
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</h4>
                                        <p className="text-gray-700 text-base md:text-lg font-medium">{selectedProduct.description}</p>
                                    </div>
                                )}

                                {/* Compact Wholesale Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bulk Price Tiers</h4>
                                        <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Units in {selectedProduct.unitOfMeasure?.name || 'PCS'}</span>
                                    </div>
                                    
                                    <div className="grid gap-2">
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-600 font-black text-base shadow-sm border border-gray-100">1</div>
                                                <p className="font-bold text-gray-900 text-sm">Retail Price</p>
                                            </div>
                                            <p className="text-lg md:text-xl font-black text-gray-900 italic">LKR {selectedProduct.basePrice?.toLocaleString()}</p>
                                        </div>

                                        {selectedProduct.tierPricing?.map((tier, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-primary-50 rounded-2xl border border-primary-100">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-md">{tier.minQuantity}</div>
                                                    <div>
                                                        <p className="font-bold text-primary-900 text-sm">{tier.tierName || `Bulk Price`}</p>
                                                        <p className="text-[9px] text-primary-600 font-bold uppercase">Min Qty: {tier.minQuantity}</p>
                                                    </div>
                                                </div>
                                                <p className="text-lg md:text-xl font-black text-primary-700 italic">LKR {tier.price?.toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {selectedProduct.mrp > 0 && (
                                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center opacity-70">
                                        <p className="text-[9px] font-black text-red-400 uppercase italic tracking-widest">Manufacturer MRP</p>
                                        <span className="text-gray-300 font-black text-base line-through decoration-red-400/30 italic">LKR {selectedProduct.mrp?.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="p-8 text-center mt-auto">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-40">RISHAN WHOLESALE ERP</p>
            </footer>
        </div>
    );
}
