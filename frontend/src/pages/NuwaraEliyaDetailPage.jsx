import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2, Calendar, FileText, User, Share2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useNuwaraEliyaDelivery } from '../features/bakery/useBakery';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

export default function NuwaraEliyaDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Query
    const { data: deliveryRes, isLoading } = useNuwaraEliyaDelivery(id);
    const del = deliveryRes?.data;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(price || 0);
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
            </div>
        );
    }

    if (!del) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 font-bold">Consignment bill record not found.</p>
                <Button onClick={() => navigate('/bakery/nuwara-eliya')} className="mt-4">
                    Back to List
                </Button>
            </div>
        );
    }

    const totalDeductions = (del.bankDeposits || 0) + (del.returnsCost || 0) + (del.onBoardStockCost || 0) + (del.shopsOutstanding || 0);
    const grossSubtotal = (del.loadCost || 0) + (del.previousOutstanding || 0) + (del.previousOnBoardStockCost || 0) + (del.previousShopsOutstanding || 0);

    const handleSharePDF = () => {
        const element = document.getElementById('printable-consignment');
        const opt = {
            margin: 10,
            filename: `Dilum_Bake_House_Bill_${del.billNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        toast.promise(
            new Promise((resolve, reject) => {
                html2pdf().from(element).set(opt).outputPdf('blob').then((pdfBlob) => {
                    const file = new File([pdfBlob], `Dilum_Bake_House_Bill_${del.billNumber}.pdf`, { type: 'application/pdf' });
                    
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        navigator.share({
                            files: [file]
                        })
                        .then(() => resolve())
                        .catch((err) => {
                            if (err.name === 'AbortError') {
                                resolve();
                            } else {
                                reject(err);
                            }
                        });
                    } else {
                        // Desktop fallback: save file directly
                        html2pdf().from(element).set(opt).save()
                            .then(() => resolve())
                            .catch((err) => reject(err));
                    }
                }).catch((err) => reject(err));
            }),
            {
                loading: 'Generating professional PDF...',
                success: 'PDF generated successfully!',
                error: 'Could not generate PDF. Please try again.'
            }
        );
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            {/* Header / Nav (Hidden on print) */}
            <div className="flex items-center justify-between gap-4 mb-4 print:hidden">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/bakery/nuwara-eliya')}
                        className="p-2 bg-white border border-gray-250 hover:bg-gray-50 rounded-xl transition text-gray-600 shadow-sm"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">Consignment Details</h1>
                        <p className="text-xs md:text-sm text-gray-500 mt-0.5">Nuwara Eliya trip sheet summary</p>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button onClick={handleSharePDF} variant="outline" className="flex items-center gap-2 border-indigo-250 text-indigo-700 hover:bg-indigo-50">
                        <Share2 size={16} />
                        Share PDF
                    </Button>
                    <Button onClick={handlePrint} className="flex items-center gap-2">
                        <Printer size={16} />
                        {del.status === 'settled' ? 'Print Settlement Sheet' : 'Print Load Bill'}
                    </Button>
                </div>
            </div>

            {/* Printable content wrapper */}
            <div id="printable-consignment" className="print-container space-y-6 print:p-8 print:bg-white bg-transparent">
                {/* Invoice Header */}
                <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between gap-6 print:border-none print:shadow-none print:p-0">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center print:hidden">
                                <FileText size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Dilum Bake House</h2>
                                <p className="text-xs text-gray-500">Nuwara Eliya Delivery Route Trip Sheet</p>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                            <p className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-gray-400" />
                                <span className="font-semibold text-gray-700">Trip Date:</span>
                                <span>{new Date(del.date).toLocaleDateString('en-LK', { dateStyle: 'long' })}</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                                <User size={13} className="text-gray-400" />
                                <span className="font-semibold text-gray-700">Created By:</span>
                                <span className="capitalize">{del.createdBy?.username || 'System User'}</span>
                            </p>
                        </div>
                    </div>
                    <div className="text-left md:text-right space-y-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settlement Bill Number</p>
                        <p className="text-2xl font-extrabold text-indigo-650 tracking-tight">{del.billNumber}</p>
                        {del.status === 'settled' ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-150 print:border-none">
                                Settled
                            </span>
                        ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-150 print:border-none">
                                Loaded (Pending Return)
                            </span>
                        )}
                    </div>
                </div>

                {/* Items details */}
                <div className={`grid grid-cols-1 ${del.status === 'settled' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6 print:grid-cols-1`}>
                    {/* Loaded Cost */}
                    <Card className="p-5 space-y-3 print:border print:shadow-none">
                        <h3 className="font-bold text-gray-800 text-sm border-b pb-1.5">1. Loaded Products</h3>
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b text-gray-400 font-semibold uppercase text-[10px]">
                                    <th className="py-1 text-left">Product</th>
                                    <th className="py-1 text-right">Price</th>
                                    <th className="py-1 text-right">Qty</th>
                                    <th className="py-1 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {del.loadedItems?.map((item, i) => (
                                    <tr key={i} className="text-gray-700">
                                        <td className="py-1.5 font-medium">{item.productName}</td>
                                        <td className="py-1.5 text-right">{formatPrice(item.price)}</td>
                                        <td className="py-1.5 text-right font-semibold">{item.qty}</td>
                                        <td className="py-1.5 text-right font-bold">{formatPrice(item.qty * item.price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex justify-between border-t pt-2 font-bold text-xs text-gray-800">
                            <span>Total Loaded Cost:</span>
                            <span>{formatPrice(del.loadCost)}</span>
                        </div>
                    </Card>

                    {del.status === 'settled' && (
                        <div className="space-y-6">
                            {/* Returned Items */}
                            <Card className="p-5 space-y-3 print:border print:shadow-none">
                                <h3 className="font-bold text-gray-800 text-sm border-b pb-1.5">2. Returned Products (Unsold)</h3>
                                {del.returnedItems && del.returnedItems.length > 0 ? (
                                    <>
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b text-gray-400 font-semibold uppercase text-[10px]">
                                                    <th className="py-1 text-left">Product</th>
                                                    <th className="py-1 text-right">Price</th>
                                                    <th className="py-1 text-right">Qty</th>
                                                    <th className="py-1 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {del.returnedItems.map((item, i) => (
                                                    <tr key={i} className="text-gray-700">
                                                        <td className="py-1.5 font-medium">{item.productName}</td>
                                                        <td className="py-1.5 text-right">{formatPrice(item.price)}</td>
                                                        <td className="py-1.5 text-right font-semibold">{item.qty}</td>
                                                        <td className="py-1.5 text-right font-bold">{formatPrice(item.qty * item.price)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="flex justify-between border-t pt-2 font-bold text-xs text-gray-800">
                                            <span>Total Returns Cost:</span>
                                            <span>{formatPrice(del.returnsCost)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-xs text-gray-400 italic text-center py-2">No returns registered for this trip.</p>
                                )}
                            </Card>

                            {/* On-board Inventory */}
                            <Card className="p-5 space-y-3 print:border print:shadow-none">
                                <h3 className="font-bold text-gray-800 text-sm border-b pb-1.5">3. Stock Left On-Board (Remaining)</h3>
                                {del.onBoardItems && del.onBoardItems.length > 0 ? (
                                    <>
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b text-gray-400 font-semibold uppercase text-[10px]">
                                                    <th className="py-1 text-left">Product</th>
                                                    <th className="py-1 text-right">Price</th>
                                                    <th className="py-1 text-right">Qty</th>
                                                    <th className="py-1 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {del.onBoardItems.map((item, i) => (
                                                    <tr key={i} className="text-gray-700">
                                                        <td className="py-1.5 font-medium">{item.productName}</td>
                                                        <td className="py-1.5 text-right">{formatPrice(item.price)}</td>
                                                        <td className="py-1.5 text-right font-semibold">{item.qty}</td>
                                                        <td className="py-1.5 text-right font-bold">{formatPrice(item.qty * item.price)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="flex justify-between border-t pt-2 font-bold text-xs text-gray-800">
                                            <span>Total On-Board Cost:</span>
                                            <span>{formatPrice(del.onBoardStockCost)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-xs text-gray-400 italic text-center py-2">No on-board inventory left for this trip.</p>
                                )}
                            </Card>
                        </div>
                    )}
                </div>

                {/* Calculations Balance Sheet */}
                <Card className="p-6 bg-slate-50/50 border border-gray-150 print:border print:shadow-none">
                    <h3 className="font-bold text-gray-800 text-sm border-b pb-2">Trip Balance Sheet Calculations</h3>
                    <div className={`grid grid-cols-1 ${del.status === 'settled' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6 pt-3 text-xs`}>
                        <div className="space-y-2">
                            <div className="flex justify-between font-medium">
                                <span className="text-gray-500">Trip Loaded Cost (A):</span>
                                <span className="text-gray-850 font-bold">{formatPrice(del.loadCost)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                                <span className="text-gray-500">Previous Outstanding (B):</span>
                                <span className="text-gray-850 font-bold">+{formatPrice(del.previousOutstanding)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                                <span className="text-gray-500">Previous On-board Stock (C):</span>
                                <span className="text-gray-850 font-bold">+{formatPrice(del.previousOnBoardStockCost || 0)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                                <span className="text-gray-500">Previous Shops Naya (D):</span>
                                <span className="text-gray-850 font-bold">+{formatPrice(del.previousShopsOutstanding || 0)}</span>
                            </div>
                            <div className="flex justify-between font-bold border-t pt-2 text-indigo-900 text-sm">
                                <span>Total Loaded Bill (A+B+C+D):</span>
                                <span>{formatPrice(grossSubtotal)}</span>
                            </div>
                        </div>

                        {del.status === 'settled' ? (
                            <div className="space-y-2 bg-white p-3 rounded-lg border border-gray-200 shadow-sm print:shadow-none print:border">
                                <div className="flex justify-between text-gray-500 font-medium">
                                    <span>- Bank Deposits:</span>
                                    <span>{formatPrice(del.bankDeposits)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 font-medium">
                                    <span>- Returns Cost:</span>
                                    <span>{formatPrice(del.returnsCost)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 font-medium">
                                    <span>- On-board Stock:</span>
                                    <span>{formatPrice(del.onBoardStockCost)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 font-medium">
                                    <span>- Local Shops Naya:</span>
                                    <span>{formatPrice(del.shopsOutstanding)}</span>
                                </div>
                                <div className="flex justify-between font-bold border-t pt-2 text-gray-850">
                                    <span>Total Deductions:</span>
                                    <span>-{formatPrice(totalDeductions)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-amber-50 border border-amber-150 p-3 rounded-lg text-amber-850 font-semibold leading-relaxed print:bg-white print:border print:text-amber-900">
                                <p className="font-bold text-xs uppercase tracking-wider mb-1">Departure Load Pending Settlement</p>
                                This trip has not been settled yet. The total loaded bill of {formatPrice(grossSubtotal)} represents the current running balances given to the delivery representative.
                            </div>
                        )}
                    </div>

                    {del.status === 'settled' && (
                        <div className="border-t mt-4 pt-4 flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-150 print:border">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Net Outstanding</p>
                                <p className="text-lg font-bold text-gray-900">{formatPrice(del.netOutstanding)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cash Paid Today</p>
                                <p className="text-lg font-bold text-green-700">{formatPrice(del.amountPaid)}</p>
                            </div>
                            <div className="space-y-1 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-150">
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Next Trip Carryover</p>
                                <p className="text-lg font-extrabold text-indigo-800">{formatPrice(del.nextOutstanding)}</p>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Special remarks */}
                {del.specialRemarks && (
                    <Card className="p-5 border border-gray-150 print:border print:shadow-none">
                        <h4 className="font-bold text-gray-800 text-xs mb-1.5">Remarks / Trip Notes</h4>
                        <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{del.specialRemarks}</p>
                    </Card>
                )}

                {/* Print Signatures */}
                <div className="hidden print:grid grid-cols-3 gap-8 pt-16 text-center text-xs text-gray-650 mt-12">
                    <div className="border-t border-gray-300 pt-2 font-medium">
                        Prepared By (Signature)
                    </div>
                    <div className="border-t border-gray-300 pt-2 font-medium">
                        Driver / Delivery Representative
                    </div>
                    <div className="border-t border-gray-300 pt-2 font-medium">
                        Checked & Verified By
                    </div>
                </div>
            </div>
        </div>
    );
}
