import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useCreateCustomer, useUpdateCustomer, useCustomerGroups } from './useCustomers';

/**
 * Lightweight modal to quickly create/edit a customer with minimum required fields.
 * On success, calls onCreated(customer) so parent can auto-select.
 */
export default function QuickCreateCustomerModal({ isOpen, onClose, onCreated, initialData = null, isPosMode = false }) {
    const [form, setForm] = useState({
        displayName: '',
        legalName: '',
        customerGroupId: '',
        phone: '',
        email: '',
        addressLine1: '',
        city: '',
        paymentTermsType: 'cash',
        creditLimit: 0,
        creditDays: 0,
    });

    const submittingRef = useRef(false);

    useEffect(() => {
        if (initialData && isOpen) {
            setForm({
                displayName: initialData.displayName || '',
                legalName: initialData.legalName || '',
                customerGroupId: initialData.customerGroup?._id || initialData.customerGroupId || '',
                phone: initialData.primaryContact?.phone || '',
                email: initialData.primaryContact?.email || '',
                addressLine1: initialData.billingAddress?.line1 || '',
                city: initialData.billingAddress?.city || '',
                paymentTermsType: initialData.paymentTerms?.type || 'cash',
                creditLimit: initialData.creditLimit || 0,
                creditDays: initialData.paymentTerms?.creditDays || 0,
            });
        } else if (!isOpen) {
            setForm({
                displayName: '', legalName: '', customerGroupId: '',
                phone: '', email: '', addressLine1: '', city: '',
                paymentTermsType: 'cash', creditLimit: 0, creditDays: 0,
            });
        }
    }, [initialData, isOpen]);

    const createMutation = useCreateCustomer();
    const updateMutation = useUpdateCustomer();
    const { data: groupsData } = useCustomerGroups({ isActive: 'true' });
    const groups = groupsData?.data || [];

    const submit = async () => {
        if (!form.displayName) { toast.error('Customer name required'); return; }
        if (!form.phone && !form.email) { toast.error('Phone or email required'); return; }
        if (submittingRef.current) return;

        submittingRef.current = true;
        try {
            const payload = {
                displayName: form.displayName,
                legalName: form.legalName || form.displayName,
                customerGroupId: form.customerGroupId || undefined,
                primaryContact: {
                    name: form.displayName,
                    phone: form.phone || undefined,
                    email: form.email || undefined,
                },
                primaryAddress: form.addressLine1 ? {
                    line1: form.addressLine1,
                    city: form.city,
                    country: 'Sri Lanka',
                } : undefined,
                paymentTerms: {
                    type: form.paymentTermsType,
                    creditDays: form.paymentTermsType === 'credit' ? +form.creditDays : 0,
                },
                creditLimit: form.paymentTermsType === 'credit' ? +form.creditLimit : 0,
                status: 'active',
            };

            let result;
            if (initialData) {
                result = await updateMutation.mutateAsync({ id: initialData._id, data: payload });
                toast.success('Customer updated');
            } else {
                result = await createMutation.mutateAsync(payload);
                toast.success('Customer created — you can complete details later');
            }

            onCreated?.(result.data);
            onClose();
        } catch (err) {
            console.error('Customer creation error:', err);
        } finally {
            submittingRef.current = false;
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Customer" : "Quick Create Customer"} size="md">
            <div className="p-6 space-y-4">
                <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                    Capture the basics now. You can add full address, contacts, tax info, and credit details from the Customers page later.
                </p>

                <Input label="Display Name" required placeholder="ABC Trading"
                    value={form.displayName}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />

                <Input label="Phone" placeholder="07X XXX XXXX"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />

                {!isPosMode && (
                    <>
                        <Input label="Legal Name (optional)" placeholder="Same as display name"
                            value={form.legalName}
                            onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} />

                        <Select label="Customer Group" placeholder="None"
                            options={groups.map((g) => ({ value: g._id, label: g.name }))}
                            value={form.customerGroupId}
                            onChange={(e) => setForm((f) => ({ ...f, customerGroupId: e.target.value }))} />

                        <Input label="Email" type="email"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                    </>
                )}

                {!isPosMode && (
                    <>
                        <Input label="Address Line 1 (optional)"
                            value={form.addressLine1}
                            onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} />

                        <Input label="City (optional)"
                            value={form.city}
                            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />

                        <Select label="Payment Terms"
                            options={[
                                { value: 'cash', label: 'Cash on delivery' },
                                { value: 'credit', label: 'Credit' },
                            ]}
                            value={form.paymentTermsType}
                            onChange={(e) => setForm((f) => ({ ...f, paymentTermsType: e.target.value }))} />

                        {form.paymentTermsType === 'credit' && (
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Credit Limit (LKR)" type="number" min="0" value={form.creditLimit}
                                    onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))} />
                                <Input label="Credit Days" type="number" min="0" value={form.creditDays}
                                    onChange={(e) => setForm((f) => ({ ...f, creditDays: e.target.value }))} />
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={submit} loading={isPending}>
                    {initialData ? "Save Changes" : "Create Customer"}
                </Button>
            </div>
        </Modal>
    );
}