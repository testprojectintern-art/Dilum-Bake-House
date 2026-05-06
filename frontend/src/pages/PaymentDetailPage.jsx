import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '../features/payments/paymentsApi';
import { useDeletePayment } from '../features/payments/usePayments';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function PaymentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['payment', id], queryFn: () => paymentsApi.getById(id),
    });
    const deleteMutation = useDeletePayment();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const p = data?.data;

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(id);
            setIsDeleteDialogOpen(false);
            navigate('/payments');
        } catch {}
    };

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    if (isLoading || !p) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">
                    Payment {p.paymentNumber}
                    <Badge variant={p.direction === 'received' ? 'success' : 'info'}>
                        {p.direction === 'received' ? 'MONEY IN' : 'MONEY OUT'}
                    </Badge>
                </span>}
                description={`${fmtDate(p.paymentDate)} · ${p.method.replace('_', ' ')}`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/payments')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        <Button variant="danger" onClick={() => setIsDeleteDialogOpen(true)} loading={deleteMutation.isPending}>
                            <Trash2 size={16} className="mr-1.5" /> Delete
                        </Button>
                    </div>
                }
            />

            <ConfirmDialog 
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Delete Payment"
                message="Are you sure you want to delete this payment? This action will reverse all invoice/bill allocations and restore bank account balances. This cannot be undone."
                confirmText="Yes, Delete Payment"
                variant="danger"
                loading={deleteMutation.isPending}
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Details</h3>
                        <div className="grid grid-cols-2 gap-6 text-sm">
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">{p.direction === 'received' ? 'From' : 'To'}</p>
                                <p className="font-medium">{p.partyName}</p>
                                <p className="text-gray-600">{p.customerId?.customerCode || p.supplierId?.supplierCode}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Method</p>
                                <p className="capitalize">{p.method.replace('_', ' ')}</p>
                                {p.chequeNumber && <p className="text-gray-600">Cheque: {p.chequeNumber} ({fmtDate(p.chequeDate)})</p>}
                                {p.bankName && <p className="text-gray-600">Bank: {p.bankName}</p>}
                                {p.bankAccountId && (
                                    <button 
                                        onClick={() => navigate('/bank-accounts')}
                                        className="text-primary-600 hover:underline flex items-center gap-1 mt-1"
                                    >
                                        Linked: {p.bankAccountId.accountName}
                                    </button>
                                )}
                                {p.transactionReference && <p className="text-gray-600 mt-1">Ref: {p.transactionReference}</p>}
                            </div>
                        </div>
                        {p.notes && <div className="mt-4 pt-4 border-t"><p className="text-sm whitespace-pre-wrap">{p.notes}</p></div>}
                    </Card>

                    {p.allocations?.length > 0 && (
                        <Card>
                            <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold text-gray-700">Applied To</h3></div>
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Document</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {p.allocations.map((a) => (
                                        <tr key={a._id}>
                                            <td className="px-4 py-3 font-mono text-sm">
                                                <button onClick={() => navigate(`/${a.documentType}s/${a.documentId}`)}
                                                    className="text-primary-600 hover:underline">{a.documentNumber}</button>
                                            </td>
                                            <td className="px-4 py-3 text-sm capitalize">{a.documentType}</td>
                                            <td className="px-4 py-3 text-right text-sm font-medium">{fmt(a.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    )}
                </div>

                <div>
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Amount</span><span className="font-bold text-lg">{fmt(p.amount)}</span></div>
                            <div className="flex justify-between pt-2 border-t"><span className="text-gray-600">Allocated</span><span>{fmt(p.amount - p.unallocatedAmount)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Unallocated</span><span>{fmt(p.unallocatedAmount)}</span></div>
                            {p.unallocatedAmount > 0 && (
                                <p className="text-xs text-gray-500 pt-2">Available as credit for future applications.</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 mt-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Recorded By</h3>
                        <p className="text-sm">{p.receivedBy?.firstName} {p.receivedBy?.lastName}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(p.createdAt).toLocaleString('en-LK')}</p>
                    </Card>
                </div>
            </div>
        </div>
    );
}