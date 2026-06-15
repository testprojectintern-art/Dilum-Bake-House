import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Menu, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../features/auth/authApi';

export default function Header({ onToggleSidebar }) {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [isDark, setIsDark] = useState(() => {
        return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (err) {
            // Even if backend fails, log out locally
        }
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const roleLabel = {
        admin: 'Administrator',
        manager: 'Manager',
        accountant: 'Accountant',
        sales_manager: 'Sales Manager',
        sales_rep: 'Sales Rep',
        warehouse_staff: 'Warehouse Staff',
        production_staff: 'Production Staff',
        staff: 'Staff',
    }[user?.role] || 'User';

    return (
        <header className="h-16 bg-white border-b border-gray-50 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
                {/* Hamburger toggle */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition"
                    aria-label="Toggle sidebar"
                >
                    <Menu size={20} />
                </button>
                <div className="hidden md:block">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Workspace</p>
                    <h1 className="text-sm font-bold text-gray-900">
                        Main Branch
                    </h1>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Theme toggle button */}
                <button
                    onClick={() => setIsDark(!isDark)}
                    className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    aria-label="Toggle Theme"
                    title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDark ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-indigo-600" />}
                </button>

                <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50/50 border border-gray-100 rounded-xl">
                    <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm">
                        <button onClick={() => navigate('/profile')}>
                            <UserIcon className="w-4 h-4 text-indigo-600" />
                        </button>
                    </div>
                    <div className="hidden sm:block text-sm">
                        <p className="font-bold text-gray-900 leading-none">{user?.fullName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">{roleLabel}</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                    <LogOut size={16} />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    );
}