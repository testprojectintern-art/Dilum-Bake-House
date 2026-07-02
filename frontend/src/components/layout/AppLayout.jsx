import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useMobile } from '../../hooks/useMobile';
import Sidebar from './Sidebar';
import Header from './Header';
import AnimatedBackground from '../ui/AnimatedBackground';

export default function AppLayout() {
    const { user } = useAuthStore();
    const isMobile = useMobile();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);

    // Close sidebar on route change on mobile
    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    }, [location.pathname, isMobile]);

    return (
        <div className="h-screen flex bg-gray-50 dark:bg-slate-950 overflow-hidden relative">
            {/* Ambient Background Orbs */}
            <AnimatedBackground />

            {/* Dashboard Shell */}
            <div className="relative flex w-full h-full z-10 bg-transparent">
                <Sidebar
                    userRole={user?.role}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />
                <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-transparent">
                    <Header onToggleSidebar={() => setSidebarOpen((o) => !o)} />
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-transparent relative">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}