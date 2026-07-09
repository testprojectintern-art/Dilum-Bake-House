import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Search, RefreshCw, Watch } from 'lucide-react';
import axios from 'axios';

export default function PublicWarrantyCheckPage() {
    const [serialNumber, setSerialNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!serialNumber.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            // Use direct axios call to ensure no auth interceptors interfere
            const res = await axios.get(`/api/public/warranty-check/${serialNumber.trim()}`);
            if (res.data.success) {
                setResult(res.data);
            } else {
                setError(res.data.message || 'An error occurred during verification.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Could not verify serial number. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-LK', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
            {/* Visual background gradient glow effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-650/15 border border-indigo-500/20 text-indigo-400 rounded-2xl mb-4">
                        <Watch size={30} className="animate-pulse" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Dilum Bake House Portal</h1>
                    <p className="text-xs text-slate-450 mt-1.5 font-medium">Verify product authenticity & check active status</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSearch} className="mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Enter Serial Number (e.g. SN12345)"
                            value={serialNumber}
                            onChange={(e) => setSerialNumber(e.target.value)}
                            disabled={loading}
                            className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none transition-all uppercase tracking-wider"
                        />
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        
                        <button
                            type="submit"
                            disabled={loading || !serialNumber.trim()}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition duration-200 disabled:opacity-50 disabled:hover:bg-indigo-600"
                        >
                            {loading ? (
                                <RefreshCw size={16} className="animate-spin" />
                            ) : (
                                <Search size={16} />
                            )}
                        </button>
                    </div>
                </form>

                {/* Error Box */}
                {error && (
                    <div className="p-4 bg-red-950/40 border border-red-900/30 rounded-2xl text-xs font-semibold text-red-400 mb-6 text-center">
                        {error}
                    </div>
                )}

                {/* Verification Results */}
                {result && (
                    <div className="space-y-6 animate-fadeIn">
                        {result.authentic ? (
                            <>
                                {/* Success Banner */}
                                <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-500/20 rounded-2xl">
                                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-450 border border-emerald-550/20 rounded-xl flex items-center justify-center shrink-0">
                                        <ShieldCheck size={22} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-400">Product Verified Authentic</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Officially cataloged in Dilum Bake House inventory</p>
                                    </div>
                                </div>

                                {/* Watch Specs List */}
                                <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                                    <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-800/50">
                                        <span className="text-slate-450 font-medium">Model Name</span>
                                        <span className="font-bold text-white text-right">{result.productName}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-800/50">
                                        <span className="text-slate-450 font-medium">Model Code</span>
                                        <span className="font-bold text-white font-mono">{result.productCode}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-800/50">
                                        <span className="text-slate-450 font-medium">Brand</span>
                                        <span className="font-bold text-white">{result.brandName}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-800/50">
                                        <span className="text-slate-450 font-medium">Serial Number</span>
                                        <span className="font-bold text-white font-mono tracking-wider">{result.serialNumber}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-450 font-medium">Warranty Expiry</span>
                                        <span className="font-bold text-white">{formatDate(result.warrantyExpiryDate)}</span>
                                    </div>
                                </div>

                                {/* Warranty Status Badge Card */}
                                <div className={`p-4 rounded-2xl border text-center ${
                                    result.warrantyStatus === 'active' ? 'bg-indigo-950/20 border-indigo-500/20 text-indigo-300' :
                                    result.warrantyStatus === 'expired' ? 'bg-red-950/20 border-red-500/20 text-red-300' :
                                    'bg-slate-850/50 border-slate-800 text-slate-350'
                                }`}>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-450">Warranty Status</p>
                                    <p className="text-2xl font-black mt-1 uppercase tracking-wider">
                                        {result.warrantyStatus === 'active' ? 'Active' :
                                         result.warrantyStatus === 'expired' ? 'Expired' : 'Not Activated'}
                                    </p>
                                    {result.warrantyStatus === 'active' && result.daysRemaining > 0 && (
                                        <p className="text-xs font-semibold mt-1.5 text-indigo-400">
                                            {result.daysRemaining} days of warranty coverage remaining
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Inauthentic Alert */
                            <div className="p-5 bg-red-950/40 border border-red-500/20 rounded-2xl text-center space-y-4">
                                <div className="inline-flex p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl">
                                    <ShieldAlert size={28} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-red-400">Verification Failed</p>
                                    <p className="text-xs text-slate-350 leading-relaxed px-2">
                                        This serial number was not found in our database. The product could be inauthentic or purchased from an unauthorized reseller.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <p className="text-[10px] text-slate-650 font-medium mt-8 relative z-10">
                &copy; {new Date().getFullYear()} Dilum Bake House. All rights reserved.
            </p>
        </div>
    );
}
