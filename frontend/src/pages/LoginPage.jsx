import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Package, Sun, Moon, Watch, Clock, Sparkles } from 'lucide-react';

import { authApi } from '../features/auth/authApi';
import { loginSchema } from '../features/auth/authSchemas';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);

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

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginSchema),
    });

    const loginMutation = useMutation({
        mutationFn: authApi.login,
        onSuccess: (response) => {
            const { token, ...user } = response.data;
            login(user, token);
            toast.success(`Welcome back, ${user.firstName}!`);
            if (user.role === 'cashier') {
                navigate('/pos');
            } else if (user.role === 'employee') {
                navigate('/leaves');
            } else {
                navigate('/dashboard');
            }
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Login failed';
            toast.error(message);
        },
    });

    // Already logged in? Go to dashboard
    if (isAuthenticated) {
        const user = useAuthStore.getState().user;
        if (user?.role === 'cashier') return <Navigate to="/pos" replace />;
        if (user?.role === 'employee') return <Navigate to="/leaves" replace />;
        return <Navigate to="/dashboard" replace />;
    }

    const onSubmit = (data) => {
        loginMutation.mutate(data);
    };

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans">
            
            {/* Left Side: Premium bakery cover panel (Visible only on md screens and up) */}
            <div className="hidden lg:flex lg:w-7/12 xl:w-8/12 relative overflow-hidden bg-slate-900">
                {/* Background Image */}
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10s] hover:scale-105"
                    style={{ backgroundImage: 'url("/bakery_login_bg.png")' }}
                />
                
                {/* Modern Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/70 to-transparent opacity-90" />
                
                {/* Content Overlay */}
                <div className="relative z-10 flex flex-col justify-between w-full h-full p-12 text-white">
                    {/* Top: Branding */}
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 backdrop-blur-md">
                            <Package className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div>
                            <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-indigo-200 via-indigo-400 to-blue-500 bg-clip-text text-transparent">
                                DILUM BAKE HOUSE
                            </span>
                            <span className="block text-[10px] tracking-widest text-slate-400 uppercase font-mono">
                                MILK BAR & HOSPITAL BILLING SYSTEM
                            </span>
                        </div>
                    </div>

                    {/* Middle: Floating Premium Feature Cards */}
                    <div className="max-w-md space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
                                Delight in every bite,<br />
                                <span className="bg-gradient-to-r from-indigo-300 to-blue-500 bg-clip-text text-transparent">
                                    Efficiency in Business.
                                </span>
                            </h2>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Manage daily shop invoices, pricing structures, returns registry, and outstanding shop balances under a single unified dashboard.
                            </p>
                        </div>

                        {/* Floating Stats Board */}
                        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-lg space-y-4 shadow-2xl">
                            <div className="flex items-center space-x-3 text-indigo-400">
                                <Sparkles size={16} />
                                <span className="text-xs font-semibold uppercase tracking-wider">System Snapshot</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div>
                                    <span className="block text-2xl font-bold text-white">100%</span>
                                    <span className="text-[10px] text-slate-400 uppercase font-medium">Daily Outstandings Rollover</span>
                                </div>
                                <div>
                                    <span className="block text-2xl font-bold text-white">Real-time</span>
                                    <span className="text-[10px] text-slate-400 uppercase font-medium">Shop Suggest & Auto-Save</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Luxury Motto */}
                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                        <Clock size={14} className="text-amber-500" />
                        <span>TIMEPIECE RETAIL & WHOLESALE ENTERPRISE</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Professional Glassmorphic Login Form */}
            <div className="w-full lg:w-5/12 xl:w-4/12 flex flex-col justify-between p-8 md:p-12 bg-white dark:bg-slate-950 relative shadow-2xl border-l border-slate-100 dark:border-slate-900">
                
                {/* Header Section */}
                <div className="flex justify-between items-center">
                    {/* Small brand shown on mobile */}
                    <div className="flex lg:hidden items-center space-x-2">
                        <Package className="w-6 h-6 text-indigo-600" />
                        <span className="font-bold tracking-wider text-slate-900 dark:text-white">DILUM BAKE HOUSE</span>
                    </div>
                    <div className="lg:block hidden" />

                    {/* Theme Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setIsDark(!isDark)}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-200"
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-600" />}
                    </button>
                </div>

                {/* Form Main Container */}
                <div className="my-auto max-w-sm w-full mx-auto space-y-8">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Sign In
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Enter your credentials to access the Dilum Bake House portal.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-1">
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="admin@example.com"
                                required
                                error={errors.email?.message}
                                {...register('email')}
                            />
                        </div>

                        <div className="space-y-1 relative">
                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                required
                                error={errors.password?.message}
                                {...register('password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-[38px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={loginMutation.isPending}
                            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/20 active:scale-[0.98] transition-all duration-200"
                        >
                            {loginMutation.isPending ? 'Authenticating...' : 'Secure Sign In'}
                        </Button>
                    </form>

                    <div className="text-center">
                        <a href="#" className="text-xs font-medium text-indigo-600 dark:text-indigo-500 hover:underline">
                            Forgot your password? Contact system administrator.
                        </a>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="text-center text-xs text-slate-400 dark:text-slate-500">
                    <p>© 2026 Dilum Bake House. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}