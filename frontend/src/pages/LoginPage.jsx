import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Package } from 'lucide-react';

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
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
                        <Package className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Wholesale System</h1>
                    <p className="text-sm text-gray-600 mt-1">Manufacturing & Distribution</p>
                </div>

                <Card className="p-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Enter your credentials to access your account
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="admin@example.com"
                            required
                            error={errors.email?.message}
                            {...register('email')}
                        />

                        <div className="relative">
                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                required
                                error={errors.password?.message}
                                {...register('password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={loginMutation.isPending}
                        >
                            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>

                    <p className="text-xs text-center text-gray-500 mt-6">
                        Forgot your password? Contact your administrator.
                    </p>
                </Card>

                <p className="text-center text-xs text-gray-500 mt-6">
                    © 2026 Wholesale System. All rights reserved.
                </p>
            </div>
        </div>
    );
}