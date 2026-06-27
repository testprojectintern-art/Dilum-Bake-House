import { forwardRef } from 'react';
import { useCompanySettings } from '../../features/settings/useSettings';

const fmt = (n) => new Intl.NumberFormat('en-LK', {
    style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(n || 0);

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
}) : '—';

/**
 * Printable A4 Invoice Component
 * companyInfo: { name, address, taxNumber, phone, email, logo }
 * invoice: full populated invoice doc
 * payments: array of payments allocated to this invoice
 */
const PrintableInvoice = forwardRef(({ invoice, payments = [], companyInfo: propCompanyInfo }, ref) => {
    const { data: settingsRes } = useCompanySettings();

    if (!invoice) return null;

    const s = settingsRes?.data || {};
    const companyInfo = {
        name: s.companyName || propCompanyInfo?.name || 'YOUR COMPANY NAME',
        address: s.address || propCompanyInfo?.address || 'YOUR STREET, CITY',
        phone: s.phone || propCompanyInfo?.phone || '+94 11 XXX XXXX',
        taxNumber: s.taxRegistrationNumber || propCompanyInfo?.taxNumber,
        email: s.email || propCompanyInfo?.email,
        website: s.website || propCompanyInfo?.website,
        logo: s.logo || propCompanyInfo?.logo || null
    };

    const customer = invoice.customerSnapshot || {};
    const billingAddr = invoice.billingAddress || {};
    const shippingAddr = invoice.shippingAddress || billingAddr;

    const totalPaid = payments.reduce((sum, p) => {
        const alloc = p.allocations?.find((a) =>
            (a.documentId?._id?.toString() || a.documentId?.toString()) === invoice._id.toString()
        );
        return sum + (alloc?.amount || 0);
    }, 0);

    const balanceDue = invoice.grandTotal - totalPaid;

    return (
        <div ref={ref} className="print-container bg-white text-black p-10 max-w-[800px] mx-auto">
            <style type="text/css" media="print">
                {`@page { size: A4 portrait; margin: 0; }`}
            </style>
            {/* Header */}
            <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-800">
                <div>
                    {companyInfo?.logo && (
                        <img src={companyInfo.logo} alt="Logo" className="h-16 mb-2" />
                    )}
                    <h1 className="text-2xl font-bold">{companyInfo?.name || 'Your Company'}</h1>
                    {companyInfo?.address && <p className="text-sm">{companyInfo.address}</p>}
                    {companyInfo?.taxNumber && <p className="text-sm">Tax No: {companyInfo.taxNumber}</p>}
                    <p className="text-sm">
                        {companyInfo?.phone && `Tel: ${companyInfo.phone}`}
                        {companyInfo?.email && ` · ${companyInfo.email}`}
                    </p>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold text-gray-700">INVOICE</h2>
                    <p className="text-sm font-mono mt-1">{invoice.invoiceNumber}</p>
                </div>
            </div>

            {/* Bill To / Dates */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                    <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Bill To</p>
                    {customer.name && <p className="font-bold">{customer.name}</p>}
                    {customer.code && <p className="text-sm">Code: {customer.code}</p>}
                    {customer.phone && <p className="text-sm">Phone: {customer.phone}</p>}
                    {billingAddr.line1 && <p className="text-sm">{billingAddr.line1}</p>}
                    {billingAddr.line2 && <p className="text-sm">{billingAddr.line2}</p>}
                    {(billingAddr.city || billingAddr.state) && (
                        <p className="text-sm">{billingAddr.city}{billingAddr.state ? `, ${billingAddr.state}` : ''}</p>
                    )}
                    {customer.taxRegistrationNumber && (
                        <p className="text-sm mt-1">Tax No: {customer.taxRegistrationNumber}</p>
                    )}
                    {customer.phone && <p className="text-sm">Tel: {customer.phone}</p>}
                </div>

                <div>
                    <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Invoice Details</p>
                    <table className="text-sm w-full">
                        <tbody>
                            <tr><td className="text-gray-600 pr-2">Invoice Date:</td><td className="text-right">{formatDate(invoice.invoiceDate)}</td></tr>
                            <tr><td className="text-gray-600 pr-2">Due Date:</td><td className="text-right font-semibold">{formatDate(invoice.dueDate)}</td></tr>
                            {invoice.salesOrderId?.orderNumber && (
                                <tr><td className="text-gray-600 pr-2">Order Ref:</td><td className="text-right">{invoice.salesOrderId.orderNumber}</td></tr>
                            )}
                            {invoice.paymentTerms?.type && (
                                <tr><td className="text-gray-600 pr-2">Terms:</td>
                                    <td className="text-right">
                                        {invoice.paymentTerms.type === 'credit'
                                            ? `${invoice.paymentTerms.creditDays} days credit`
                                            : invoice.paymentTerms.type.toUpperCase()}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Line items */}
            <table className="w-full mb-6">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="text-left p-2 text-xs uppercase font-semibold border-b border-gray-300 w-8">#</th>
                        <th className="text-left p-2 text-xs uppercase font-semibold border-b border-gray-300">Description</th>
                        <th className="text-right p-2 text-xs uppercase font-semibold border-b border-gray-300 w-16">Qty</th>
                        <th className="text-right p-2 text-xs uppercase font-semibold border-b border-gray-300 w-24">Unit Price</th>
                        <th className="text-right p-2 text-xs uppercase font-semibold border-b border-gray-300 w-16">Disc%</th>
                        <th className="text-right p-2 text-xs uppercase font-semibold border-b border-gray-300 w-16">Tax%</th>
                        <th className="text-right p-2 text-xs uppercase font-semibold border-b border-gray-300 w-28">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {(invoice.items || []).map((item, idx) => {
                        const lineSub = (item.quantity || 0) * (item.unitPrice || 0);
                        const lineDisc = lineSub * ((item.discountPercent || 0) / 100);
                        const taxableBase = item.taxable ? (lineSub - lineDisc) : 0;
                        const lineTax = taxableBase * ((item.taxRate || 0) / 100);
                        const lineTotal = lineSub - lineDisc + lineTax;

                        return (
                            <tr key={idx} className="border-b border-gray-200">
                                <td className="p-2 text-sm">{idx + 1}</td>
                                <td className="p-2 text-sm">
                                    <div className="font-medium">{item.productName}</div>
                                    {item.productCode && <div className="text-xs text-gray-500 font-mono">{item.productCode}</div>}
                                </td>
                                <td className="p-2 text-sm text-right">{item.quantity} {item.unitOfMeasure || ''}</td>
                                <td className="p-2 text-sm text-right">{fmt(item.unitPrice)}</td>
                                <td className="p-2 text-sm text-right">{item.discountPercent || 0}%</td>
                                <td className="p-2 text-sm text-right">{item.taxRate || 0}%</td>
                                <td className="p-2 text-sm text-right font-medium">{fmt(lineTotal)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-6">
                <table className="text-sm w-72">
                    <tbody>
                        <tr>
                            <td className="text-gray-600 py-1">Subtotal:</td>
                            <td className="text-right py-1">{fmt(invoice.subtotal)}</td>
                        </tr>
                        {invoice.totalDiscount > 0 && (
                            <tr>
                                <td className="text-gray-600 py-1">Discount:</td>
                                <td className="text-right py-1 text-red-600">-{fmt(invoice.totalDiscount)}</td>
                            </tr>
                        )}
                        <tr>
                            <td className="text-gray-600 py-1">Tax (VAT):</td>
                            <td className="text-right py-1">{fmt(invoice.totalTax)}</td>
                        </tr>
                        {invoice.shippingCost > 0 && (
                            <tr>
                                <td className="text-gray-600 py-1">Shipping:</td>
                                <td className="text-right py-1">{fmt(invoice.shippingCost)}</td>
                            </tr>
                        )}
                        <tr className="border-t-2 border-gray-800">
                            <td className="font-bold py-2 text-base">Grand Total:</td>
                            <td className="text-right font-bold py-2 text-base">{fmt(invoice.grandTotal)}</td>
                        </tr>
                        {totalPaid > 0 && (
                            <>
                                <tr>
                                    <td className="text-gray-600 py-1">Amount Paid:</td>
                                    <td className="text-right py-1 text-green-700">{fmt(totalPaid)}</td>
                                </tr>
                                <tr className="border-t border-gray-400">
                                    <td className="font-bold py-2">Balance Due:</td>
                                    <td className={`text-right font-bold py-2 ${balanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                        {fmt(balanceDue)}
                                    </td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Payments history */}
            {payments.length > 0 && (
                <div className="mb-6">
                    <p className="text-xs uppercase font-semibold text-gray-500 mb-2">Payment History</p>
                    <table className="w-full text-sm border border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left p-2 border-b">Date</th>
                                <th className="text-left p-2 border-b">Reference</th>
                                <th className="text-left p-2 border-b">Method</th>
                                <th className="text-right p-2 border-b">Amount Applied</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p) => {
                                const alloc = p.allocations?.find((a) =>
                                    (a.documentId?._id?.toString() || a.documentId?.toString()) === invoice._id.toString()
                                );
                                return (
                                    <tr key={p._id} className="border-b last:border-b-0">
                                        <td className="p-2">{formatDate(p.paymentDate)}</td>
                                        <td className="p-2 font-mono text-xs">{p.paymentNumber}</td>
                                        <td className="p-2 capitalize">{p.method?.replace(/_/g, ' ')}</td>
                                        <td className="p-2 text-right">{fmt(alloc?.amount || 0)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer / notes */}
            {invoice.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                </div>
            )}

            <div className="text-center text-xs text-gray-500 pt-6 border-t border-gray-200 mt-8">
                Thank you for your business.
                {balanceDue > 0 && (
                    <p className="mt-1">Please make payment by <strong>{formatDate(invoice.dueDate)}</strong>.</p>
                )}
            </div>
        </div>
    );
});

PrintableInvoice.displayName = 'PrintableInvoice';
export default PrintableInvoice;