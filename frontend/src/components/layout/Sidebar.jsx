import { useState, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, BarChart3, Package, ShoppingCart, Users, Settings,
    FolderTree, Award, UserCircle, Tags, Warehouse, Boxes, Truck,
    ShoppingBag, FileText, Receipt, Wallet, Workflow, Factory, ShieldCheck,
    RotateCcw, Wrench, AlertTriangle, FileMinus, X, Users as UsersIcon, Building2, Clock, Calendar as CalendarIcon, Plane, Calculator, DollarSign,
    Landmark, FileCheck, PackageCheck, ArrowRightLeft, ChevronDown, ChevronRight
} from 'lucide-react';

// ── Grouped menu structure ──────────────────────────────────────────────────
const menuGroups = [
    {
        label: 'Main Dashboard',
        id: 'overview',
        items: [
            { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        ],
    },
    {
        label: 'Catalog & Inventory',
        id: 'inventory',
        items: [
            { label: 'Products', icon: Package, path: '/products' },
            { label: 'Categories', icon: FolderTree, path: '/categories' },
            { label: 'Brands', icon: Award, path: '/brands' },
            { label: 'Warehouses', icon: Warehouse, path: '/warehouses' },
            { label: 'Stock Levels', icon: Boxes, path: '/stock' },
            { label: 'Stock Transfer', icon: Truck, path: '/stock/transfer' },
            { label: 'Damages Register', icon: AlertTriangle, path: '/damages' },
            { label: 'Stock Adjustment', icon: Wrench, path: '/stock/adjustment' },
        ],
    },
    {
        label: 'Sales & Customers',
        id: 'sales',
        items: [
            { label: 'POS Terminal', icon: ShoppingCart, path: '/pos' },
            { label: 'Sales Orders', icon: ShoppingCart, path: '/sales-orders' },
            { label: 'Wholesale Prices', icon: DollarSign, path: '/wholesale-prices' },
            { label: 'Customers', icon: UserCircle, path: '/customers' },
            { label: 'Customer Groups', icon: Tags, path: '/customer-groups' },
        ],
    },
    {
        label: 'Procurement',
        id: 'procurement',
        items: [
            { label: 'Suppliers', icon: Truck, path: '/suppliers' },
            { label: 'Purchase Orders', icon: ShoppingBag, path: '/purchase-orders' },
            { label: 'Goods Received (GRN)', icon: PackageCheck, path: '/grns' },
            { label: 'Supplier Returns', icon: RotateCcw, path: '/supplier-returns' },
            { label: 'Purchase Bills', icon: Receipt, path: '/bills' },
        ],
    },
    {
        label: 'Finance & Accounts',
        id: 'finance',
        items: [
            { label: 'Invoices', icon: FileText, path: '/invoices' },
            { label: 'Payments', icon: Wallet, path: '/payments' },
            { label: 'Cheque Registry', icon: FileCheck, path: '/cheques' },
            { label: 'Bank Accounts', icon: Landmark, path: '/bank-accounts' },
            { label: 'Fund Transfers', icon: ArrowRightLeft, path: '/fund-transfers' },
            { label: 'Credit Notes', icon: FileMinus, path: '/credit-notes' },
        ],
    },
    {
        label: 'Manufacturing',
        id: 'production',
        items: [
            { label: 'BOMs (Recipes)', icon: Workflow, path: '/boms' },
            { label: 'Production Orders', icon: Factory, path: '/production-orders' },
        ],
    },
    {
        label: 'HR & Payroll',
        id: 'hr',
        items: [
            { label: 'Employees', icon: UsersIcon, path: '/employees' },
            { label: 'Attendance', icon: CalendarIcon, path: '/attendance' },
            { label: 'Payroll Management', icon: DollarSign, path: '/payroll' },
        ],
    },
    {
        label: 'Administration',
        id: 'admin',
        adminOnly: true,
        items: [
            { label: 'User Management', icon: Users, path: '/users', adminOnly: true },
            { label: 'Settings', icon: Settings, path: '/settings' },
        ],
    },
];

export default function Sidebar({ userRole, isOpen, onClose }) {
    const sidebarRef = useRef(null);
    const location = useLocation();
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const toggleGroup = (id) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const visibleGroups = menuGroups
        .filter((g) => !g.adminOnly || userRole === 'admin')
        .map((g) => ({
            ...g,
            items: g.items.filter((item) => !item.adminOnly || userRole === 'admin'),
        }))
        .filter((g) => g.items.length > 0);

    return (
        <>
            {/* Backdrop overlay (mobile layer) */}
            {isOpen && (
                <div className="fixed inset-0 bg-gray-900/10 backdrop-blur-[2px] z-30 lg:hidden" />
            )}

            {/* Sidebar panel */}
            <aside
                ref={sidebarRef}
                className={`h-screen bg-white border-r border-gray-100 flex flex-col z-40 shadow-sm transition-all duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-0'} 
                    lg:relative lg:translate-x-0 lg:w-[280px]
                    fixed inset-y-0 left-0`}
                style={{
                    width: isOpen ? '280px' : '0px',
                    minWidth: isOpen ? '280px' : '0px',
                    overflow: 'hidden',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0,
                }}
            >
                <div className="w-[280px] flex flex-col h-full bg-[#fcfcfd]">

                    {/* ── Logo / Brand ── */}
                    <div className="p-6 flex items-center justify-between flex-shrink-0 bg-white border-b border-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-100">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900 text-lg tracking-tight">Rishan</h2>
                                <p className="text-[10px] text-primary-600 font-bold uppercase tracking-[0.2em] -mt-0.5">Wholesale</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-95"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* ── Scrollable nav ── */}
                    <nav className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar space-y-6">
                        {visibleGroups.map((group) => {
                            const isCollapsed = collapsedGroups[group.id];
                            const isGroupActive = group.items.some(item => location.pathname === item.path);

                            return (
                                <div key={group.id} className="space-y-1.5">
                                    <button
                                        onClick={() => toggleGroup(group.id)}
                                        className="w-full flex items-center justify-between px-3 mb-1 group"
                                    >
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-gray-600 transition-colors">
                                            {group.label}
                                        </p>
                                        {isCollapsed ?
                                            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" /> :
                                            <ChevronDown size={14} className="text-gray-300 group-hover:text-gray-500" />
                                        }
                                    </button>

                                    {!isCollapsed && (
                                        <div className="space-y-0.5">
                                            {group.items.map((item) => {
                                                const Icon = item.icon;
                                                const isActive = location.pathname === item.path;

                                                return (
                                                    <NavLink
                                                        key={item.path}
                                                        to={item.path}
                                                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${isActive
                                                                ? 'bg-primary-50 text-primary-700 shadow-sm shadow-primary-100/50'
                                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {isActive && (
                                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary-600 rounded-r-full" />
                                                        )}
                                                        <Icon size={18} className={`flex-shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                                        <span className="truncate">{item.label}</span>
                                                        {isActive && (
                                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-600 shadow-sm shadow-primary-300" />
                                                        )}
                                                    </NavLink>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    {/* ── Footer / Edition ── */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <div className="bg-gray-50/50 rounded-2xl p-3 flex items-center gap-3 border border-gray-100/50">
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 shadow-sm">
                                <ShieldCheck size={20} className="text-primary-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">Enterprise v1.0</p>
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Secure Access</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #f1f5f9;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #e2e8f0;
                }
            `}} />
        </>
    );
}