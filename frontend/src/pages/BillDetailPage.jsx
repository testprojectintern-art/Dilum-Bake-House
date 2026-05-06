import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '../features/payments/paymentsApi';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useBill } from '../features/bills/useBills';

const statusVariant = {
    unpaid: 'warning', partially_paid: 'info', paid: 'success',
    overdue: 'danger', cancelled: 'default', disputed: 'danger',
};

export default function BillDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isLoading } = useBill(id);
    const bill = data?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';
    
    // Fetch payments allocated to this bill
    const { data: paymentsData } = useQuery({
        queryKey: ['paymentsForBill', id],
        queryFn: () => paymentsApi.list({ documentId: id, limit: 50 }),
        enabled: !!id,
    });
    const payments = paymentsData?.data || [];

    if (isLoading || !bill) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">
                    Bill {bill.billNumber}
                    <Badge variant={statusVariant[bill.paymentStatus]}>{bill.paymentStatus.replace('_', ' ')}</Badge>
                    {bill.daysPastDue > 0 && <Badge variant="danger">{bill.daysPastDue}d late</Badge>}
                </span>}
                description={`${fmtDate(bill.billDate)} · Due ${fmtDate(bill.dueDate)}`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/bills')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        {bill.balanceDue > 0 && (
                            <Button variant="primary" onClick={() => navigate(`/payments/new?billId=${bill._id}`)}>
                                <Receipt size={16} className="mr-1.5" /> Record Payment
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Supplier</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Vendor</p>
                                <p className="font-medium">{bill.supplierSnapshot?.name}</p>
                                <p className="text-sm text-gray-600">{bill.supplierSnapshot?.code}</p>
                                {bill.supplierSnapshot?.taxRegistrationNumber && (
                                    <p className="text-sm text-gray-600">VAT: {bill.supplierSnapshot.taxRegistrationNumber}</p>
                                )}
                            </div>
                            <div>
                                {bill.supplierInvoiceNumber && (
                                    <>
                                        <p className="text-xs text-gray-500 uppercase mb-1">Supplier Invoice #</p>
                                        <p className="font-mono text-sm">{bill.supplierInvoiceNumber}</p>
                                    </>
                                )}
                                {bill.grnNumbers?.length > 0 && (
                                    <>
                                        <p className="text-xs text-gray-500 uppercase mt-3 mb-1">Related GRNs</p>
                                        <div className="text-sm">
                                            {bill.grnNumbers.map((n) => <span key={n} className="mr-2 font-mono">{n}</span>)}
                                        </div>
                                    </>
                                )}
                                {bill.purchaseOrderNumbers?.length > 0 && (
                                    <>
                                        <p className="text-xs text-gray-500 uppercase mt-3 mb-1">Related POs</p>
                                        <div className="text-sm">
                                            {bill.purchaseOrderNumbers.map((n) => <span key={n} className="mr-2 font-mono">{n}</span>)}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold text-gray-700">Items</h3></div>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Item</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Price</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {bill.items.map((item) => (
                                    <tr key={item._id || item.lineNumber}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-sm">{item.productName}</p>
                                            {item.productCode && <p className="text-xs font-mono text-gray-500">{item.productCode}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right text-sm">{fmt(item.unitPrice)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-medium">{fmt(item.lineTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    {payments.length > 0 && (
                        <Card>
                            <div className="px-6 py-4 border-b flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-700">Payment History</h3>
                                <Badge variant="success">{payments.length} Payments</Badge>
                            </div>
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Method</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Ref #</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {payments.map((p) => (
                                        <tr key={p._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/payments/${p._id}`)}>
                                            <td className="px-4 py-3 text-sm">{fmtDate(p.paymentDate)}</td>
                                            <td className="px-4 py-3 text-sm capitalize">{p.method.replace('_', ' ')}</td>
                                            <td className="px-4 py-3 text-sm font-mono">{p.paymentNumber}</td>
                                            <td className="px-4 py-3 text-right text-sm font-medium text-green-600">{fmt(p.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{fmt(bill.subtotal)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>{fmt(bill.totalTax)}</span></div>
                            {bill.shippingCost > 0 && <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{fmt(bill.shippingCost)}</span></div>}
                            <div className="flex justify-between pt-3 border-t"><span className="font-semibold">Total</span><span className="font-bold">{fmt(bill.grandTotal)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Paid</span><span className="text-green-600">-{fmt(bill.amountPaid)}</span></div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="font-semibold">Balance Due</span>
                                <span className={`font-bold text-lg ${bill.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {fmt(bill.balanceDue)}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}