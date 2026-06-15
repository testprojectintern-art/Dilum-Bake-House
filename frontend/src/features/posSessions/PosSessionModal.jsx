import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { posSessionsApi } from './posSessionsApi';

export default function PosSessionModal({ isOpen, onClose }) {
    const queryClient = useQueryClient();
    
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            openingBalance: '',
            notes: ''
        }
    });

    const openMutation = useMutation({
        mutationFn: posSessionsApi.open,
        onSuccess: () => {
            toast.success('Cash Register Opened');
            queryClient.invalidateQueries({ queryKey: ['pos-sessions', 'active'] });
            onClose();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to open register')
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Open Cash Register" size="sm" hideClose={true}>
            <form onSubmit={handleSubmit(openMutation.mutate)}>
                <div className="p-4 space-y-4">
                    <p className="text-sm text-gray-500">Please enter the opening cash balance in the drawer to start selling.</p>
                    <Input label="Opening Balance (LKR)" type="number" step="0.01" required {...register('openingBalance')} autoFocus />
                    <Textarea label="Notes (Optional)" rows={2} {...register('notes')} />
                </div>
                
                <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                    <Button type="button" variant="outline" onClick={() => window.history.back()}>Go Back</Button>
                    <Button type="submit" variant="primary" loading={openMutation.isPending}>Open Register</Button>
                </div>
            </form>
        </Modal>
    );
}
