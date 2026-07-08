import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Plus, Loader2, Calendar, FileText, CheckCircle, AlertCircle,
    RotateCcw, DollarSign, Printer, Trash2, Edit, Edit3, ArrowRight, User, Download, MessageSquare, Phone
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import KpiCard from '../components/ui/KpiCard';
import { useBakeryInvoices, useUpdateBakeryInvoice, useDeleteBakeryInvoice } from '../features/bakery/useBakery';
import toast from 'react-hot-toast';
import html2pdf from 'html2pdf.js';

export default function BakeryInvoicesPage() {
    const navigate = useNavigate();

    // Default to today's date
    const getTodayString = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const [fromDate, setFromDate] = useState(getTodayString());
    const [toDate, setToDate] = useState(getTodayString());
    const [shopSearch, setShopSearch] = useState('');
    const [page, setPage] = useState(1);

    // Modal state for quick payment update
    const [paymentInvoice, setPaymentInvoice] = useState(null);
    const [quickAmountReceived, setQuickAmountReceived] = useState('');

    // Modal state for delete confirm
    const [deletingInvoice, setDeletingInvoice] = useState(null);

    // Modal state for WhatsApp sharing
    const [whatsappInvoice, setWhatsappInvoice] = useState(null);
    const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
    const [customWhatsAppPhone, setCustomWhatsAppPhone] = useState('');
    const [pdfFile, setPdfFile] = useState(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Date range filters for backend
    const getStartOfDayISO = (dateStr) => {
        if (!dateStr) return undefined;
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
    };

    const getEndOfDayISO = (dateStr) => {
        if (!dateStr) return undefined;
        const d = new Date(dateStr);
        d.setHours(23, 59, 59, 999);
        return d.toISOString();
    };

    const startDate = getStartOfDayISO(fromDate);
    const endDate = getEndOfDayISO(toDate);

    const { data, isLoading, refetch } = useBakeryInvoices({
        startDate,
        endDate,
        shopName: shopSearch,
        page,
        limit: 25
    });

    const updateInvoice = useUpdateBakeryInvoice();
    const deleteInvoice = useDeleteBakeryInvoice();

    const invoices = data?.data || [];
    const summary = data?.summary || { totalDelivered: 0, totalReturns: 0, totalReceived: 0, totalOutstanding: 0 };
    const totalPages = data?.totalPages || 1;

    // Handle Quick Payment Submit
    const handleQuickPaymentSubmit = (e) => {
        e.preventDefault();
        if (!paymentInvoice) return;

        const amt = Number(quickAmountReceived);
        if (isNaN(amt) || amt < 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        updateInvoice.mutate(
            {
                id: paymentInvoice._id,
                data: {
                    amountReceived: amt
                }
            },
            {
                onSuccess: () => {
                    setPaymentInvoice(null);
                    setQuickAmountReceived('');
                }
            }
        );
    };

    const handleDeleteConfirm = () => {
        if (!deletingInvoice) return;
        deleteInvoice.mutate(deletingInvoice._id, {
            onSuccess: () => {
                setDeletingInvoice(null);
            }
        });
    };

    // Open Quick Payment update modal
    const handleOpenPaymentModal = (invoice) => {
        setPaymentInvoice(invoice);
        setQuickAmountReceived(String(invoice.amountReceived || 0));
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(price || 0);
    };

    const generateInvoicePdfBlob = async (invoice) => {
        // Temporarily disable dark mode on root element to prevent CSS style leaks
        const hadDark = document.documentElement.classList.contains('dark');
        if (hadDark) {
            document.documentElement.classList.remove('dark');
        }

        const element = document.createElement('div');
        element.id = 'pdf-temp-container';
        element.style.padding = '10px';
        element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        element.style.lineHeight = '1.4';
        element.style.width = '198mm'; // 210mm total - 12mm margins (6mm left/right)
        element.style.backgroundColor = '#ffffff';
        element.style.color = '#1e293b';
        element.style.boxSizing = 'border-box';
        
        const morningItems = invoice.items.filter(item => item.morningQty > 0);
        const afternoonItems = invoice.items.filter(item => item.afternoonQty > 0);
        const returnItems = invoice.items.filter(item => item.returnQty > 0);

        let morningTotal = 0;
        let afternoonTotal = 0;
        let returnsTotal = 0;

        invoice.items.forEach(item => {
            morningTotal += (item.morningQty || 0) * (item.price || 0);
            afternoonTotal += (item.afternoonQty || 0) * (item.price || 0);
            returnsTotal += (item.returnQty || 0) * (item.price || 0);
        });

        let itemsHtml = '';
        if (morningItems.length > 0) {
            itemsHtml += `
                <div class="section-title">Morning Deliveries</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                        <tr>
                            <th style="text-align: left; width: 45%;">Product Name</th>
                            <th style="text-align: right; width: 15%;">Quantity</th>
                            <th style="text-align: right; width: 20%;">Unit Price (LKR)</th>
                            <th style="text-align: right; width: 20%;">Total Amount (LKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${morningItems.map(item => `
                            <tr>
                                <td style="font-weight: 600; text-align: left;">${item.productName}</td>
                                <td style="text-align: right; font-weight: 500;">${item.morningQty}</td>
                                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: 700; color: #1e3a8a;">${(item.morningQty * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td colspan="3" style="text-align: right; font-weight: 800; border-top: 2px solid #cbd5e1 !important; padding: 10px 12px !important;">Morning Deliveries Total:</td>
                            <td style="text-align: right; font-weight: 800; color: #1e3a8a; border-top: 2px solid #cbd5e1 !important; padding: 10px 12px !important;">${morningTotal.toFixed(2)} LKR</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        if (afternoonItems.length > 0) {
            itemsHtml += `
                <div class="section-title">Afternoon Deliveries</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                        <tr>
                            <th style="text-align: left; width: 45%;">Product Name</th>
                            <th style="text-align: right; width: 15%;">Quantity</th>
                            <th style="text-align: right; width: 20%;">Unit Price (LKR)</th>
                            <th style="text-align: right; width: 20%;">Total Amount (LKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${afternoonItems.map(item => `
                            <tr>
                                <td style="font-weight: 600; text-align: left;">${item.productName}</td>
                                <td style="text-align: right; font-weight: 500;">${item.afternoonQty}</td>
                                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: 700; color: #1e3a8a;">${(item.afternoonQty * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td colspan="3" style="text-align: right; font-weight: 800; border-top: 2px solid #cbd5e1 !important; padding: 10px 12px !important;">Afternoon Deliveries Total:</td>
                            <td style="text-align: right; font-weight: 800; color: #1e3a8a; border-top: 2px solid #cbd5e1 !important; padding: 10px 12px !important;">${afternoonTotal.toFixed(2)} LKR</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        if (returnItems.length > 0) {
            itemsHtml += `
                <div class="section-title" style="color: #b91c1c; border-bottom-color: #b91c1c;">Returns Received</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                        <tr>
                            <th style="text-align: left; width: 45%;">Product Name</th>
                            <th style="text-align: right; width: 15%;">Quantity</th>
                            <th style="text-align: right; width: 20%;">Unit Price (LKR)</th>
                            <th style="text-align: right; width: 20%;">Total Amount (LKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${returnItems.map(item => `
                            <tr>
                                <td style="font-weight: 600; text-align: left;">${item.productName}</td>
                                <td style="text-align: right; font-weight: 500;">${item.returnQty}</td>
                                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: 700; color: #b91c1c;">-${(item.returnQty * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td colspan="3" style="text-align: right; font-weight: 800; border-top: 2px solid #cbd5e1 !important; padding: 10px 12px !important;">Returns Total:</td>
                            <td style="text-align: right; font-weight: 800; color: #b91c1c; border-top: 2px solid #cbd5e1 !important; padding: 10px 12px !important;">-${returnsTotal.toFixed(2)} LKR</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        let specialNoteHtml = '';
        if (invoice.specialNote && invoice.specialNote.trim() !== '') {
            specialNoteHtml = `
                <div style="border-left: 4px solid #1e3a8a; background-color: #f8fafc; padding: 12px 15px; border-radius: 0 8px 8px 0; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; margin-top: 10px;">
                    <strong class="text-primary" style="text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 4px; letter-spacing: 0.5px;">Special Note / Remarks</strong>
                    <span style="font-size: 12px; color: #475569; line-height: 1.4; display: block;">${invoice.specialNote}</span>
                </div>
            `;
        }

        element.innerHTML = `
            <style>
                #pdf-temp-container {
                    background-color: #ffffff !important;
                    color: #1e293b !important;
                }
                #pdf-temp-container * {
                    box-sizing: border-box !important;
                }
                #pdf-temp-container th {
                    background-color: #f1f5f9 !important;
                    color: #475569 !important;
                    font-weight: 700 !important;
                    font-size: 12px !important;
                    text-transform: uppercase !important;
                    padding: 8px 12px !important;
                    border-bottom: 2px solid #cbd5e1 !important;
                }
                #pdf-temp-container td {
                    padding: 8px 12px !important;
                    font-size: 13px !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                    color: #1e293b !important;
                }
                #pdf-temp-container .section-title {
                    font-size: 13px !important;
                    font-weight: 850 !important;
                    text-transform: uppercase !important;
                    color: #1e3a8a !important;
                    border-bottom: 2px solid #1e3a8a !important;
                    padding-bottom: 4px !important;
                    margin-top: 25px !important;
                    margin-bottom: 10px !important;
                }
                #pdf-temp-container .text-primary {
                    color: #1e3a8a !important;
                    font-weight: 750 !important;
                }
                #pdf-temp-container .text-success {
                    color: #16a34a !important;
                    font-weight: 750 !important;
                }
                #pdf-temp-container .text-danger {
                    color: #dc2626 !important;
                    font-weight: 750 !important;
                }
            </style>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 20px;">
                <div>
                    <h1 style="font-size: 26px; font-weight: 900; color: #1e3a8a; margin: 0 0 4px 0; letter-spacing: 0.5px;">DILUM BAKE HOUSE</h1>
                    <p style="font-size: 11px; color: #64748b; margin: 0 0 2px 0; font-weight: 500;">39/A, Muruthalawa road, Dehideniya, Peradeniya</p>
                    <p style="font-size: 11px; color: #64748b; margin: 0 0 2px 0; font-weight: 500;">Tel: 0762125472 / 0774334046</p>
                    <p style="font-size: 10px; color: #475569; margin: 4px 0 0 0; font-weight: 700; background-color: #f1f5f9; padding: 3px 8px; border-radius: 4px; display: inline-block;">Reg No: මපස/ප්‍රාලේ/යනු/2978</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="font-size: 24px; font-weight: 900; color: #1e3a8a; margin: 0 0 8px 0; letter-spacing: 1px;">INVOICE</h2>
                    <div style="font-size: 11px; color: #1e293b; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; text-align: left; min-width: 220px; display: inline-block;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; gap: 20px;">
                            <span style="color: #64748b;">Invoice No:</span>
                            <span style="font-weight: 700; color: #1e3a8a;">${invoice.invoiceNumber}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; gap: 20px;">
                            <span style="color: #64748b;">Date:</span>
                            <span style="font-weight: 700;">${new Date(invoice.date).toLocaleDateString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 20px;">
                            <span style="color: #64748b;">Status:</span>
                            <span style="font-weight: 700; color: ${invoice.newBalance <= 0 ? '#16a34a' : '#dc2626'}; text-transform: uppercase;">${invoice.newBalance <= 0 ? 'Paid' : 'Unpaid'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;">
                <h3 style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.5px;">Billed To (Customer Details)</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                    <div>
                        <div style="font-size: 15px; font-weight: 800; color: #1e293b; text-transform: uppercase;">${invoice.shopName}</div>
                        ${invoice.shopPhone ? `
                        <div style="font-size: 12px; color: #475569; margin-top: 4px;">
                            <span>Phone:</span> <span style="font-weight: 600;">${invoice.shopPhone}</span>
                        </div>` : ''}
                    </div>
                    <div style="text-align: right; font-size: 11px; color: #64748b; max-width: 250px;">
                        Outstanding balance carries forward to the next billing cycle.
                    </div>
                </div>
            </div>

            ${itemsHtml}

            <div style="display: flex; gap: 20px; justify-content: space-between; margin-top: 25px; align-items: flex-start;">
                <!-- Left: Special Notes -->
                <div style="flex: 1; min-width: 250px;">
                    ${specialNoteHtml}
                </div>

                <!-- Right: Calculation Box -->
                <div style="width: 320px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
                        <span>Morning Total:</span>
                        <span style="font-weight: 600; color: #1e293b;">${morningTotal.toFixed(2)} LKR</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
                        <span>Afternoon Total:</span>
                        <span style="font-weight: 600; color: #1e293b;">${afternoonTotal.toFixed(2)} LKR</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
                        <span>Returns Total:</span>
                        <span style="font-weight: 600; color: #dc2626;">-${returnsTotal.toFixed(2)} LKR</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #475569; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">
                        <span>Old Outstanding:</span>
                        <span style="font-weight: 600; color: #1e293b;">${invoice.oldBalance.toFixed(2)} LKR</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: 800; font-size: 14px;">
                        <span>Grand Total:</span>
                        <span class="text-primary">${invoice.grandTotal.toFixed(2)} LKR</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 800; font-size: 14px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">
                        <span>Amount Paid Today:</span>
                        <span class="text-success">-${invoice.amountReceived.toFixed(2)} LKR</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-weight: 950; font-size: 15px; padding-top: 4px;">
                        <span>Net Outstanding Due:</span>
                        <span class="text-danger">${invoice.newBalance.toFixed(2)} LKR</span>
                    </div>
                </div>
            </div>

            <div style="text-align: center; font-size: 9px; margin-top: 40px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; font-style: italic;">
                Delight in every bite! Thank you for your continued partnership with Dilum Bake House.
            </div>
        `;

        document.body.appendChild(element);

        const options = {
            margin: 6, // 6mm margins (spacious but keeps empty white space very low!)
            filename: `${invoice.invoiceNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 1.5, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            const pdfBlob = await html2pdf().from(element).set(options).output('blob');
            document.body.removeChild(element);
            
            // Restore dark mode
            if (hadDark) {
                document.documentElement.classList.add('dark');
            }
            return pdfBlob;
        } catch (error) {
            console.error("PDF generation failed", error);
            document.body.removeChild(element);
            
            // Restore dark mode
            if (hadDark) {
                document.documentElement.classList.add('dark');
            }
            throw error;
        }
    };

    // Pre-generate PDF when invoice is selected for WhatsApp sharing to bypass iOS gesture restrictions
    useEffect(() => {
        if (!whatsappInvoice) {
            setPdfFile(null);
            return;
        }

        const preGeneratePdf = async () => {
            setIsGeneratingPdf(true);
            setPdfFile(null);
            try {
                const blob = await generateInvoicePdfBlob(whatsappInvoice);
                const file = new File([blob], `Invoice-${whatsappInvoice.invoiceNumber}.pdf`, { type: 'application/pdf' });
                setPdfFile(file);
            } catch (err) {
                console.error("Pre-generation of PDF failed", err);
                toast.error("Failed to prepare PDF invoice file.");
            } finally {
                setIsGeneratingPdf(false);
            }
        };

        preGeneratePdf();
    }, [whatsappInvoice]);

    const handleShareWhatsAppPdf = () => {
        if (!pdfFile) {
            toast.error("PDF is still preparing, please wait a moment.");
            return;
        }

        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            navigator.share({
                files: [pdfFile],
                title: `Invoice #${whatsappInvoice?.invoiceNumber}`,
                text: `Dilum Bake House Invoice - ${whatsappInvoice?.shopName}`,
            }).then(() => {
                toast.success("Native share menu opened!");
            }).catch(err => {
                if (err.name !== 'AbortError') {
                    toast.error("Sharing failed.");
                    console.error(err);
                }
            });
        } else {
            toast.error("File sharing not supported on this device/browser. Downloading PDF file instead.");
            const link = document.createElement('a');
            link.href = URL.createObjectURL(pdfFile);
            link.download = `Invoice-${whatsappInvoice?.invoiceNumber}.pdf`;
            link.click();
        }
    };

    const generateWhatsAppText = (invoice) => {
        const morningItems = invoice.items.filter(item => item.morningQty > 0);
        const afternoonItems = invoice.items.filter(item => item.afternoonQty > 0);
        const returnItems = invoice.items.filter(item => item.returnQty > 0);

        let text = `🍰 *DILUM BAKE HOUSE*\n`;
        text += `Reg No: මපස/ප්‍රාලේ/යනු/2978\n`;
        text += `Address: 39/A, Muruthalawa road, Dehideniya, Peradeniya\n`;
        text += `Tel: 0762125472 / 0774334046\n`;
        text += `-------------------------------------\n`;
        text += `📄 *Invoice:* #${invoice.invoiceNumber}\n`;
        text += `📅 *Date:* ${new Date(invoice.date).toLocaleDateString()}\n`;
        text += `🏪 *Shop:* ${invoice.shopName.toUpperCase()}\n\n`;

        if (morningItems.length > 0) {
            text += `*MORNING DELIVERIES:*\n`;
            morningItems.forEach(item => {
                text += `- ${item.productName}: ${item.morningQty} x ${item.price} = LKR ${(item.morningQty * item.price).toFixed(2)}\n`;
            });
            text += `\n`;
        }

        if (afternoonItems.length > 0) {
            text += `*AFTERNOON DELIVERIES:*\n`;
            afternoonItems.forEach(item => {
                text += `- ${item.productName}: ${item.afternoonQty} x ${item.price} = LKR ${(item.afternoonQty * item.price).toFixed(2)}\n`;
            });
            text += `\n`;
        }

        if (returnItems.length > 0) {
            text += `*RETURNS RECEIVED:*\n`;
            returnItems.forEach(item => {
                text += `- ${item.productName}: ${item.returnQty} x ${item.price} = -LKR ${(item.returnQty * item.price).toFixed(2)}\n`;
            });
            text += `\n`;
        }

        text += `-------------------------------------\n`;
        text += `*BILL SUMMARY:*\n`;
        text += `🚚 Delivered Total: LKR ${invoice.deliveredTotal.toFixed(2)}\n`;
        text += `↩️ Returns Total: LKR ${invoice.returnsTotal.toFixed(2)}\n`;
        text += `💵 Old Balance: LKR ${invoice.oldBalance.toFixed(2)}\n`;
        text += `💰 Grand Total: LKR ${invoice.grandTotal.toFixed(2)}\n`;
        text += `📥 Paid Today: LKR ${invoice.amountReceived.toFixed(2)}\n`;
        text += `🔴 Outstanding Bal: LKR ${invoice.newBalance.toFixed(2)}\n`;

        if (invoice.specialNote && invoice.specialNote.trim()) {
            text += `\n📝 *Note:* ${invoice.specialNote}\n`;
        }

        text += `\nThank you! Delight in every bite!`;
        return text;
    };

    const triggerWhatsAppRedirect = (phone, invoice) => {
        let cleanPhone = phone.trim().replace(/[^0-9+]/g, '');
        if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
            cleanPhone = '94' + cleanPhone.substring(1);
        } else if (cleanPhone.startsWith('+')) {
            cleanPhone = cleanPhone.substring(1);
        }
        
        const textMessage = generateWhatsAppText(invoice);
        const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(textMessage)}`;
        window.open(url, '_blank');
    };

    const handleShareWhatsApp = (invoice) => {
        const phoneStr = invoice.shopPhone || '';
        const numbers = phoneStr.split(',').map(n => n.trim()).filter(Boolean);

        if (numbers.length === 0) {
            setWhatsappInvoice(invoice);
            setCustomWhatsAppPhone('');
            setIsWhatsappOpen(true);
        } else if (numbers.length === 1) {
            triggerWhatsAppRedirect(numbers[0], invoice);
        } else {
            setWhatsappInvoice(invoice);
            setCustomWhatsAppPhone('');
            setIsWhatsappOpen(true);
        }
    };

    // Receipt print trigger
    const handlePrint = (invoice) => {
        const printWindow = window.open('', '_blank');
        
        // Filter items per slot
        const morningItems = invoice.items.filter(item => item.morningQty > 0);
        const afternoonItems = invoice.items.filter(item => item.afternoonQty > 0);
        const returnItems = invoice.items.filter(item => item.returnQty > 0);

        const morningTotal = morningItems.reduce((sum, item) => sum + (item.morningQty * item.price), 0);
        const afternoonTotal = afternoonItems.reduce((sum, item) => sum + (item.afternoonQty * item.price), 0);
        const returnsTotalCalculated = returnItems.reduce((sum, item) => sum + (item.returnQty * item.price), 0);

        let morningHtml = '';
        if (morningItems.length > 0) {
            morningHtml = `
                <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; margin: 8px 0 4px 0; color: #1e3a8a; display: flex; align-items: center; gap: 4px;">Morning Deliveries</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
                    <thead>
                        <tr style="border-bottom: 1px solid #e5e7eb; border-top: 1px solid #e5e7eb;">
                            <th style="text-align: left; padding: 4px 0; font-size: 10px; color: #6b7280; font-weight: 600;">Item</th>
                            <th style="text-align: right; padding: 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; width: 15%;">Qty</th>
                            <th style="text-align: right; padding: 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; width: 25%;">Price</th>
                            <th style="text-align: right; padding: 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; width: 25%;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${morningItems.map(item => `
                            <tr style="border-bottom: 1px dashed #f3f4f6;">
                                <td style="padding: 4px 0; font-size: 11px; font-weight: 500;">${item.productName}</td>
                                <td style="padding: 4px 0; text-align: right; font-size: 11px;">${item.morningQty}</td>
                                <td style="padding: 4px 0; text-align: right; font-size: 11px;">${item.price.toFixed(2)}</td>
                                <td style="padding: 4px 0; text-align: right; font-size: 11px; font-weight: 600;">${(item.morningQty * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td colspan="3" style="text-align: right; font-weight: 600; padding: 6px 0 0 0; font-size: 10px; color: #6b7280;">Morning Subtotal:</td>
                            <td style="text-align: right; font-weight: 700; padding: 6px 0 0 0; font-size: 11px; color: #374151;">${morningTotal.toFixed(2)} LKR</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        let afternoonHtml = '';
        if (afternoonItems.length > 0) {
            afternoonHtml = `
                <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; margin: 12px 0 4px 0; color: #1e3a8a; display: flex; align-items: center; gap: 4px;">Afternoon Deliveries</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
                    <thead>
                        <tr style="border-bottom: 1px solid #e5e7eb; border-top: 1px solid #e5e7eb;">
                            <th style="text-align: left; padding: 4px 0; font-size: 10px; color: #6b7280; font-weight: 600;">Item</th>
                            <th style="text-align: right; padding: 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; width: 15%;">Qty</th>
                            <th style="text-align: right; padding: 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; width: 25%;">Price</th>
                            <th style="text-align: right; padding: 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; width: 25%;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${afternoonItems.map(item => `
                            <tr style="border-bottom: 1px dashed #f3f4f6;">
                                <td style="padding: 4px 0; font-size: 11px; font-weight: 500;">${item.productName}</td>
                                <td style="padding: 4px 0; text-align: right; font-size: 11px;">${item.afternoonQty}</td>
                                <td style="padding: 4px 0; text-align: right; font-size: 11px;">${item.price.toFixed(2)}</td>
                                <td style="padding: 4px 0; text-align: right; font-size: 11px; font-weight: 600;">${(item.afternoonQty * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td colspan="3" style="text-align: right; font-weight: 600; padding: 6px 0 0 0; font-size: 10px; color: #6b7280;">Afternoon Subtotal:</td>
                            <td style="text-align: right; font-weight: 700; padding: 6px 0 0 0; font-size: 11px; color: #374151;">${afternoonTotal.toFixed(2)} LKR</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        let returnsHtml = '';
        if (returnItems.length > 0) {
            returnsHtml = `
                <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; margin: 12px 0 4px 0; color: #1e3a8a; display: flex; align-items: center; gap: 4px;">Returns Received</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
                    <thead>
                        <tr style="border-bottom: 1px solid #e5e7eb; border-top: 1px solid #e5e7eb;">
                            <th style="text-align: left; padding: 4px 0; font-size: 10px; color: #6b7280; font-weight: 600;">Item</th>
                            <th style="text-align: right; padding: 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; width: 15%;">Qty</th>
                            <th style="text-align: right; padding: 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; width: 25%;">Price</th>
                            <th style="text-align: right; padding: 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; width: 25%;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${returnItems.map(item => `
                            <tr style="border-bottom: 1px dashed #f3f4f6;">
                                <td style="padding: 4px 0; font-size: 11px; font-weight: 500;">${item.productName}</td>
                                <td style="padding: 4px 0; text-align: right; font-size: 11px;">${item.returnQty}</td>
                                <td style="padding: 4px 0; text-align: right; font-size: 11px;">${item.price.toFixed(2)}</td>
                                <td style="padding: 4px 0; text-align: right; font-size: 11px; font-weight: 600; color: #1e3a8a;">-${(item.returnQty * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td colspan="3" style="text-align: right; font-weight: 600; padding: 6px 0 0 0; font-size: 10px; color: #6b7280;">Returns Subtotal:</td>
                            <td style="text-align: right; font-weight: 700; padding: 6px 0 0 0; font-size: 11px; color: #1e3a8a;">-${returnsTotalCalculated.toFixed(2)} LKR</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        let specialNoteHtml = '';
        if (invoice.specialNote && invoice.specialNote.trim() !== '') {
            specialNoteHtml = `
                <div style="margin: 12px 0; padding: 8px 10px; border-left: 3px solid #1e3a8a; background-color: #f9fafb; font-size: 11px; border-radius: 0 6px 6px 0; line-height: 1.4; border-top: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6; color: #4b5563;">
                    <strong style="color: #1e3a8a; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px; letter-spacing: 0.5px;">Special Note / Remarks</strong>
                    ${invoice.specialNote}
                </div>
            `;
        }

        printWindow.document.write(`
            <html>
            <head>
                <title>Bill: ${invoice.invoiceNumber}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; width: 80mm; margin: 0 auto; padding: 5px; color: #1f2937; line-height: 1.3; }
                    .header { text-align: center; margin-bottom: 12px; }
                    .header h1 { font-size: 18px; margin: 0 0 3px 0; font-weight: 800; color: #111827; letter-spacing: 0.5px; }
                    .header p { font-size: 10px; margin: 0 0 2px 0; color: #6b7280; }
                    .divider { border-top: 1px solid #e5e7eb; margin: 10px 0; }
                    .info { font-size: 10px; margin-bottom: 12px; line-height: 1.4; background-color: #f9fafb; padding: 8px; border-radius: 8px; border: 1px solid #f3f4f6; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    .info-label { color: #6b7280; font-weight: 500; }
                    .info-value { font-weight: 700; color: #1f2937; }
                    .totals { font-size: 11px; line-height: 1.5; margin-top: 12px; background-color: #f9fafb; padding: 8px; border-radius: 8px; border: 1px solid #f3f4f6; }
                    .totals-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                    .totals-label { color: #4b5563; font-weight: 500; }
                    .totals-value { font-weight: 600; color: #1f2937; }
                    .bold-row { font-size: 12px; font-weight: 800; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #d1d5db; }
                    .bold-row .totals-label { color: #111827; }
                    .bold-row .totals-value { color: #1e3a8a; font-size: 13px; }
                    .footer { text-align: center; font-size: 9px; margin-top: 25px; color: #9ca3af; border-top: 1px dashed #e5e7eb; padding-top: 8px; }
                    @media print {
                        @page {
                            margin: 0;
                            size: auto;
                        }
                        body {
                            width: 76mm;
                            margin: 4mm auto;
                            padding: 0;
                        }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 style="font-size: 19px; font-weight: 900; margin: 0 0 2px 0;">DILUM BAKE HOUSE</h1>
                    <p style="font-size: 10px; color: #4b5563; font-weight: 500; margin: 0 0 4px 0;">39/A, Muruthalawa road, Dehideniya, Peradeniya</p>
                    <p style="font-size: 10px; font-weight: 600; color: #1e3a8a; margin: 0 0 2px 0;">Tel: 0762125472 / 0774334046</p>
                    <p style="font-size: 9px; color: #4b5563; font-weight: 600; margin: 0;">Reg No: මපස/ප්‍රාලේ/යනු/2978</p>
                </div>
                
                <div class="info">
                    <div class="info-row">
                        <span class="info-label">Invoice #</span>
                        <span class="info-value" style="font-family: monospace;">${invoice.invoiceNumber}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date</span>
                        <span class="info-value">${new Date(invoice.date).toLocaleDateString()}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Shop</span>
                        <span class="info-value" style="text-transform: uppercase;">${invoice.shopName}</span>
                    </div>
                    ${invoice.shopPhone ? `
                    <div class="info-row">
                        <span class="info-label">Phone</span>
                        <span class="info-value">${invoice.shopPhone}</span>
                    </div>
                    ` : ''}
                </div>

                ${morningHtml}
                ${afternoonHtml}
                ${returnsHtml}
                
                ${specialNoteHtml}

                <div class="totals">
                    <div class="totals-row">
                        <span class="totals-label">Morning Total:</span>
                        <span class="totals-value">${morningTotal.toFixed(2)} LKR</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">Afternoon Total:</span>
                        <span class="totals-value">${afternoonTotal.toFixed(2)} LKR</span>
                    </div>
                    <div class="totals-row" style="border-top: 1px solid #f3f4f6; padding-top: 2px; margin-top: 2px;">
                        <span class="totals-label" style="font-weight: 600;">Total Delivered:</span>
                        <span class="totals-value" style="font-weight: 700;">${invoice.deliveredTotal.toFixed(2)} LKR</span>
                    </div>
                    <div class="totals-row" style="color: #1e3a8a;">
                        <span class="totals-label" style="color: #1e3a8a;">Less Returns:</span>
                        <span class="totals-value" style="color: #1e3a8a;">-${invoice.returnsTotal.toFixed(2)} LKR</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">Old Outstanding:</span>
                        <span class="totals-value">${invoice.oldBalance.toFixed(2)} LKR</span>
                    </div>
                    
                    <div class="totals-row bold-row">
                        <span class="totals-label">Grand Total:</span>
                        <span class="totals-value">${invoice.grandTotal.toFixed(2)} LKR</span>
                    </div>
                    <div class="totals-row" style="color: #10b981; font-weight: bold; margin-top: 2px;">
                        <span class="totals-label" style="color: #10b981;">Less Paid Today:</span>
                        <span class="totals-value" style="color: #10b981;">-${invoice.amountReceived.toFixed(2)} LKR</span>
                    </div>
                    
                    <div class="totals-row bold-row" style="border-top: 1px solid #111827; padding-top: 4px; margin-top: 4px;">
                        <span class="totals-label" style="text-transform: uppercase; font-size: 11px;">Balance Outstanding:</span>
                        <span class="totals-value" style="font-size: 14px; font-weight: 900; text-decoration: underline; color: #1e3a8a;">${invoice.newBalance.toFixed(2)} LKR</span>
                    </div>
                </div>

                <div class="footer">
                    <p style="font-weight: bold; color: #4b5563;">Thank You For Your Business!</p>
                    <p style="font-size: 8px;">System Generated Invoice</p>
                </div>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const getStatusBadge = (invoice) => {
        const bal = invoice.newBalance || 0;
        const paid = invoice.amountReceived || 0;
        const total = invoice.grandTotal || 0;

        if (bal <= 0) {
            return <Badge variant="success">Paid</Badge>;
        } else if (paid > 0) {
            return <Badge variant="warning">Partially Paid</Badge>;
        } else {
            return <Badge variant="danger">Unpaid</Badge>;
        }
    };

    const columns = [
        {
            key: 'invoiceNumber',
            label: 'Invoice #',
            render: (row) => <span className="font-mono text-xs font-semibold">{row.invoiceNumber}</span>,
        },
        {
            key: 'shopName',
            label: 'Shop / Phone',
            render: (row) => (
                <div>
                    <div className="font-semibold text-gray-800">{row.shopName}</div>
                    {row.shopPhone && <div className="text-xs text-gray-500">{row.shopPhone}</div>}
                </div>
            )
        },
        {
            key: 'delivered',
            label: 'Delivered',
            render: (row) => <span className="font-medium">{formatPrice(row.deliveredTotal)}</span>,
        },
        {
            key: 'returns',
            label: 'Returns',
            render: (row) => <span className="font-medium text-red-500">-{formatPrice(row.returnsTotal)}</span>,
        },
        {
            key: 'oldBalance',
            label: 'Old Bal',
            render: (row) => <span className="font-medium text-gray-500">{formatPrice(row.oldBalance)}</span>,
        },
        {
            key: 'grandTotal',
            label: 'Grand Total',
            render: (row) => <span className="font-bold text-gray-900">{formatPrice(row.grandTotal)}</span>,
        },
        {
            key: 'received',
            label: 'Paid Today',
            render: (row) => (
                <div className="flex items-center gap-1.5 font-bold text-green-600">
                    <span>{formatPrice(row.amountReceived)}</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPaymentModal(row);
                        }}
                        className="p-1 hover:bg-green-50 rounded transition text-indigo-600 hover:text-indigo-800"
                        title="Update Payment Amount"
                    >
                        <Edit3 size={12} />
                    </button>
                </div>
            )
        },
        {
            key: 'newBalance',
            label: 'New Bal Due',
            render: (row) => (
                <span className={`font-bold ${row.newBalance > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                    {formatPrice(row.newBalance)}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => getStatusBadge(row)
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '160px',
            render: (row) => (
                <div className="flex gap-1 justify-end">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(row);
                        }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        title="Print Invoice"
                    >
                        <Printer size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleShareWhatsApp(row);
                        }}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                        title="Send WhatsApp Invoice"
                    >
                        <MessageSquare size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(row);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Download PDF"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/bakery/invoices/${row._id}/edit`);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit Invoice"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeletingInvoice(row);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete Invoice"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bakery Daily Invoices"
                description="Manage daily deliveries, returns, and outstanding payments."
                actions={
                    <Button onClick={() => navigate('/bakery/invoices/new')} className="flex items-center gap-2">
                        <Plus size={18} />
                        New Invoice
                    </Button>
                }
            />

            {/* Daily KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label="Today's Deliveries"
                    value={formatPrice(summary.totalDelivered)}
                    icon={ArrowRight}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-50"
                />
                <KpiCard
                    label="Today's Returns"
                    value={formatPrice(summary.totalReturns)}
                    icon={RotateCcw}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-50"
                />
                <KpiCard
                    label="Payments Collected"
                    value={formatPrice(summary.totalReceived)}
                    icon={DollarSign}
                    iconColor="text-green-600"
                    iconBg="bg-green-50"
                />
                <KpiCard
                    label="Net Balance Added"
                    value={formatPrice(summary.totalOutstanding)}
                    icon={AlertCircle}
                    iconColor={summary.totalOutstanding >= 0 ? "text-amber-600" : "text-emerald-600"}
                    iconBg={summary.totalOutstanding >= 0 ? "bg-amber-50" : "bg-emerald-50"}
                />
            </div>

            <Card className="p-6">
                <div className="flex flex-col lg:flex-row gap-4 mb-6 lg:items-end">
                    <div className="relative flex-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Search Shop</label>
                        <div className="relative">
                            <Input
                                placeholder="Search by shop name..."
                                value={shopSearch}
                                onChange={(e) => setShopSearch(e.target.value)}
                                className="pl-10 text-sm py-1.5"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex gap-3 w-full lg:w-auto">
                        <div className="flex-1 lg:w-44 lg:flex-none">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">From Date</label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="pl-9 text-sm py-1.5"
                                />
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="flex-1 lg:w-44 lg:flex-none">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">To Date</label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="pl-9 text-sm py-1.5"
                                />
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                ) : invoices.length === 0 ? (
                    <EmptyState
                        title="No Invoices Found"
                        description={fromDate === toDate ? `There are no bakery invoices recorded for ${new Date(fromDate).toLocaleDateString()}.` : `There are no bakery invoices recorded between ${new Date(fromDate).toLocaleDateString()} and ${new Date(toDate).toLocaleDateString()}.`}
                    />
                ) : (
                    <Table columns={columns} data={invoices} />
                )}
            </Card>

            {/* Quick Payment update modal */}
            <Modal
                isOpen={!!paymentInvoice}
                onClose={() => setPaymentInvoice(null)}
                title="Update Daily Payment"
            >
                <form onSubmit={handleQuickPaymentSubmit} className="p-6 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                        <p className="text-sm font-semibold text-gray-700">Shop: <span className="font-bold text-gray-900">{paymentInvoice?.shopName}</span></p>
                        <p className="text-sm font-semibold text-gray-700">Date: <span className="text-gray-900">{paymentInvoice && new Date(paymentInvoice.date).toLocaleDateString()}</span></p>
                        <p className="text-sm font-semibold text-gray-700">Invoice Total: <span className="font-bold text-indigo-600">{paymentInvoice && formatPrice(paymentInvoice.grandTotal)}</span></p>
                    </div>

                    <Input
                        label="Amount Received (LKR)"
                        type="number"
                        step="0.01"
                        min="0"
                        value={quickAmountReceived}
                        onChange={(e) => setQuickAmountReceived(e.target.value)}
                        required
                        autoFocus
                    />

                    {paymentInvoice && (
                        <div className="text-right text-xs text-gray-500 font-semibold">
                            Remaining balance will be:{' '}
                            <span className="font-bold text-red-600">
                                {formatPrice(paymentInvoice.grandTotal - (Number(quickAmountReceived) || 0))}
                            </span>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setPaymentInvoice(null)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={updateInvoice.isPending}>
                            Save Payment
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete confirm dialog */}
            <ConfirmDialog
                isOpen={!!deletingInvoice}
                onClose={() => setDeletingInvoice(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Invoice"
                message={`Are you sure you want to delete invoice "${deletingInvoice?.invoiceNumber}"? This will reverse the outstanding balance changes for "${deletingInvoice?.shopName}".`}
                confirmText="Delete"
                loading={deleteInvoice.isPending}
            />

            {/* WhatsApp Share Modal */}
            <Modal
                isOpen={isWhatsappOpen}
                onClose={() => setIsWhatsappOpen(false)}
                title="Share Invoice via WhatsApp"
            >
                <div className="p-6 space-y-6">
                    <div>
                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-1">Invoice: #{whatsappInvoice?.invoiceNumber}</h4>
                        <p className="text-xs text-gray-500">Choose how you want to share the invoice with <span className="font-bold text-gray-800 uppercase">{whatsappInvoice?.shopName}</span>.</p>
                    </div>

                    {/* Option 1: Share PDF File */}
                    <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-xl space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700">
                                <FileText size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h5 className="text-sm font-bold text-gray-800">Option 1: Share PDF Invoice File</h5>
                                <p className="text-xs text-gray-500 mt-0.5">Generates a clean PDF file and opens your device share menu to select WhatsApp.</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => {
                                handleShareWhatsAppPdf();
                                setIsWhatsappOpen(false);
                            }}
                            disabled={isGeneratingPdf || !pdfFile}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isGeneratingPdf ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Preparing PDF file...
                                </>
                            ) : (
                                <>
                                    <Download size={14} />
                                    Generate & Share PDF File
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Option 2: Share Text Message */}
                    <div className="p-4 border border-green-100 bg-green-50/20 rounded-xl space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 text-green-700">
                                <MessageSquare size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h5 className="text-sm font-bold text-gray-800">Option 2: Share Text Receipt</h5>
                                <p className="text-xs text-gray-500 mt-0.5">Pre-fills a complete text summary directly to the target WhatsApp chat.</p>
                            </div>
                        </div>

                        {/* Registered numbers list */}
                        {whatsappInvoice?.shopPhone && (
                            <div className="space-y-2 pt-2 border-t border-green-100">
                                <label className="block text-[10px] font-bold text-green-800/60 uppercase tracking-wider">Select Contact Number</label>
                                <div className="space-y-1.5">
                                    {whatsappInvoice.shopPhone.split(',').map(n => n.trim()).filter(Boolean).map((num, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                triggerWhatsAppRedirect(num, whatsappInvoice);
                                                setIsWhatsappOpen(false);
                                            }}
                                            className="w-full flex items-center justify-between p-2.5 border border-green-200 bg-white hover:bg-green-50 rounded-lg transition text-left"
                                        >
                                            <div className="flex items-center gap-2 text-green-800">
                                                <Phone size={13} />
                                                <span className="font-semibold text-xs">{num}</span>
                                            </div>
                                            <span className="text-[9px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold uppercase">Send</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom Phone Number input */}
                        <div className="space-y-2 border-t border-green-100 pt-3">
                            <label className="block text-[10px] font-bold text-green-800/60 uppercase tracking-wider">Send to Another Number</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        placeholder="e.g. 0762125472"
                                        value={customWhatsAppPhone}
                                        onChange={(e) => setCustomWhatsAppPhone(e.target.value)}
                                        className="pl-9 py-1 text-xs"
                                    />
                                    <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                                <Button
                                    disabled={!customWhatsAppPhone.trim()}
                                    onClick={() => {
                                        triggerWhatsAppRedirect(customWhatsAppPhone, whatsappInvoice);
                                        setIsWhatsappOpen(false);
                                    }}
                                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3"
                                >
                                    Send
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => setIsWhatsappOpen(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
