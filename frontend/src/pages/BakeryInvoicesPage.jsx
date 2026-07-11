import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Plus, Loader2, Calendar, FileText, CheckCircle, AlertCircle, Eye,
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
import { bakeryApi } from '../features/bakery/bakeryApi';
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
    const [selectedShopContacts, setSelectedShopContacts] = useState([]);
    const [smsRecipients, setSmsRecipients] = useState([]);
    const [sendToInvoicePhone, setSendToInvoicePhone] = useState(false);

    // Modal state for delete confirm
    const [deletingInvoice, setDeletingInvoice] = useState(null);

    // Modal state for view detail
    const [viewingInvoice, setViewingInvoice] = useState(null);

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

        // Gather all phone numbers to send SMS to
        const finalSmsRecipients = [...smsRecipients];
        if (sendToInvoicePhone && paymentInvoice.shopPhone) {
            const extraPhones = paymentInvoice.shopPhone.split(',').map(p => p.trim()).filter(Boolean);
            extraPhones.forEach(phone => {
                if (!finalSmsRecipients.includes(phone)) {
                    finalSmsRecipients.push(phone);
                }
            });
        }

        updateInvoice.mutate(
            {
                id: paymentInvoice._id,
                data: {
                    amountReceived: amt,
                    smsRecipients: finalSmsRecipients
                }
            },
            {
                onSuccess: () => {
                    setPaymentInvoice(null);
                    setQuickAmountReceived('');
                    setSelectedShopContacts([]);
                    setSmsRecipients([]);
                    setSendToInvoicePhone(false);
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
    const handleOpenPaymentModal = async (invoice) => {
        setPaymentInvoice(invoice);
        setQuickAmountReceived(String(invoice.amountReceived || 0));
        setSelectedShopContacts([]);
        setSmsRecipients([]);
        setSendToInvoicePhone(false);

        if (invoice && invoice.shopName) {
            try {
                const res = await bakeryApi.suggestShops(invoice.shopName);
                const exactMatch = res?.data?.find(s => s.name.toLowerCase() === invoice.shopName.trim().toLowerCase());
                if (exactMatch) {
                    const contacts = exactMatch.contacts || [];
                    setSelectedShopContacts(contacts);
                    setSmsRecipients(contacts.map(c => c.phone).filter(Boolean));
                }
            } catch (err) {
                console.error('Error fetching shop contacts for quick payment modal', err);
            }
        }
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
        element.style.padding = '15px';
        element.style.fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        element.style.lineHeight = '1.5';
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
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.02);">
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
                                <td style="font-weight: 600; text-align: left; color: #0f172a;">${item.productName}</td>
                                <td style="text-align: right; font-weight: 600; color: #1e3a8a;">${item.morningQty}</td>
                                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: 700; color: #0f172a;">${(item.morningQty * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr style="background-color: #f8fafc;">
                            <td colspan="3" style="text-align: right; font-weight: 800; border-top: 1.5px solid #cbd5e1 !important; padding: 10px 14px !important; color: #475569; font-size: 11px;">MORNING DELIVERIES TOTAL:</td>
                            <td style="text-align: right; font-weight: 800; color: #1e3a8a; border-top: 1.5px solid #cbd5e1 !important; padding: 10px 14px !important; font-size: 13px;">${morningTotal.toFixed(2)} LKR</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        if (afternoonItems.length > 0) {
            itemsHtml += `
                <div class="section-title">Afternoon Deliveries</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.02);">
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
                                <td style="font-weight: 600; text-align: left; color: #0f172a;">${item.productName}</td>
                                <td style="text-align: right; font-weight: 600; color: #1e3a8a;">${item.afternoonQty}</td>
                                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: 700; color: #0f172a;">${(item.afternoonQty * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr style="background-color: #f8fafc;">
                            <td colspan="3" style="text-align: right; font-weight: 800; border-top: 1.5px solid #cbd5e1 !important; padding: 10px 14px !important; color: #475569; font-size: 11px;">AFTERNOON DELIVERIES TOTAL:</td>
                            <td style="text-align: right; font-weight: 800; color: #1e3a8a; border-top: 1.5px solid #cbd5e1 !important; padding: 10px 14px !important; font-size: 13px;">${afternoonTotal.toFixed(2)} LKR</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        if (returnItems.length > 0) {
            itemsHtml += `
                <div class="section-title" style="color: #b91c1c; border-left-color: #b91c1c;">Returns Received</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.02);">
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
                                <td style="font-weight: 600; text-align: left; color: #0f172a;">${item.productName}</td>
                                <td style="text-align: right; font-weight: 600; color: #b91c1c;">${item.returnQty}</td>
                                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: 700; color: #b91c1c;">-${(item.returnQty * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr style="background-color: #fef2f2;">
                            <td colspan="3" style="text-align: right; font-weight: 800; border-top: 1.5px solid #fca5a5 !important; padding: 10px 14px !important; color: #b91c1c; font-size: 11px;">RETURNS TOTAL:</td>
                            <td style="text-align: right; font-weight: 800; color: #b91c1c; border-top: 1.5px solid #fca5a5 !important; padding: 10px 14px !important; font-size: 13px;">-${returnsTotal.toFixed(2)} LKR</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        let specialNoteHtml = '';
        if (invoice.specialNote && invoice.specialNote.trim() !== '') {
            specialNoteHtml = `
                <div style="border-left: 4px solid #1e3a8a; background-color: #f8fafc; padding: 15px; border-radius: 0 8px 8px 0; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; margin-top: 10px; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.02);">
                    <strong class="text-primary" style="text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 6px; letter-spacing: 0.5px; color: #1e3a8a;">Special Note / Remarks</strong>
                    <span style="font-size: 12px; color: #475569; line-height: 1.5; display: block; font-style: italic;">"${invoice.specialNote}"</span>
                </div>
            `;
        }

        element.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                #pdf-temp-container {
                    background-color: #ffffff !important;
                    color: #1e293b !important;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                }
                #pdf-temp-container * {
                    box-sizing: border-box !important;
                }
                #pdf-temp-container th {
                    background-color: #f8fafc !important;
                    color: #475569 !important;
                    font-weight: 700 !important;
                    font-size: 11px !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    padding: 10px 14px !important;
                    border-bottom: 2px solid #e2e8f0 !important;
                }
                #pdf-temp-container td {
                    padding: 10px 14px !important;
                    font-size: 12px !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                    color: #334155 !important;
                }
                #pdf-temp-container .section-title {
                    font-size: 13px !important;
                    font-weight: 800 !important;
                    text-transform: uppercase !important;
                    color: #1e3a8a !important;
                    border-left: 3.5px solid #1e3a8a !important;
                    padding-left: 10px !important;
                    margin-top: 30px !important;
                    margin-bottom: 12px !important;
                    letter-spacing: 0.5px !important;
                }
                #pdf-temp-container .text-primary {
                    color: #1e3a8a !important;
                    font-weight: 700 !important;
                }
                #pdf-temp-container .text-success {
                    color: #16a34a !important;
                    font-weight: 700 !important;
                }
                #pdf-temp-container .text-danger {
                    color: #dc2626 !important;
                    font-weight: 700 !important;
                }
            </style>

            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); color: #ffffff; padding: 25px 30px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div>
                    <h1 style="font-size: 28px; font-weight: 900; margin: 0 0 4px 0; letter-spacing: 1px;">DILUM BAKE HOUSE</h1>
                    <p style="font-size: 11px; color: #93c5fd; margin: 0 0 2px 0; font-weight: 500; opacity: 0.95;">39/A, Muruthalawa road, Dehideniya, Peradeniya</p>
                    <p style="font-size: 11px; color: #93c5fd; margin: 0 0 2px 0; font-weight: 500; opacity: 0.95;">Tel: 0762125472 / 0774334046</p>
                    <p style="font-size: 10px; color: #ffffff; margin: 6px 0 0 0; font-weight: 700; background-color: rgba(255,255,255,0.15); padding: 3px 8px; border-radius: 6px; display: inline-block;">Reg No: මපස/ප්‍රාලේ/යනු/2978</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="font-size: 26px; font-weight: 900; margin: 0 0 8px 0; letter-spacing: 1.5px; color: #ffffff;">INVOICE</h2>
                    <div style="font-size: 11px; background-color: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; text-align: left; min-width: 200px; display: inline-block; backdrop-filter: blur(4px);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; gap: 20px;">
                            <span style="color: #93c5fd;">Invoice No:</span>
                            <span style="font-weight: 700; color: #ffffff;">${invoice.invoiceNumber}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; gap: 20px;">
                            <span style="color: #93c5fd;">Date:</span>
                            <span style="font-weight: 700; color: #ffffff;">${new Date(invoice.date).toLocaleDateString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 20px;">
                            <span style="color: #93c5fd;">Status:</span>
                            <span style="font-weight: 800; color: ${invoice.newBalance <= 0 ? '#4ade80' : '#f87171'}; text-transform: uppercase;">${invoice.newBalance <= 0 ? 'Paid' : 'Unpaid'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px; border-left: 4px solid #1e3a8a; background-color: #f8fafc; border-radius: 0 8px 8px 0; padding: 15px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.02);">
                <h3 style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.5px;">Billed To (Customer Details)</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                    <div>
                        <div style="font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase;">${invoice.shopName}</div>
                        ${invoice.shopPhone ? `
                        <div style="font-size: 12px; color: #475569; margin-top: 4px;">
                            <span>Phone:</span> <span style="font-weight: 700; color: #1e3a8a;">${invoice.shopPhone}</span>
                        </div>` : ''}
                    </div>
                    <div style="text-align: right; font-size: 11px; color: #64748b; max-width: 250px; font-style: italic;">
                        Outstanding balance carries forward to the next billing cycle.
                    </div>
                </div>
            </div>

            ${itemsHtml}

            <div style="display: flex; gap: 25px; justify-content: space-between; margin-top: 30px; align-items: flex-start; page-break-inside: avoid;">
                <!-- Left: Special Notes -->
                <div style="flex: 1; min-width: 250px;">
                    ${specialNoteHtml}
                </div>

                <!-- Right: Calculation Box -->
                <div style="width: 340px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; font-size: 12px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
                        <span>Morning Total:</span>
                        <span style="font-weight: 600; color: #1e293b;">${morningTotal.toFixed(2)} LKR</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
                        <span>Afternoon Total:</span>
                        <span style="font-weight: 600; color: #1e293b;">${afternoonTotal.toFixed(2)} LKR</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: 800; background-color: #eff6ff; border-radius: 6px; padding: 6px 10px; color: #1e3a8a;">
                        <span>Today Total (Delivered):</span>
                        <span>${(morningTotal + afternoonTotal).toFixed(2)} LKR</span>
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
                    <div style="display: flex; justify-content: space-between; font-weight: 950; font-size: 16px; padding: 6px 10px; background-color: #fef2f2; border-radius: 6px; color: #dc2626;">
                        <span>Net Outstanding Due:</span>
                        <span>${invoice.newBalance.toFixed(2)} LKR</span>
                    </div>
                </div>
            </div>

            <div style="text-align: center; font-size: 10px; margin-top: 50px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; font-style: italic; letter-spacing: 0.5px;">
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

    // Direct download PDF (A4)
    const handleDownloadPdf = async (invoice) => {
        const toastId = toast.loading('Generating PDF...');
        try {
            const blob = await generateInvoicePdfBlob(invoice);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${invoice.invoiceNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success('PDF downloaded!', { id: toastId });
        } catch (err) {
            console.error('PDF download failed', err);
            toast.error('PDF generation failed.', { id: toastId });
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
            }).then(() => {
                toast.success("Native share menu opened!");
            }).catch(err => {
                if (err.name !== 'AbortError') {
                    toast.error("Sharing failed.");
                    console.error(err);
                }
            });
        } else {
            toast.info("PDF downloaded! You can now drag & drop this file into your WhatsApp chat.");
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

        const morningTotal = morningItems.reduce((s, i) => s + i.morningQty * i.price, 0);
        const afternoonTotal = afternoonItems.reduce((s, i) => s + i.afternoonQty * i.price, 0);
        const returnTotal = returnItems.reduce((s, i) => s + i.returnQty * i.price, 0);
        const todayTotal = morningTotal + afternoonTotal;

        text += `-------------------------------------\n`;
        text += `*BILL SUMMARY:*\n`;
        if (morningTotal > 0) text += `☀️ Morning Total: LKR ${morningTotal.toFixed(2)}\n`;
        if (afternoonTotal > 0) text += `🌤️ Afternoon Total: LKR ${afternoonTotal.toFixed(2)}\n`;
        text += `📦 *Today Total (Delivered): LKR ${todayTotal.toFixed(2)}*\n`;
        if (returnTotal > 0) text += `↩️ Less Returns: LKR ${returnTotal.toFixed(2)}\n`;
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
        setWhatsappInvoice(invoice);
        setCustomWhatsAppPhone('');
        setIsWhatsappOpen(true);
    };

    // Receipt print trigger
    const handlePrint = (invoice) => {
        const printWindow = window.open('', '_blank');
        
        const morningItems = invoice.items.filter(item => item.morningQty > 0);
        const afternoonItems = invoice.items.filter(item => item.afternoonQty > 0);
        const returnItems = invoice.items.filter(item => item.returnQty > 0);

        const morningTotal = morningItems.reduce((sum, item) => sum + (item.morningQty * item.price), 0);
        const afternoonTotal = afternoonItems.reduce((sum, item) => sum + (item.afternoonQty * item.price), 0);
        const returnsTotal = returnItems.reduce((sum, item) => sum + (item.returnQty * item.price), 0);

        let morningHtml = '';
        if (morningItems.length > 0) {
            morningHtml = `
                <div class="section-title">Morning Deliveries</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
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
                                <td style="font-weight: 600; text-align: left; color: #0f172a;">${item.productName}</td>
                                <td style="text-align: right; font-weight: 600; color: #1e3a8a;">${item.morningQty}</td>
                                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: 700; color: #0f172a;">${(item.morningQty * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr style="background-color: #f8fafc;">
                            <td colspan="3" style="text-align: right; font-weight: 800; border-top: 1.5px solid #cbd5e1 !important; padding: 10px 14px !important; color: #475569; font-size: 11px;">MORNING DELIVERIES TOTAL:</td>
                            <td style="text-align: right; font-weight: 800; color: #1e3a8a; border-top: 1.5px solid #cbd5e1 !important; padding: 10px 14px !important; font-size: 13px;">${morningTotal.toFixed(2)} LKR</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        let afternoonHtml = '';
        if (afternoonItems.length > 0) {
            afternoonHtml = `
                <div class="section-title">Afternoon Deliveries</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
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
                                <td style="font-weight: 600; text-align: left; color: #0f172a;">${item.productName}</td>
                                <td style="text-align: right; font-weight: 600; color: #1e3a8a;">${item.afternoonQty}</td>
                                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: 700; color: #0f172a;">${(item.afternoonQty * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr style="background-color: #f8fafc;">
                            <td colspan="3" style="text-align: right; font-weight: 800; border-top: 1.5px solid #cbd5e1 !important; padding: 10px 14px !important; color: #475569; font-size: 11px;">AFTERNOON DELIVERIES TOTAL:</td>
                            <td style="text-align: right; font-weight: 800; color: #1e3a8a; border-top: 1.5px solid #cbd5e1 !important; padding: 10px 14px !important; font-size: 13px;">${afternoonTotal.toFixed(2)} LKR</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        let returnsHtml = '';
        if (returnItems.length > 0) {
            returnsHtml = `
                <div class="section-title" style="color: #b91c1c; border-left-color: #b91c1c;">Returns Received</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
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
                                <td style="font-weight: 600; text-align: left; color: #0f172a;">${item.productName}</td>
                                <td style="text-align: right; font-weight: 600; color: #b91c1c;">${item.returnQty}</td>
                                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: 700; color: #b91c1c;">-${(item.returnQty * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr style="background-color: #fef2f2;">
                            <td colspan="3" style="text-align: right; font-weight: 800; border-top: 1.5px solid #fca5a5 !important; padding: 10px 14px !important; color: #b91c1c; font-size: 11px;">RETURNS TOTAL:</td>
                            <td style="text-align: right; font-weight: 800; color: #b91c1c; border-top: 1.5px solid #fca5a5 !important; padding: 10px 14px !important; font-size: 13px;">-${returnsTotal.toFixed(2)} LKR</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        let specialNoteHtml = '';
        if (invoice.specialNote && invoice.specialNote.trim() !== '') {
            specialNoteHtml = `
                <div style="border-left: 4px solid #1e3a8a; background-color: #f8fafc; padding: 15px; border-radius: 0 8px 8px 0; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; margin-top: 10px;">
                    <strong style="text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 6px; letter-spacing: 0.5px; color: #1e3a8a;">Special Note / Remarks</strong>
                    <span style="font-size: 12px; color: #475569; line-height: 1.5; display: block; font-style: italic;">"${invoice.specialNote}"</span>
                </div>
            `;
        }

        printWindow.document.write(`
            <html>
            <head>
                <title>Invoice: ${invoice.invoiceNumber}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        color: #1e293b;
                        line-height: 1.5;
                        padding: 20px;
                        max-width: 210mm;
                        margin: 0 auto;
                        box-sizing: border-box;
                    }
                    th {
                        background-color: #f8fafc !important;
                        color: #475569 !important;
                        font-weight: 700 !important;
                        font-size: 11px !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.5px !important;
                        padding: 10px 14px !important;
                        border-bottom: 2px solid #e2e8f0 !important;
                    }
                    td {
                        padding: 10px 14px !important;
                        font-size: 12px !important;
                        border-bottom: 1px solid #f1f5f9 !important;
                        color: #334155 !important;
                    }
                    .section-title {
                        font-size: 13px !important;
                        font-weight: 800 !important;
                        text-transform: uppercase !important;
                        color: #1e3a8a !important;
                        border-left: 3.5px solid #1e3a8a !important;
                        padding-left: 10px !important;
                        margin-top: 30px !important;
                        margin-bottom: 12px !important;
                        letter-spacing: 0.5px !important;
                    }
                    @media print {
                        body {
                            padding: 10mm;
                            max-width: 100%;
                        }
                        @page {
                            margin: 10mm;
                            size: A4 portrait;
                        }
                    }
                </style>
            </head>
            <body>
                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); color: #ffffff; padding: 25px 30px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <div>
                        <h1 style="font-size: 28px; font-weight: 900; margin: 0 0 4px 0; letter-spacing: 1px; color: #ffffff;">DILUM BAKE HOUSE</h1>
                        <p style="font-size: 11px; color: #93c5fd; margin: 0 0 2px 0; font-weight: 500; opacity: 0.95;">39/A, Muruthalawa road, Dehideniya, Peradeniya</p>
                        <p style="font-size: 11px; color: #93c5fd; margin: 0 0 2px 0; font-weight: 500; opacity: 0.95;">Tel: 0762125472 / 0774334046</p>
                        <p style="font-size: 10px; color: #ffffff; margin: 6px 0 0 0; font-weight: 700; background-color: rgba(255,255,255,0.15); padding: 3px 8px; border-radius: 6px; display: inline-block;">Reg No: මපස/ප්‍රාලේ/යනු/2978</p>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="font-size: 26px; font-weight: 900; margin: 0 0 8px 0; letter-spacing: 1.5px; color: #ffffff;">INVOICE</h2>
                        <div style="font-size: 11px; background-color: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; text-align: left; min-width: 200px; display: inline-block; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; gap: 20px;">
                                <span style="color: #93c5fd;">Invoice No:</span>
                                <span style="font-weight: 700; color: #ffffff;">${invoice.invoiceNumber}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; gap: 20px;">
                                <span style="color: #93c5fd;">Date:</span>
                                <span style="font-weight: 700; color: #ffffff;">${new Date(invoice.date).toLocaleDateString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; gap: 20px;">
                                <span style="color: #93c5fd;">Status:</span>
                                <span style="font-weight: 800; color: ${invoice.newBalance <= 0 ? '#4ade80' : '#f87171'}; text-transform: uppercase;">${invoice.newBalance <= 0 ? 'Paid' : 'Unpaid'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 25px; border-left: 4px solid #1e3a8a; background-color: #f8fafc; border-radius: 0 8px 8px 0; padding: 15px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <h3 style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.5px;">Billed To (Customer Details)</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                        <div>
                            <div style="font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase;">${invoice.shopName}</div>
                            ${invoice.shopPhone ? `
                            <div style="font-size: 12px; color: #475569; margin-top: 4px;">
                                <span>Phone:</span> <span style="font-weight: 700; color: #1e3a8a;">${invoice.shopPhone}</span>
                            </div>` : ''}
                        </div>
                        <div style="text-align: right; font-size: 11px; color: #64748b; max-width: 250px; font-style: italic;">
                            Outstanding balance carries forward to the next billing cycle.
                        </div>
                    </div>
                </div>

                ${morningHtml}
                ${afternoonHtml}
                ${returnsHtml}

                <div style="display: flex; gap: 25px; justify-content: space-between; margin-top: 30px; align-items: flex-start; page-break-inside: avoid;">
                    <!-- Left: Special Notes -->
                    <div style="flex: 1; min-width: 250px;">
                        ${specialNoteHtml}
                    </div>

                    <!-- Right: Calculation Box -->
                    <div style="width: 340px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
                            <span>Morning Total:</span>
                            <span style="font-weight: 600; color: #1e293b;">${morningTotal.toFixed(2)} LKR</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
                            <span>Afternoon Total:</span>
                            <span style="font-weight: 600; color: #1e293b;">${afternoonTotal.toFixed(2)} LKR</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: 800; background-color: #eff6ff; border-radius: 6px; padding: 6px 10px; color: #1e3a8a; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                            <span>Today Total (Delivered):</span>
                            <span>${(morningTotal + afternoonTotal).toFixed(2)} LKR</span>
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
                            <span style="color: #1e3a8a;">${invoice.grandTotal.toFixed(2)} LKR</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 800; font-size: 14px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">
                            <span>Amount Paid Today:</span>
                            <span style="color: #16a34a;">-${invoice.amountReceived.toFixed(2)} LKR</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: 950; font-size: 16px; padding: 6px 10px; background-color: #fef2f2; border-radius: 6px; color: #dc2626; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                            <span>Net Outstanding Due:</span>
                            <span>${invoice.newBalance.toFixed(2)} LKR</span>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; font-size: 10px; margin-top: 50px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; font-style: italic; letter-spacing: 0.5px;">
                    Delight in every bite! Thank you for your continued partnership with Dilum Bake House.
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
                            setViewingInvoice(row);
                        }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        title="View Details"
                    >
                        <Eye size={16} />
                    </button>
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
                            handleDownloadPdf(row);
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
                    <div className="flex gap-2.5 w-full lg:w-auto justify-start">
                        <div className="flex-1 sm:w-44 sm:flex-initial">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">From Date</label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="pl-2 sm:pl-9 text-xs sm:text-sm py-1"
                                />
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none hidden sm:block" />
                            </div>
                        </div>
                        <div className="flex-1 sm:w-44 sm:flex-initial">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">To Date</label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="pl-2 sm:pl-9 text-xs sm:text-sm py-1"
                                />
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none hidden sm:block" />
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

                    {/* SMS selection in quick payment modal */}
                    <div className="space-y-3 border-t pt-3">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                            Send Real-Time SMS Notification
                        </label>

                        {selectedShopContacts.length === 0 ? (
                            <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-xl flex items-center gap-2">
                                <AlertCircle size={14} className="flex-shrink-0" />
                                <span>No contacts configured for this shop. Use Invoice Phone checklist below.</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
                                {selectedShopContacts.map((contact, index) => {
                                    const isChecked = smsRecipients.includes(contact.phone);
                                    return (
                                        <label
                                            key={index}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition select-none ${
                                                isChecked
                                                    ? 'bg-indigo-50/50 border-indigo-250 text-indigo-900 font-semibold'
                                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSmsRecipients([...smsRecipients, contact.phone]);
                                                    } else {
                                                        setSmsRecipients(smsRecipients.filter(phone => phone !== contact.phone));
                                                    }
                                                }}
                                            />
                                            <div className="flex justify-between w-full items-center min-w-0">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold truncate">
                                                        {contact.name || 'Unnamed'} <span className="text-[10px] text-gray-400 font-normal uppercase">({contact.role || 'Contact'})</span>
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-mono">{contact.phone}</span>
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {paymentInvoice?.shopPhone && (
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600 font-semibold">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                    checked={sendToInvoicePhone}
                                    onChange={(e) => setSendToInvoicePhone(e.target.checked)}
                                />
                                <span>
                                    Send to Invoice Phone(s): <span className="font-mono text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100/50">{paymentInvoice.shopPhone}</span>
                                </span>
                            </label>
                        )}
                    </div>

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

            {/* View Details Modal */}
            <Modal
                isOpen={!!viewingInvoice}
                onClose={() => setViewingInvoice(null)}
                title="Invoice Details"
            >
                {viewingInvoice && (() => {
                    const morningItems = viewingInvoice.items.filter(item => item.morningQty > 0);
                    const afternoonItems = viewingInvoice.items.filter(item => item.afternoonQty > 0);
                    const returnItems = viewingInvoice.items.filter(item => item.returnQty > 0);

                    const morningTotal = morningItems.reduce((sum, item) => sum + (item.morningQty * item.price), 0);
                    const afternoonTotal = afternoonItems.reduce((sum, item) => sum + (item.afternoonQty * item.price), 0);
                    const returnsTotalCalculated = returnItems.reduce((sum, item) => sum + (item.returnQty * item.price), 0);
                    const todayTotal = morningTotal + afternoonTotal;

                    return (
                        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                            {/* Metadata */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Invoice No</div>
                                    <div className="font-mono font-bold text-sm text-indigo-600">{viewingInvoice.invoiceNumber}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Date</div>
                                    <div className="font-bold text-sm text-gray-800">{new Date(viewingInvoice.date).toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Shop Name</div>
                                    <div className="font-bold text-sm text-gray-850 uppercase">{viewingInvoice.shopName}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Phone</div>
                                    <div className="font-bold text-sm text-gray-800">{viewingInvoice.shopPhone || 'N/A'}</div>
                                </div>
                            </div>

                            {/* Morning Table */}
                            {morningItems.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-bold text-indigo-700 text-xs uppercase tracking-wider">Morning Deliveries</h4>
                                    <div className="border rounded-xl overflow-hidden">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-indigo-50/50 text-indigo-900 font-bold uppercase border-b">
                                                <tr>
                                                    <th className="p-2.5">Item</th>
                                                    <th className="p-2.5 text-right">Price</th>
                                                    <th className="p-2.5 text-right">Qty</th>
                                                    <th className="p-2.5 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {morningItems.map((item, i) => (
                                                    <tr key={i} className="hover:bg-gray-50/50">
                                                        <td className="p-2.5 font-semibold text-gray-800">{item.productName}</td>
                                                        <td className="p-2.5 text-right text-gray-600">{item.price.toFixed(2)}</td>
                                                        <td className="p-2.5 text-right text-gray-900 font-medium">{item.morningQty}</td>
                                                        <td className="p-2.5 text-right font-bold text-gray-800">{(item.morningQty * item.price).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-indigo-50/10 font-bold">
                                                    <td colSpan="3" className="p-2.5 text-right text-gray-500">Morning Subtotal:</td>
                                                    <td className="p-2.5 text-right text-indigo-700">{(morningTotal).toFixed(2)} LKR</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Afternoon Table */}
                            {afternoonItems.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-bold text-indigo-700 text-xs uppercase tracking-wider">Afternoon Deliveries</h4>
                                    <div className="border rounded-xl overflow-hidden">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-indigo-50/50 text-indigo-900 font-bold uppercase border-b">
                                                <tr>
                                                    <th className="p-2.5">Item</th>
                                                    <th className="p-2.5 text-right">Price</th>
                                                    <th className="p-2.5 text-right">Qty</th>
                                                    <th className="p-2.5 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {afternoonItems.map((item, i) => (
                                                    <tr key={i} className="hover:bg-gray-50/50">
                                                        <td className="p-2.5 font-semibold text-gray-800">{item.productName}</td>
                                                        <td className="p-2.5 text-right text-gray-600">{item.price.toFixed(2)}</td>
                                                        <td className="p-2.5 text-right text-gray-900 font-medium">{item.afternoonQty}</td>
                                                        <td className="p-2.5 text-right font-bold text-gray-800">{(item.afternoonQty * item.price).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-indigo-50/10 font-bold">
                                                    <td colSpan="3" className="p-2.5 text-right text-gray-500">Afternoon Subtotal:</td>
                                                    <td className="p-2.5 text-right text-indigo-700">{(afternoonTotal).toFixed(2)} LKR</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Returns Table */}
                            {returnItems.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-bold text-red-700 text-xs uppercase tracking-wider">Returns Received</h4>
                                    <div className="border rounded-xl overflow-hidden">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-red-50/50 text-red-900 font-bold uppercase border-b">
                                                <tr>
                                                    <th className="p-2.5">Item</th>
                                                    <th className="p-2.5 text-right">Price</th>
                                                    <th className="p-2.5 text-right">Qty</th>
                                                    <th className="p-2.5 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {returnItems.map((item, i) => (
                                                    <tr key={i} className="hover:bg-gray-50/50">
                                                        <td className="p-2.5 font-semibold text-gray-800">{item.productName}</td>
                                                        <td className="p-2.5 text-right text-gray-600">{item.price.toFixed(2)}</td>
                                                        <td className="p-2.5 text-right text-gray-900 font-medium">{item.returnQty}</td>
                                                        <td className="p-2.5 text-right font-bold text-red-600">-{((item.returnQty || 0) * item.price).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-red-50/10 font-bold">
                                                    <td colSpan="3" className="p-2.5 text-right text-gray-500">Returns Subtotal:</td>
                                                    <td className="p-2.5 text-right text-red-700">-{returnsTotalCalculated.toFixed(2)} LKR</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Special Note */}
                            {viewingInvoice.specialNote && viewingInvoice.specialNote.trim() && (
                                <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl text-xs text-gray-700">
                                    <span className="font-bold text-amber-800 uppercase block mb-1 text-[10px] tracking-wider">Special Remarks</span>
                                    {viewingInvoice.specialNote}
                                </div>
                            )}

                            {/* Summary Box */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-end">
                                <div className="w-full md:w-80 text-xs space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Morning Total:</span>
                                        <span className="font-semibold text-gray-800">{morningTotal.toFixed(2)} LKR</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Afternoon Total:</span>
                                        <span className="font-semibold text-gray-800">{afternoonTotal.toFixed(2)} LKR</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                                        <span>Today Total (Delivered):</span>
                                        <span>{todayTotal.toFixed(2)} LKR</span>
                                    </div>
                                    <div className="flex justify-between text-red-600">
                                        <span>Less Returns:</span>
                                        <span>-{returnsTotalCalculated.toFixed(2)} LKR</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-gray-500">Old Outstanding:</span>
                                        <span className="font-semibold text-gray-800">{(viewingInvoice.oldBalance || 0).toFixed(2)} LKR</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-sm">
                                        <span>Grand Total:</span>
                                        <span className="text-indigo-900 font-extrabold">{(viewingInvoice.grandTotal || 0).toFixed(2)} LKR</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-600 font-bold border-b pb-2">
                                        <span>Amount Paid Today:</span>
                                        <span>-{(viewingInvoice.amountReceived || 0).toFixed(2)} LKR</span>
                                    </div>
                                    <div className="flex justify-between font-extrabold text-sm text-red-650">
                                        <span>Net Outstanding:</span>
                                        <span>{(viewingInvoice.newBalance || 0).toFixed(2)} LKR</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        handlePrint(viewingInvoice);
                                        setViewingInvoice(null);
                                    }}
                                    className="flex items-center gap-1.5"
                                >
                                    <Printer size={14} />
                                    Print Receipt
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        handleDownloadPdf(viewingInvoice);
                                        setViewingInvoice(null);
                                    }}
                                    className="flex items-center gap-1.5"
                                >
                                    <Download size={14} />
                                    Download PDF
                                </Button>
                                <Button onClick={() => setViewingInvoice(null)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
