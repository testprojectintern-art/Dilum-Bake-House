import React, { useEffect, useState } from 'react';
import { Settings, Save, Database, Compass, Search, RefreshCw, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCompanySettings, useUpdateCompanySettings, useDbStats } from '../features/settings/useSettings';
import Button from '../components/ui/Button';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('company'); // 'company', 'db', 'roadmap'
    
    // Tab 1: Company Settings Hooks & State
    const { data: settingsRes, isLoading: isSettingsLoading } = useCompanySettings();
    const updateSettings = useUpdateCompanySettings();

    const [formData, setFormData] = useState({
        companyName: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        taxRegistrationNumber: '',
        receiptFooterMessage: '',
        logo: '',
    });

    useEffect(() => {
        if (settingsRes?.data) {
            const s = settingsRes.data;
            setFormData({
                companyName: s.companyName || '',
                address: s.address || '',
                phone: s.phone || '',
                email: s.email || '',
                website: s.website || '',
                taxRegistrationNumber: s.taxRegistrationNumber || '',
                receiptFooterMessage: s.receiptFooterMessage || '',
                logo: s.logo || '',
            });
        }
    }, [settingsRes]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1024 * 1024) { // 1MB limit
                toast.error('Image size should be less than 1MB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setFormData(prev => ({ ...prev, logo: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateSettings.mutateAsync(formData);
            toast.success('Settings updated successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update settings');
        }
    };

    // Tab 2: Database Storage Hooks & State
    const { 
        data: dbStatsRes, 
        isLoading: isDbLoading, 
        isError: isDbError, 
        error: dbError, 
        refetch: refetchDbStats, 
        isRefetching: isDbRefetching 
    } = useDbStats();
    
    const [searchQuery, setSearchQuery] = useState('');

    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0 || !bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const filteredCollections = dbStatsRes?.data?.collections?.filter(col => 
        col.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const maxFreeSize = 512 * 1024 * 1024; // 512 MB
    const dbStorageSize = dbStatsRes?.data?.storageSize || 0;
    const percentUsed = Math.min((dbStorageSize / maxFreeSize) * 100, 100).toFixed(1);

    if (isSettingsLoading) {
        return <div className="p-6">Loading settings...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="text-primary-600" />
                        System Settings & Health
                    </h1>
                    <p className="text-gray-500 mt-1">Configure company profiles, inspect database health, and view system roadmaps.</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('company')}
                    className={`flex items-center gap-2 py-3 px-6 border-b-2 font-medium text-sm transition-colors outline-none ${
                        activeTab === 'company'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    <Settings size={16} />
                    Company Settings
                </button>
                <button
                    onClick={() => setActiveTab('db')}
                    className={`flex items-center gap-2 py-3 px-6 border-b-2 font-medium text-sm transition-colors outline-none ${
                        activeTab === 'db'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    <Database size={16} />
                    Database Storage & Health
                </button>
                <button
                    onClick={() => setActiveTab('roadmap')}
                    className={`flex items-center gap-2 py-3 px-6 border-b-2 font-medium text-sm transition-colors outline-none ${
                        activeTab === 'roadmap'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    <Compass size={16} />
                    System Roadmap
                </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'company' && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                                <div className="flex items-center gap-6">
                                    <div className="border border-gray-300 rounded-lg p-2 w-32 h-32 flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                                        {formData.logo ? (
                                            <img src={formData.logo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <div className="text-center text-xs text-gray-400">No logo uploaded</div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <label className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm">
                                                Choose Logo
                                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                                            </label>
                                            {formData.logo && (
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveLogo}
                                                    className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500">Square or rectangular logo under 1MB is recommended. Will print on POS receipts.</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                                <input
                                    type="text"
                                    name="companyName"
                                    required
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                <input
                                    type="text"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax / Registration Number</label>
                                <input
                                    type="text"
                                    name="taxRegistrationNumber"
                                    value={formData.taxRegistrationNumber}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Footer Message</label>
                                <textarea
                                    name="receiptFooterMessage"
                                    rows={3}
                                    value={formData.receiptFooterMessage}
                                    onChange={handleChange}
                                    placeholder="E.g. Thank you for your business! Please visit again."
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">This message will be printed at the bottom of thermal receipts.</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t flex justify-end">
                            <Button type="submit" variant="primary" loading={updateSettings.isPending}>
                                <Save size={18} className="mr-2" /> Save Settings
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'db' && (
                <div className="space-y-6">
                    {isDbLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-white border rounded-xl shadow-sm">
                            <RefreshCw className="animate-spin text-primary-600" size={32} />
                            <p className="text-gray-500">Fetching database statistics...</p>
                        </div>
                    ) : isDbError ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
                            <ShieldAlert className="text-red-600 shrink-0" size={24} />
                            <div>
                                <h3 className="font-semibold text-red-800">Failed to load database statistics</h3>
                                <p className="text-red-700 text-sm mt-1">
                                    {dbError?.response?.data?.message || dbError?.message || "Verify your connection or user role permissions."}
                                </p>
                                <button 
                                    onClick={() => refetchDbStats()} 
                                    className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Top Stats Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-xl border shadow-sm">
                                    <p className="text-sm font-medium text-gray-400">Total Storage Size</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatBytes(dbStatsRes?.data?.totalSize)}</h3>
                                    <p className="text-xs text-gray-500 mt-1">Data + Index sizes</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border shadow-sm">
                                    <p className="text-sm font-medium text-gray-400">Compressed Data Size</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatBytes(dbStatsRes?.data?.storageSize)}</h3>
                                    <p className="text-xs text-gray-500 mt-1">Physical disk space</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border shadow-sm">
                                    <p className="text-sm font-medium text-gray-400">Total Index Size</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatBytes(dbStatsRes?.data?.indexSize)}</h3>
                                    <p className="text-xs text-gray-500 mt-1">Size of all indexes</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border shadow-sm">
                                    <p className="text-sm font-medium text-gray-400">Total Documents</p>
                                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{dbStatsRes?.data?.objectsCount?.toLocaleString()}</h3>
                                    <p className="text-xs text-gray-500 mt-1">In {dbStatsRes?.data?.collectionsCount} collections</p>
                                </div>
                            </div>

                            {/* Atlas M0 Free Tier Gauge */}
                            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Database className="text-primary-600" size={20} />
                                        <h3 className="font-semibold text-gray-800">MongoDB Atlas Free Tier Usage</h3>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-600">{formatBytes(dbStorageSize)} / 512 MB ({percentUsed}%)</span>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            percentUsed >= 85 ? 'bg-red-600' : percentUsed >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${percentUsed}%` }}
                                    />
                                </div>

                                {/* Warning Banners */}
                                {percentUsed >= 85 ? (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 text-red-800 text-sm">
                                        <AlertTriangle size={18} className="shrink-0 text-red-600" />
                                        <div>
                                            <span className="font-semibold">Critical storage warning!</span> Your database storage has reached {percentUsed}% of the 512MB Atlas M0 Free Tier limit. You should upgrade to a paid cluster or clean up logs, audit records, and old stock movement data to avoid system write lockouts.
                                        </div>
                                    </div>
                                ) : percentUsed >= 60 ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800 text-sm">
                                        <AlertTriangle size={18} className="shrink-0 text-amber-600" />
                                        <div>
                                            <span className="font-semibold">Storage warning.</span> Your database storage is at {percentUsed}%. Consider cleaning up unused draft products, old documents, or database logs soon.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-3 text-emerald-800 text-sm">
                                        <CheckCircle size={18} className="shrink-0 text-emerald-600" />
                                        <div>
                                            <span className="font-semibold">Storage health is excellent.</span> Database size is well within limits. No action is required.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Collections Breakdown */}
                            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                                <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">Collections Breakdown</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Size details per collection</p>
                                    </div>
                                    
                                    {/* Search and Refresh */}
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                            <input 
                                                type="text"
                                                placeholder="Search collections..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full sm:w-64 pl-9 pr-4 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => refetchDbStats()}
                                            disabled={isDbRefetching}
                                            className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-50 transition-colors"
                                            title="Refresh data"
                                        >
                                            <RefreshCw size={16} className={isDbRefetching ? 'animate-spin' : ''} />
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-400 font-semibold border-b uppercase text-xs">
                                                <th className="py-3 px-5">Collection Name</th>
                                                <th className="py-3 px-5 text-right">Documents</th>
                                                <th className="py-3 px-5 text-right">Data Size</th>
                                                <th className="py-3 px-5 text-right">Index Size</th>
                                                <th className="py-3 px-5 text-right">Storage on Disk</th>
                                                <th className="py-3 px-5 text-right">Usage Share</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y text-gray-700">
                                            {filteredCollections.length > 0 ? (
                                                filteredCollections.map((col) => {
                                                    const share = dbStatsRes?.data?.storageSize > 0 
                                                        ? ((col.storageSize / dbStatsRes.data.storageSize) * 100).toFixed(1)
                                                        : '0.0';
                                                    return (
                                                        <tr key={col.name} className="hover:bg-gray-50">
                                                            <td className="py-3 px-5 font-medium text-gray-900">{col.name}</td>
                                                            <td className="py-3 px-5 text-right font-mono">{col.count.toLocaleString()}</td>
                                                            <td className="py-3 px-5 text-right font-mono text-gray-500">{formatBytes(col.size)}</td>
                                                            <td className="py-3 px-5 text-right font-mono text-gray-500">{formatBytes(col.totalIndexSize)}</td>
                                                            <td className="py-3 px-5 text-right font-mono font-medium">{formatBytes(col.storageSize)}</td>
                                                            <td className="py-3 px-5 text-right font-semibold text-primary-600">{share}%</td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="py-8 px-5 text-center text-gray-400">
                                                        No collections found matching your search.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'roadmap' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-6 rounded-xl text-white shadow-md">
                        <h3 className="text-xl font-bold">Dilum Bake House Management Roadmap</h3>
                        <p className="text-sm text-primary-100 mt-2">
                            A complete expansion roadmap tailored to bakery distribution, stock control, and wholesale billing management.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Phase 2 Card */}
                        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b pb-3">
                                <h4 className="font-bold text-gray-800">Phase 2: Watch Operations</h4>
                                <span className="text-xs bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full font-medium border border-green-200">Completed</span>
                            </div>
                            <ul className="space-y-3 text-sm text-gray-600">
                                <li className="flex items-start gap-2">
                                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                                    <span><strong>Serial Tracking:</strong> Track individual serial numbers from GRN to invoice checkouts.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                                    <span><strong>Warranty Claims:</strong> Monitor returns and replacements back to manufacturers / suppliers.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                                    <span><strong>Gift & Engravings:</strong> Support gift options and back-case engraving notes at checkout.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                                    <span><strong>Pre-Orders:</strong> Accept reservation deposits for upcoming high-value stock models.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Phase 3 Card */}
                        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b pb-3">
                                <h4 className="font-bold text-gray-800">Phase 3: Business Analytics</h4>
                                <span className="text-xs bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full font-medium border border-green-200">Completed</span>
                            </div>
                            <ul className="space-y-3 text-sm text-gray-600">
                                <li className="flex items-start gap-2">
                                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                                    <span><strong>Aging Inventory:</strong> Track idle stock and locked capital sorted by 0-180+ days.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                                    <span><strong>Brand Contribution:</strong> Compare Sales Volumes vs. Profit Margins per watch brand.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                                    <span><strong>AOV Bundling:</strong> Dynamic suggestions for straps/boxes based on purchase affinity.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                                    <span><strong>Seasonal Velocity:</strong> Cross-year line graphs mapping peak holiday and wedding sales.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Phase 4 Card */}
                        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b pb-3">
                                <h4 className="font-bold text-gray-800">Phase 4: Customer Trust</h4>
                                <span className="text-xs bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full font-medium border border-green-200">Completed</span>
                            </div>
                            <ul className="space-y-3 text-sm text-gray-600">
                                <li className="flex items-start gap-2">
                                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                                    <span><strong>Public Warranty Portal:</strong> Customers query authentic status and warranty days left.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                                    <span><strong>Trade-in Calculator:</strong> Evaluate customer watch value for new discounts.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                                    <span><strong>Strap Price Tags:</strong> Print specialized strap-wrap barcode stickers.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary-600 font-bold mt-0.5">•</span>
                                    <span><strong>Anniversary SMS:</strong> Automatic birthday coupons to drive client retention.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
