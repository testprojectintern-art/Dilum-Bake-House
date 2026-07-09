import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useFilterStore } from '../../store/filterStore';
import {
    LayoutDashboard, BarChart3, Package, ShoppingCart, Users, Settings,
    FolderTree, Award, UserCircle, Tags, Warehouse, Boxes, Truck,
    ShoppingBag, FileText, Receipt, Wallet, Workflow, Factory, ShieldCheck,
    RotateCcw, Wrench, AlertTriangle, FileMinus, X, Users as UsersIcon, Building2, Clock, Calendar as CalendarIcon, Plane, Calculator, DollarSign,
    Landmark, FileCheck, PackageCheck, ArrowRightLeft, ChevronDown, ChevronRight, Plus, PanelLeftClose, Search
} from 'lucide-react';

// Role hierarchy constants
const ADMIN_MANAGER = ['admin', 'manager'];
const ADMIN_MANAGER_ACCOUNTANT = ['admin', 'manager', 'accountant'];
const ADMIN_MANAGER_CASHIER = ['admin', 'manager', 'cashier'];
const ADMIN_MANAGER_ACCOUNTANT_CASHIER = ['admin', 'manager', 'accountant', 'cashier'];
const ADMIN_MANAGER_EMPLOYEE = ['admin', 'manager', 'employee'];
const ALL_ROLES = ['admin', 'manager', 'accountant', 'cashier', 'employee'];

// ── Menu structure ──────────────────────────────────────────────────
const menuItems = [
    {
        label: 'Dashboard',
        id: 'dashboard',
        icon: LayoutDashboard,
        path: '/dashboard',
        allowedRoles: ALL_ROLES,
    },
    {
        label: 'Milk Bar & Hospital',
        id: 'bakery',
        icon: FileText,
        allowedRoles: ALL_ROLES,
        children: [
            { label: 'Daily Invoices', path: '/bakery/invoices', allowedRoles: ALL_ROLES },
            { label: 'Shop Balances', path: '/bakery/shops', allowedRoles: ALL_ROLES },
        ],
    },
    {
        label: 'Product Registry',
        id: 'bakery-products',
        icon: Package,
        path: '/bakery/products',
        allowedRoles: ALL_ROLES,
    },
    {
        label: 'Pricing Structures',
        id: 'bakery-structures',
        icon: Calculator,
        path: '/bakery/structures',
        allowedRoles: ALL_ROLES,
    },
    {
        label: 'Nuwara Eliya Delivery',
        id: 'nuwara-eliya',
        icon: Truck,
        allowedRoles: ALL_ROLES,
        children: [
            { label: 'Trip Settlements', path: '/bakery/nuwara-eliya', allowedRoles: ALL_ROLES },
            { label: 'New Trip Load', path: '/bakery/nuwara-eliya/load-trip', allowedRoles: ALL_ROLES },
            { label: 'Loaded Items (Loads)', path: '/bakery/nuwara-eliya/loads', allowedRoles: ALL_ROLES },
            { label: 'Unsold Returns', path: '/bakery/nuwara-eliya/returns', allowedRoles: ALL_ROLES },
            { label: 'On-board Stock', path: '/bakery/nuwara-eliya/on-board', allowedRoles: ALL_ROLES },
        ],
    },
    {
        label: 'Reports',
        id: 'reports',
        icon: BarChart3,
        path: '/reports',
        allowedRoles: ALL_ROLES,
    },
];

export default function Sidebar({ userRole, isOpen, onClose }) {
    const sidebarRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [expandedItems, setExpandedItems] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const { selectedMonth, selectedYear, setMonth, setYear } = useFilterStore();

    const toggleExpand = (id) => {
        setExpandedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const isChildActive = (item) => {
        return item.children?.some(child => location.pathname === child.path);
    };

    // Auto-expand active parent
    useEffect(() => {
        const initialExpanded = {};
        menuItems.forEach(item => {
            if (isChildActive(item)) {
                initialExpanded[item.id] = true;
            }
        });
        setExpandedItems(prev => ({ ...prev, ...initialExpanded }));
    }, [location.pathname]);

    const canAccess = (item) => !item.allowedRoles || item.allowedRoles.includes(userRole);

    const visibleItems = menuItems
        .filter(item => canAccess(item))
        .map(item => {
            if (item.children) {
                return {
                    ...item,
                    children: item.children.filter(child => canAccess(child))
                };
            }
            return item;
        })
        .filter(item => !item.children || item.children.length > 0);

    const filteredVisibleItems = visibleItems.map(item => {
        if (!searchQuery.trim()) return item;

        const matchesParent = item.label.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (item.children) {
            const matchingChildren = item.children.filter(child =>
                child.label.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (matchesParent || matchingChildren.length > 0) {
                return {
                    ...item,
                    children: matchesParent ? item.children : matchingChildren
                };
            }
            return null;
        }

        return matchesParent ? item : null;
    }).filter(Boolean);

    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const newMenuRef = useRef(null);

    // Close new menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (newMenuRef.current && !newMenuRef.current.contains(event.target)) {
                setIsNewMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const newActions = [
        { label: 'New Daily Invoice', path: '/bakery/invoices/new', icon: Receipt },
        { label: 'New Product', path: '/bakery/products', icon: Plus },
        { label: 'New Pricing Structure', path: '/bakery/structures', icon: Workflow },
    ];

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
                    ${isOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full lg:translate-x-0 w-0'} 
                    fixed lg:relative inset-y-0 left-0`}
                style={{
                    width: isOpen ? '280px' : '0px',
                    minWidth: isOpen ? '280px' : '0px',
                    overflow: 'hidden',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0,
                }}
            >
                <div className="w-[280px] flex flex-col h-full bg-white">

                    {/* ── Logo / Brand ── */}
                    <div className="p-6 flex items-center justify-between flex-shrink-0 bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-gray-900 text-xl tracking-tight">Dilum Bake House</h2>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all"
                        >
                            <PanelLeftClose size={18} />
                        </button>
                    </div>

                    {/* ── Quick Action ── */}
                    <div className="px-6 mb-4 relative" ref={newMenuRef}>
                        <button 
                            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl shadow-sm text-sm font-medium transition-all group ${
                                isNewMenuOpen ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-white border border-gray-100 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Plus size={18} className={isNewMenuOpen ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                                <span>New</span>
                            </div>
                            <ChevronDown size={14} className={isNewMenuOpen ? 'text-white rotate-180' : 'text-gray-300'} />
                        </button>

                        {/* New Menu Dropdown */}
                        {isNewMenuOpen && (
                            <div className="absolute top-full left-6 right-6 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                {newActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            navigate(action.path);
                                            setIsNewMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                                    >
                                        <action.icon size={16} />
                                        <span>{action.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Search Bar ── */}
                    <div className="px-6 mb-3 flex-shrink-0">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search menu items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-gray-700 placeholder-gray-400 focus:outline-none transition-all"
                            />
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    {/* ── Global Date Filter ── */}
                    <div className="px-6 mb-4 flex-shrink-0 space-y-1.5 border-b pb-4 border-gray-50">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <CalendarIcon size={12} className="text-gray-400" />
                            <span>System Period Filter</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => {
                                        setYear(e.target.value);
                                        queryClient.invalidateQueries();
                                    }}
                                    className="w-full text-[11px] font-bold text-gray-750 border border-gray-150 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                                >
                                    <option value="all">All Years</option>
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                    <option value="2027">2027</option>
                                </select>
                            </div>
                            <div>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => {
                                        setMonth(e.target.value);
                                        queryClient.invalidateQueries();
                                    }}
                                    disabled={selectedYear === 'all'}
                                    className="w-full text-[11px] font-bold text-gray-750 border border-gray-150 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:bg-gray-100"
                                >
                                    <option value="all">All Months</option>
                                    <option value="1">January</option>
                                    <option value="2">February</option>
                                    <option value="3">March</option>
                                    <option value="4">April</option>
                                    <option value="5">May</option>
                                    <option value="6">June</option>
                                    <option value="7">July</option>
                                    <option value="8">August</option>
                                    <option value="9">September</option>
                                    <option value="10">October</option>
                                    <option value="11">November</option>
                                    <option value="12">December</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── Scrollable nav ── */}
                    <nav className="flex-1 overflow-y-auto py-2 px-4 custom-scrollbar space-y-1">
                        {filteredVisibleItems.map((item) => {
                            const Icon = item.icon;
                            const isExpanded = searchQuery.trim() ? true : expandedItems[item.id];
                            const isActive = location.pathname === item.path || isChildActive(item);
                            const hasChildren = item.children && item.children.length > 0;

                            return (
                                <div key={item.id} className="space-y-1">
                                    {hasChildren ? (
                                        <button
                                            onClick={() => toggleExpand(item.id)}
                                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative hover:translate-x-1 ${isActive
                                                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800/80 dark:text-amber-400 font-semibold'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/70'
                                                }`}
                                        >
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 dark:bg-amber-500 rounded-r-full" />
                                            )}
                                            <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-indigo-600 dark:text-amber-500' : 'text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-slate-350'}`} />
                                            <span className="truncate">{item.label}</span>
                                            <div className="ml-auto">
                                                {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                                            </div>
                                        </button>
                                    ) : (
                                        <NavLink
                                            to={item.path}
                                            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative hover:translate-x-1 ${location.pathname === item.path
                                                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800/80 dark:text-amber-400 font-semibold'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/70'
                                                }`}
                                        >
                                            {location.pathname === item.path && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 dark:bg-amber-500 rounded-r-full" />
                                            )}
                                            <Icon size={18} className={`flex-shrink-0 ${location.pathname === item.path ? 'text-indigo-600 dark:text-amber-500' : 'text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`} />
                                            <span className="truncate">{item.label}</span>
                                        </NavLink>
                                    )}

                                    {hasChildren && isExpanded && (
                                        <div className="ml-9 space-y-1 mt-1 border-l border-gray-100 dark:border-slate-800">
                                            {item.children.map((child) => (
                                                <NavLink
                                                    key={child.path}
                                                    to={child.path}
                                                    className={({ isActive }) =>
                                                        `block px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:translate-x-1 ${isActive
                                                            ? 'text-indigo-600 dark:text-amber-400 dark:bg-slate-800/50 font-semibold'
                                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/40'
                                                        }`
                                                    }
                                                >
                                                    {child.label}
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    {/* ── User Profile / Footer ── */}
                    <div className="p-4 border-t border-gray-50 bg-white">
                        <div className="flex items-center gap-3 px-2 py-1">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                {userRole?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate capitalize">{userRole}</p>
                                <p className="text-[11px] text-gray-500 truncate">Main Branch</p>
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