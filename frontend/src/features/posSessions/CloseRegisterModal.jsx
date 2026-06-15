import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { posSessionsApi } from './posSessionsApi';

export default function CloseRegisterModal({ isOpen, onClose, session }) {
    const queryClient = useQueryClient();
    
    const { register, handleSubmit, watch } = useForm({
        defaultValues: {
            actualClosingBalance: '',
            notes: ''
        }
    });

    const closeMutation = useMutation({
        mutationFn: posSessionsApi.close,
        onSuccess: () => {
            toast.success('Cash Register Closed');
            queryClient.invalidateQueries({ queryKey: ['pos-sessions', 'active'] });
            onClose();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to close register')
    });

    if (!session) return null;

    const expected = (session.openingBalance || 0) + (session.cashSales || 0) - (session.cashExpenses || 0);
    const actual = parseFloat(watch('actualClosingBalance')) || 0;
    const diff = actual - expected;

    const formatLkr = (val) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(val);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Close Cash Register (Handover)" size="md">
            <form onSubmit={handleSubmit(closeMutation.mutate)}>
                <div className="p-4 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm border">
                        <div className="flex justify-between text-gray-600"><span>Opening Balance:</span> <span>{formatLkr(session.openingBalance)}</span></div>
                        <div className="flex justify-between text-green-600"><span>Cash Sales:</span> <span>+ {formatLkr(session.cashSales)}</span></div>
                        <div className="flex justify-between text-red-600"><span>Cash Expenses:</span> <span>- {formatLkr(session.cashExpenses)}</span></div>
                        <div className="flex justify-between font-bold pt-2 border-t"><span>Expected Cash in Drawer:</span> <span>{formatLkr(expected)}</span></div>
                    </div>

                    <Input label="Actual Cash in Drawer (LKR)" type="number" step="0.01" required {...register('actualClosingBalance')} autoFocus />
                    
                    <div className={`p-3 rounded border text-sm font-bold flex justify-between ${diff === 0 ? 'bg-green-50 border-green-200 text-green-700' : diff > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        <span>Difference:</span>
                        <span>{diff > 0 ? '+' : ''}{formatLkr(diff)}</span>
                    </div>

                    <Textarea label="Closing Notes / Handover Details" rows={2} {...register('notes')} />
                </div>
                
                <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary" loading={closeMutation.isPending}>Close Register</Button>
                </div>
            </form>
        </Modal>
    );
}
