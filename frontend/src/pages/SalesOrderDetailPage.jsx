import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Truck, PackageCheck, Ban, FileText } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useSalesOrder, useChangeOrderStatus } from '../features/salesOrders/useSalesOrders';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    draft: 'default',
    pending_approval: 'warning',
    approved: 'info',
    dispatched: 'info',
    delivered: 'success',
    completed: 'success',
    on_hold: 'warning',
    cancelled: 'danger',
};

export default function SalesOrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState('');

    const { data, isLoading } = useSalesOrder(id);
    const changeStatus = useChangeOrderStatus();

    const order = data?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', {
        style: 'currency', currency: 'LKR', minimumFractionDigits: 2,
    }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    if (isLoading || !order) {
        return <div className="py-16 text-center text-gray-500">Loading order...</div>;
    }

    const canApprove = ['admin', 'manager', 'sales_manager', 'accountant'].includes(user.role);
    const canDispatch = ['admin', 'manager', 'warehouse_staff'].includes(user.role);
    const canCancel = ['admin', 'manager', 'sales_manager'].includes(user.role);

    const handleAction = async () => {
        await changeStatus.mutateAsync({ id: order._id, status: action.status, reason });
        setAction(null);
        setReason('');
    };

    const actionButtons = [];
    if (['draft', 'pending_approval'].includes(order.status) && canApprove) {
        actionButtons.push({ label: 'Approve', icon: CheckCircle, variant: 'primary', status: 'approved' });
    }
    if (order.status === 'approved' && canDispatch) {
        actionButtons.push({ label: 'Mark Dispatched', icon: Truck, variant: 'primary', status: 'dispatched' });
    }
    if (order.status === 'dispatched' && canDispatch) {
        actionButtons.push({ label: 'Mark Delivered', icon: PackageCheck, variant: 'primary', status: 'delivered' });
    }
    if (order.status === 'delivered' && canApprove) {
        actionButtons.push({ label: 'Mark Completed', icon: CheckCircle, variant: 'primary', status: 'completed' });
    }
    // Invoice buttons
    if (order.status === 'delivered' && !order.invoiceId && canApprove) {
        actionButtons.push({
            label: 'Create Invoice',
            icon: FileText,
            variant: 'primary',
            onClick: () => navigate(`/invoices/from-sales-order?orderIds=${order._id}`),
        });
    }
    if (order.invoiceId) {
        actionButtons.push({
            label: 'View Invoice',
            icon: FileText,
            variant: 'outline',
            onClick: () => navigate(`/invoices/${order.invoiceId._id || order.invoiceId}`),
        });
    }
    if (!['completed', 'cancelled'].includes(order.status) && canCancel) {
        actionButtons.push({ label: 'Cancel', icon: Ban, variant: 'danger', status: 'cancelled', needsReason: true });
    }

    return (
        <div>
            <PageHeader
                title={
                    <span className="flex items-center gap-3">
                        Order {order.orderNumber}
                        <Badge variant={statusVariant[order.status]}>{order.status.replace('_', ' ')}</Badge>
                    </span>
                }
                description={`Created ${fmtDate(order.createdAt)}`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/sales-orders')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        {actionButtons.map((btn) => (
                            <Button
                                key={btn.label} variant={btn.variant}
                                onClick={btn.onClick ? btn.onClick : () => setAction(btn)}
                            >
                                <btn.icon size={16} className="mr-1.5" /> {btn.label}
                            </Button>
                        ))}
                    </div>
                }
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Customer & Delivery</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Bill To</p>
                                <p className="font-medium">{order.customerSnapshot?.name}</p>
                                <p className="text-sm text-gray-600">{order.customerSnapshot?.code}</p>
                                {order.customerSnapshot?.taxRegistrationNumber && (
                                    <p className="text-sm text-gray-600">VAT: {order.customerSnapshot.taxRegistrationNumber}</p>
                                )}
                                {order.billingAddress && (
                                    <div className="text-sm text-gray-600 mt-2">
                                        {order.billingAddress.line1}
                                        {order.billingAddress.city && `, ${order.billingAddress.city}`}
                                        {order.billingAddress.postalCode && ` ${order.billingAddress.postalCode}`}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Ship To</p>
                                {order.shippingAddress ? (
                                    <div className="text-sm">
                                        {order.shippingAddress.label && <p className="font-medium">{order.shippingAddress.label}</p>}
                                        <p>{order.shippingAddress.line1}</p>
                                        <p>
                                            {order.shippingAddress.city}
                                            {order.shippingAddress.postalCode && ` ${order.shippingAddress.postalCode}`}
                                        </p>
                                    </div>
                                ) : <p className="text-sm text-gray-400">—</p>}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Price</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Discount</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Tax</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {order.items.map((item) => (
                                    <tr key={item._id || item.lineNumber}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-sm">{item.productName}</p>
                                            <p className="text-xs text-gray-500 font-mono">{item.productCode}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">
                                            {item.orderedQuantity} {item.unitOfMeasure}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">{fmt(item.unitPrice)}</td>
                                        <td className="px-4 py-3 text-right text-sm text-red-600">
                                            {item.lineDiscount > 0 ? `-${fmt(item.lineDiscount)}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">{fmt(item.lineTax)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-medium">{fmt(item.lineTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    {(order.customerNotes || order.internalNotes) && (
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Notes</h3>
                            {order.customerNotes && (
                                <div className="mb-3">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Customer Notes</p>
                                    <p className="text-sm whitespace-pre-wrap">{order.customerNotes}</p>
                                </div>
                            )}
                            {order.internalNotes && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase mb-1">Internal Notes</p>
                                    <p className="text-sm whitespace-pre-wrap bg-amber-50 p-2 rounded">{order.internalNotes}</p>
                                </div>
                            )}
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{fmt(order.subtotal)}</span></div>
                            {order.totalDiscount > 0 && (
                                <div className="flex justify-between"><span className="text-gray-600">Line Discounts</span><span className="text-red-600">-{fmt(order.totalDiscount)}</span></div>
                            )}
                            {order.orderDiscount?.amount > 0 && (
                                <div className="flex justify-between"><span className="text-gray-600">Order Discount</span><span className="text-red-600">-{fmt(order.orderDiscount.amount)}</span></div>
                            )}
                            <div className="flex justify-between"><span className="text-gray-600">Tax (VAT)</span><span>{fmt(order.totalTax)}</span></div>
                            {order.shippingCost > 0 && (
                                <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{fmt(order.shippingCost)}</span></div>
                            )}
                            <div className="flex justify-between pt-3 border-t border-gray-200 font-bold">
                                <span>Total</span>
                                <span className="text-primary-600">{fmt(order.grandTotal)}</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Details</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Order Date</span><span>{fmtDate(order.orderDate)}</span></div>
                            {order.requestedDeliveryDate && (
                                <div className="flex justify-between"><span className="text-gray-500">Requested Delivery</span><span>{fmtDate(order.requestedDeliveryDate)}</span></div>
                            )}
                            <div className="flex justify-between"><span className="text-gray-500">Priority</span><span className="capitalize">{order.priority}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="uppercase text-xs">{order.paymentTerms?.type}</span></div>
                            {order.paymentTerms?.type === 'credit' && (
                                <div className="flex justify-between"><span className="text-gray-500">Due Date</span><span>{fmtDate(order.paymentTerms?.dueDate)}</span></div>
                            )}
                            <div className="flex justify-between"><span className="text-gray-500">Sales Rep</span>
                                <span>{order.salesRepId ? `${order.salesRepId.firstName} ${order.salesRepId.lastName}` : '—'}</span>
                            </div>
                            <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="capitalize">{order.source}</span></div>
                        </div>
                    </Card>

                    {order.creditCheck?.performed && (
                        <Card className={`p-6 ${order.creditCheck.passed ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-amber-500'}`}>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Credit Check</h3>
                            <div className="space-y-1 text-sm">
                                <p>Required: {fmt(order.creditCheck.creditRequired)}</p>
                                <p>Available: {fmt(order.creditCheck.creditAvailable)}</p>
                                <p className={order.creditCheck.passed ? 'text-green-600' : 'text-amber-600'}>
                                    {order.creditCheck.passed ? '✓ Passed' : '⚠ Exceeded'}
                                </p>
                                {order.creditCheck.overridden && (
                                    <p className="text-xs text-gray-500 mt-1">Overridden: {order.creditCheck.overrideReason}</p>
                                )}
                            </div>
                        </Card>
                    )}

                    {order.holdReason && (
                        <Card className="p-6 border-l-4 border-l-amber-500 bg-amber-50">
                            <h3 className="text-sm font-semibold text-amber-800 mb-1">On Hold</h3>
                            <p className="text-sm text-amber-700">{order.holdReason}</p>
                        </Card>
                    )}

                    {order.cancelledAt && (
                        <Card className="p-6 border-l-4 border-l-red-500 bg-red-50">
                            <h3 className="text-sm font-semibold text-red-800 mb-1">Cancelled</h3>
                            <p className="text-sm text-red-700">{order.cancellationReason}</p>
                            <p className="text-xs text-red-600 mt-1">By {order.cancelledBy?.firstName} on {fmtDate(order.cancelledAt)}</p>
                        </Card>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={!!action}
                onClose={() => { setAction(null); setReason(''); }}
                onConfirm={handleAction}
                title={action?.label}
                message={
                    action?.needsReason ? (
                        <div>
                            <p className="mb-3">Please provide a reason:</p>
                            <textarea
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                    ) : `Are you sure you want to ${action?.label?.toLowerCase()} this order?`
                }
                confirmText={action?.label}
                variant={action?.variant === 'danger' ? 'danger' : 'primary'}
                loading={changeStatus.isPending}
            />
        </div>
    );
}