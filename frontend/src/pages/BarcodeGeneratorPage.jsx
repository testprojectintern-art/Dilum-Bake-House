import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Search, Plus, Minus, Tag, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { productsApi } from '../features/products/productsApi';

export default function BarcodeGeneratorPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(12);
    const [labels, setLabels] = useState([]); // Array of { product, qty }
    const [printFormat, setPrintFormat] = useState('roll_50_30');
    const [customWidth, setCustomWidth] = useState(50);
    const [customHeight, setCustomHeight] = useState(30);

    // Compute active size variables
    let widthVal = 50;
    let heightVal = 30;
    let isRoll = true;

    if (printFormat === 'roll_50_30') {
        widthVal = 50;
        heightVal = 30;
        isRoll = true;
    } else if (printFormat === 'roll_38_25') {
        widthVal = 38;
        heightVal = 25;
        isRoll = true;
    } else if (printFormat === 'roll_custom') {
        widthVal = customWidth;
        heightVal = customHeight;
        isRoll = true;
    } else if (printFormat === 'a4_3col') {
        widthVal = 50;
        heightVal = 30;
        isRoll = false;
    }

    // Fetch active products
    const { data: productsRes, isLoading } = useQuery({
        queryKey: ['products', 'barcode-gen', search],
        queryFn: () => productsApi.list({ search, status: 'active', limit: 10 }),
        enabled: search.length >= 2,
    });

    const productsList = productsRes?.data || [];
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(n || 0);

    const addProductToPrint = (prod) => {
        if (!prod.barcode) {
            toast.error("This product doesn't have a barcode. Edit it first or save it to auto-generate.");
            return;
        }
        
        setLabels((prev) => {
            const existing = prev.find(item => item.product._id === prod._id);
            if (existing) {
                return prev.map(item => item.product._id === prod._id ? { ...item, qty: item.qty + quantity } : item);
            }
            return [...prev, { product: prod, qty: quantity }];
        });
        
        setSelectedProduct(null);
        setSearch('');
        toast.success(`Added ${prod.name} labels`);
    };

    const removeProductFromPrint = (prodId) => {
        setLabels(prev => prev.filter(item => item.product._id !== prodId));
    };

    const updateQty = (prodId, val) => {
        setLabels(prev => prev.map(item => item.product._id === prodId ? { ...item, qty: Math.max(1, val) } : item));
    };

    const handlePrint = () => {
        if (labels.length === 0) {
            toast.error("No labels selected to print");
            return;
        }
        window.print();
    };

    // Flatten labels for grid layout printing
    const printedLabels = labels.flatMap(item => 
        Array.from({ length: item.qty }, () => item.product)
    );

    return (
        <div className="no-print-container">
            <div className="no-print">
                <PageHeader 
                    title="Barcode Label Generator" 
                    description="Generate and print barcode labels for products"
                    actions={
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => navigate('/products')}>
                                <ArrowLeft size={16} className="mr-1.5" /> Back
                            </Button>
                            <Button variant="primary" onClick={handlePrint} disabled={labels.length === 0}>
                                <Printer size={16} className="mr-1.5" /> Print Labels
                            </Button>
                        </div>
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Select Product Card */}
                    <Card className="p-5 lg:col-span-1 h-fit">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <Tag size={16} className="text-indigo-600" />
                            Add Products to List
                        </h3>

                        <div className="relative mb-4">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, SKU or code (min 2 chars)..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {search.length >= 2 && (
                            <div className="border rounded-lg max-h-60 overflow-y-auto mb-4 bg-white divide-y">
                                {isLoading ? (
                                    <div className="p-3 text-center text-xs text-gray-500">Loading...</div>
                                ) : productsList.length === 0 ? (
                                    <div className="p-3 text-center text-xs text-gray-500">No products found</div>
                                ) : (
                                    productsList.map((p) => (
                                        <button
                                            key={p._id}
                                            type="button"
                                            className="w-full text-left p-2.5 hover:bg-indigo-50/50 flex justify-between items-center text-sm"
                                            onClick={() => addProductToPrint(p)}
                                        >
                                            <div className="min-w-0 flex-1 pr-2">
                                                <p className="font-semibold truncate text-gray-800">{p.name}</p>
                                                <p className="text-[10px] text-gray-500 font-mono">Code: {p.productCode} | Barcode: {p.barcode || 'None'}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-bold text-indigo-600">{fmt(p.basePrice)}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        <div className="mt-4">
                            <Input
                                label="Default Quantity per Product"
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            />
                        </div>

                        <div className="mt-5 pt-4 border-t border-gray-200">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Label Settings</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Print Format</label>
                                    <select 
                                        value={printFormat}
                                        onChange={(e) => setPrintFormat(e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                    >
                                        <option value="roll_50_30">Label Roll (50mm x 30mm) - Standard</option>
                                        <option value="roll_38_25">Label Roll (38mm x 25mm) - Small</option>
                                        <option value="roll_custom">Custom Label Roll (Specify size)</option>
                                        <option value="a4_3col">A4 Sticker Sheet (3 Columns)</option>
                                    </select>
                                </div>

                                {printFormat === 'roll_custom' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Input
                                                label="Width (mm)"
                                                type="number"
                                                min="10"
                                                max="200"
                                                value={customWidth}
                                                onChange={(e) => setCustomWidth(parseInt(e.target.value) || 50)}
                                            />
                                        </div>
                                        <div>
                                            <Input
                                                label="Height (mm)"
                                                type="number"
                                                min="10"
                                                max="200"
                                                value={customHeight}
                                                onChange={(e) => setCustomHeight(parseInt(e.target.value) || 30)}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg text-[11px] text-indigo-700 dark:text-indigo-300 space-y-1">
                                    <p className="font-bold flex items-center gap-1">
                                        🖨️ Printer & Chrome Settings:
                                    </p>
                                    <ul className="list-disc pl-4 space-y-0.5 font-medium">
                                        <li>Destination: Select your <strong>Label Printer</strong>.</li>
                                        <li>Margins: Set to <strong>None</strong>.</li>
                                        <li>Scale: Set to <strong>100%</strong> (Default).</li>
                                        <li>Options: Uncheck <strong>Headers and Footers</strong>.</li>
                                        {isRoll && <li>Paper Size: Match label size ({widthVal}mm × {heightVal}mm).</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Print List Card */}
                    <Card className="p-5 lg:col-span-2">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Print Queue ({labels.reduce((s, i) => s + i.qty, 0)} Total Labels)</h3>

                        {labels.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 border border-dashed rounded-xl border-gray-300">
                                <Tag size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Search and add products on the left to queue labels for printing.</p>
                            </div>
                        ) : (
                            <div className="divide-y max-h-[400px] overflow-y-auto pr-1">
                                {labels.map((item) => (
                                    <div key={item.product._id} className="py-3 flex justify-between items-center text-sm first:pt-0 last:pb-0">
                                        <div className="min-w-0 flex-1 pr-4">
                                            <h4 className="font-bold text-gray-900 truncate">{item.product.name}</h4>
                                            <p className="text-xs text-gray-500 font-mono">
                                                Code: {item.product.productCode} | Barcode: {item.product.barcode}
                                            </p>
                                            <p className="font-bold text-indigo-600 mt-0.5">{fmt(item.product.basePrice)}</p>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                                                <button
                                                    onClick={() => updateQty(item.product._id, item.qty - 1)}
                                                    className="p-1.5 hover:bg-gray-50 text-gray-600"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <input
                                                    type="number"
                                                    className="w-12 text-center text-xs font-semibold focus:outline-none border-x py-1"
                                                    value={item.qty}
                                                    onChange={(e) => updateQty(item.product._id, parseInt(e.target.value) || 1)}
                                                />
                                                <button
                                                    onClick={() => updateQty(item.product._id, item.qty + 1)}
                                                    className="p-1.5 hover:bg-gray-50 text-gray-600"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => removeProductFromPrint(item.product._id)}
                                                className="p-2 hover:bg-red-50 text-red-600 rounded transition"
                                                title="Remove"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Preview Card */}
                {printedLabels.length > 0 && (
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Print Preview (Grid View)</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 border p-4 bg-gray-50 rounded-xl max-h-[300px] overflow-y-auto">
                             {printedLabels.map((p, idx) => (
                                <div key={idx} className="barcode-card-preview bg-white border rounded shadow-sm p-3 text-center flex flex-col justify-between items-center h-[120px] select-none">
                                    <div className="w-full">
                                        <p className="barcode-name text-[10px] font-bold text-gray-900 truncate uppercase leading-tight">{p.name}</p>
                                        <p className="barcode-price text-[9px] font-bold text-indigo-700 leading-none mt-0.5">{fmt(p.basePrice)}</p>
                                    </div>
                                    <div className="flex flex-col items-center my-1 w-full">
                                        {/* Simulated barcode bars */}
                                        <div className="flex justify-between items-end h-8 w-full max-w-[90px] overflow-hidden opacity-85">
                                            {[...p.barcode || '2000000000000'].map((digit, i) => {
                                                const thickness = (parseInt(digit) % 3) + 1;
                                                return (
                                                    <div 
                                                        key={i} 
                                                        className="barcode-bar bg-black" 
                                                        style={{ 
                                                            width: `${thickness}px`, 
                                                            height: i % 3 === 0 ? '100%' : '85%' 
                                                        }} 
                                                    />
                                                );
                                            })}
                                        </div>
                                        <span className="barcode-text text-[8px] font-mono tracking-widest mt-0.5 text-gray-700">{p.barcode}</span>
                                    </div>
                                    <p className="barcode-subtext text-[7px] text-gray-400 font-mono tracking-tighter uppercase">Hoorawa Watch Pvt Ltd</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Print Only Container (EAN-13 sticker format sheet, 50mm x 30mm standard sizes) */}
            <div className="print-label-sheet hidden print:block">
                <div className="label-grid">
                    {printedLabels.map((p, idx) => (
                        <div key={idx} className="label-item">
                            <div className="label-header">
                                <span className="label-title">{p.name}</span>
                                <span className="label-price">{fmt(p.basePrice)}</span>
                            </div>
                            <div className="label-barcode-container">
                                <div className="simulated-barcode">
                                    {[...p.barcode || '2000000000000'].map((digit, i) => {
                                        const thickness = (parseInt(digit) % 3) + 1;
                                        return (
                                            <div 
                                                key={i} 
                                                className="barcode-bar" 
                                                style={{ 
                                                    width: `${thickness}px`, 
                                                    height: i % 4 === 0 ? '100%' : '88%' 
                                                }} 
                                            />
                                        );
                                    })}
                                </div>
                                <span className="label-code-text">{p.barcode}</span>
                            </div>
                            <div className="label-footer">Hoorawa Watch Pvt Ltd</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Injected Print Styles */}
            <style>{`
                @media print {
                    @page {
                        size: ${isRoll ? `${widthVal}mm ${heightVal}mm` : 'A4'};
                        margin: 0;
                    }
                    .no-print-container {
                        padding: 0 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-label-sheet,
                    .print-label-sheet * {
                        visibility: visible !important;
                    }
                    .print-label-sheet {
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                    }

                    body {
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .label-grid {
                        ${isRoll ? `
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            width: 100%;
                            padding: 0;
                            margin: 0;
                        ` : `
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 2mm;
                            padding: 5mm;
                            width: 100%;
                        `}
                    }
                    .label-item {
                        width: ${isRoll ? `${widthVal}mm` : '100%'};
                        height: ${heightVal}mm;
                        max-width: ${widthVal}mm;
                        padding: ${heightVal < 28 ? '1mm' : '1.5mm'};
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        align-items: center;
                        text-align: center;
                        box-sizing: border-box;
                        page-break-inside: avoid;
                        page-break-after: ${isRoll ? 'always' : 'auto'};
                        break-after: ${isRoll ? 'page' : 'auto'};
                        border: ${isRoll ? 'none' : '1px solid #eee'};
                        border-radius: 4px;
                        background: white;
                    }
                    .label-header {
                        width: 100%;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        line-height: 1.1;
                    }
                    .label-title {
                        font-size: ${heightVal < 28 ? '7pt' : '8pt'};
                        font-weight: bold;
                        color: black;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        width: 100%;
                        text-transform: uppercase;
                    }
                    .label-price {
                        font-size: ${heightVal < 28 ? '7pt' : '8pt'};
                        font-weight: 800;
                        color: black;
                    }
                    .label-barcode-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        width: 100%;
                    }
                    .simulated-barcode {
                        display: flex;
                        justify-content: space-between;
                        align-items: end;
                        height: ${heightVal < 28 ? '7mm' : '9mm'};
                        width: 85%;
                        overflow: hidden;
                    }
                    .barcode-bar {
                        background: black !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .label-code-text {
                        font-size: ${heightVal < 28 ? '5.5pt' : '6pt'};
                        font-family: monospace;
                        letter-spacing: 1.2px;
                        margin-top: 0.3mm;
                        color: black;
                    }
                    .label-footer {
                        font-size: ${heightVal < 28 ? '4.5pt' : '5pt'};
                        font-family: sans-serif;
                        letter-spacing: 0.3px;
                        color: #777;
                        text-transform: uppercase;
                    }
                }
            `}</style>
        </div>
    );
}
