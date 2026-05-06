import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useCreateUser, useUpdateUser } from './useUsers';
import { ROLES, getRoleConfig } from './roleConfig';

const createSchema = z.object({
    firstName: z.string().min(1, 'First name required').max(50),
    lastName: z.string().min(1, 'Last name required').max(50),
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional().or(z.literal('')),
    role: z.string().min(1, 'Select a role'),
    isActive: z.boolean().optional(),
    nic: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
});

const updateSchema = z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    phone: z.string().optional().or(z.literal('')),
    role: z.string().min(1),
    isActive: z.boolean().optional(),
    nic: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
});

export default function UserFormModal({ isOpen, onClose, user = null }) {
    const isEdit = !!user;
    const [selectedRole, setSelectedRole] = useState('staff');

    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
        resolver: zodResolver(isEdit ? updateSchema : createSchema),
        defaultValues: {
            firstName: '', lastName: '', email: '', password: '',
            phone: '', role: 'staff', isActive: true,
            nic: '', address: '',
        },
    });

    const roleValue = watch('role');

    useEffect(() => {
        if (isOpen && user) {
            reset({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                role: user.role || 'staff',
                isActive: user.isActive !== false,
                nic: user.nic || '',
                address: user.address || '',
            });
            setSelectedRole(user.role || 'staff');
        } else if (isOpen) {
            reset({
                firstName: '', lastName: '', email: '', password: '',
                phone: '', role: 'staff', isActive: true,
                nic: '', address: '',
            });
            setSelectedRole('staff');
        }
    }, [isOpen, user, reset]);

    useEffect(() => {
        setSelectedRole(roleValue);
    }, [roleValue]);

    const onSubmit = async (data) => {
        try {
            if (isEdit) {
                await updateMutation.mutateAsync({
                    id: user._id,
                    data: {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        phone: data.phone || undefined,
                        role: data.role,
                        isActive: data.isActive,
                        nic: data.nic,
                        address: data.address,
                    },
                });
            } else {
                await createMutation.mutateAsync({
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    password: data.password,
                    phone: data.phone || undefined,
                    role: data.role,
                    nic: data.nic,
                    address: data.address,
                });
            }
            onClose();
        } catch { }
    };

    const roleConfig = getRoleConfig(selectedRole);
    const roleOptions = ROLES.map((r) => ({ value: r.value, label: r.label }));
    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Modal
            isOpen={isOpen} onClose={onClose}
            title={isEdit ? `Edit User — ${user?.firstName} ${user?.lastName}` : 'Add New User'}
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="First Name" required error={errors.firstName?.message} {...register('firstName')} />
                        <Input label="Last Name" required error={errors.lastName?.message} {...register('lastName')} />
                    </div>

                    {!isEdit && (
                        <>
                            <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} />
                            <Input label="Password" type="password" required
                                error={errors.password?.message}
                                placeholder="At least 6 characters"
                                {...register('password')} />
                            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                                Share this password with the user. They should change it after first login.
                            </p>
                        </>
                    )}

                    {isEdit && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email (read-only)</label>
                            <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">{user?.email}</p>
                        </div>
                    )}

                    <Input label="Phone" type="tel" {...register('phone')} />
                    <Input label="NIC Number" placeholder="e.g. 199012345678" {...register('nic')} />
                    <Input label="Address" placeholder="Home or Office address" {...register('address')} />

                    <div>
                        <Select label="Role" required
                            options={roleOptions}
                            error={errors.role?.message}
                            {...register('role')} />
                        <div className="mt-2 p-3 rounded-lg border text-sm"
                            style={{ borderColor: roleConfig.color, backgroundColor: `${roleConfig.color}10` }}>
                            <p className="font-medium" style={{ color: roleConfig.color }}>{roleConfig.label}</p>
                            <p className="text-gray-700 mt-1">{roleConfig.description}</p>
                        </div>
                    </div>

                    {isEdit && (
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" {...register('isActive')} />
                            Active (uncheck to deactivate this user from logging in)
                        </label>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" variant="primary" loading={isLoading}>
                        {isEdit ? 'Update User' : 'Create User'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}