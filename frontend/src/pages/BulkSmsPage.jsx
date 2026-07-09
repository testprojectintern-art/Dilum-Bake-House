import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Users, AlertTriangle, ArrowLeft, ShieldAlert, Sparkles, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { useCustomerGroups, useCustomers, useSendBulkSms } from '../features/customers/useCustomers';

export default function BulkSmsPage() {
    const navigate = useNavigate();
    const [customerGroupId, setCustomerGroupId] = useState('');
    const [status, setStatus] = useState('active'); // Default to sending to active customers
    const [message, setMessage] = useState('');
    const [charCount, setCharCount] = useState(0);
    const [smsPages, setSmsPages] = useState(1);

    // Fetch customer groups
    const { data: groupsRes } = useCustomerGroups();
    const groups = groupsRes?.data || [];
    const groupOptions = [
        { value: '', label: 'All Groups' },
        ...groups.map(g => ({ value: g._id, label: g.name }))
    ];

    // Reactive fetching of customers matching current filters to show audience size
    const filters = { limit: 10000 };
    if (customerGroupId) filters.customerGroupId = customerGroupId;
    if (status) filters.status = status;

    const { data: customersRes, isLoading: isCustomersLoading } = useCustomers(filters);
    const customers = customersRes?.data || [];

    // Filter list to count customers who have valid phone numbers
    const validRecipients = customers.filter(c => {
        const phone = c.primaryContact?.phone || c.primaryContact?.mobile || c.billingAddress?.phone;
        return phone && phone.trim().length > 0;
    });

    const sendBulkMutation = useSendBulkSms();

    // Calculate characters and SMS pages
    useEffect(() => {
        const len = message.length;
        setCharCount(len);
        if (len <= 160) {
            setSmsPages(len > 0 ? 1 : 0);
        } else {
            // Multi-part SMS allows 153 chars per page due to headers
            setSmsPages(Math.ceil(len / 153));
        }
    }, [message]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!message.trim()) {
            toast.error('Please enter a campaign message.');
            return;
        }

        if (validRecipients.length === 0) {
            toast.error('No recipients match the selected filters.');
            return;
        }

        const confirmMsg = `Are you sure you want to send this SMS to ${validRecipients.length} customers? This will trigger SMSLenz API transmissions.`;
        if (!window.confirm(confirmMsg)) return;

        sendBulkMutation.mutate({
            message,
            customerGroupId: customerGroupId || undefined,
            status: status || undefined
        }, {
            onSuccess: () => {
                setMessage('');
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            <PageHeader 
                title="Bulk SMS Campaigns" 
                description="Send promotions, announcements, and greetings to your customers instantly via SMSLenz"
                actions={
                    <Button variant="outline" onClick={() => navigate('/customers')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back to Customers
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form Area */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                        <h2 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <MessageSquare size={18} className="text-indigo-600" />
                            Compose Marketing Campaign
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Filtering Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Select
                                    label="Target Customer Group"
                                    options={groupOptions}
                                    value={customerGroupId}
                                    onChange={(e) => setCustomerGroupId(e.target.value)}
                                />
                                <Select
                                    label="Target Customer Status"
                                    options={[
                                        { value: '', label: 'All Statuses' },
                                        { value: 'active', label: 'Active' },
                                        { value: 'prospect', label: 'Prospect' },
                                        { value: 'inactive', label: 'Inactive' },
                                        { value: 'blacklisted', label: 'Blacklisted' }
                                    ]}
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                />
                            </div>

                            {/* Message Composer */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Campaign Message *
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    maxLength={480}
                                    rows={6}
                                    placeholder="Type your promotional message here... E.g., Dear Customer, get 20% off on all items this weekend at Dilum Bake House! Use code PROMO20."
                                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none transition shadow-sm font-sans"
                                />

                                {/* Counter Badge */}
                                <div className="flex justify-between items-center mt-2 text-xs font-semibold">
                                    <span className="text-gray-400">
                                        Max characters: 480
                                    </span>
                                    <div className="flex gap-3">
                                        <span className={`${charCount > 160 ? 'text-amber-600' : 'text-gray-500'}`}>
                                            Characters: <span className="font-extrabold">{charCount}</span>
                                        </span>
                                        <span className={`${smsPages > 1 ? 'text-purple-600' : 'text-gray-500'}`}>
                                            Pages: <span className="font-extrabold">{smsPages}</span> / 3
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Alert Box */}
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex gap-3 items-start shadow-sm dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-200">
                                <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">SMS Credits Usage Warning</p>
                                    <p className="mt-0.5">This campaign will transmit actual SMS messages via SMSLenz. Each page represents 160 characters (or 153 for multi-part messages). Multi-page campaigns multiply credit consumption. Verify details before sending.</p>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end pt-4 border-t">
                                <Button 
                                    type="submit" 
                                    variant="primary" 
                                    loading={sendBulkMutation.isPending}
                                    disabled={validRecipients.length === 0}
                                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2"
                                >
                                    <Send size={16} /> Send Campaign
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                {/* Audience / Diagnostics Sidebar */}
                <div className="space-y-6">
                    {/* Audience Insights Card */}
                    <Card className="p-6">
                        <h2 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Users size={18} className="text-emerald-600" />
                            Target Audience Size
                        </h2>

                        {isCustomersLoading ? (
                            <div className="py-8 text-center text-xs text-gray-400">Estimating audience size...</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-xl border flex flex-col justify-between dark:bg-gray-800">
                                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Estimated Recipients</span>
                                    <h1 className="text-3xl font-black text-gray-900 mt-1">{validRecipients.length}</h1>
                                    <p className="text-[10px] text-gray-500 mt-1">Customers matching filters with valid contact phone numbers.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-3 border rounded-lg text-center bg-white dark:bg-gray-800">
                                        <p className="text-gray-400 font-medium">Total Filters Match</p>
                                        <p className="text-md font-bold text-gray-800 mt-0.5">{customers.length}</p>
                                    </div>
                                    <div className="p-3 border rounded-lg text-center bg-white dark:bg-gray-800">
                                        <p className="text-gray-400 font-medium">No Phone Number</p>
                                        <p className="text-md font-bold text-rose-600 mt-0.5">{customers.length - validRecipients.length}</p>
                                    </div>
                                </div>

                                <div className="border-t pt-4 space-y-2.5 text-xs text-gray-600">
                                    <div className="flex justify-between items-center">
                                        <span>Target Group:</span>
                                        <span className="font-semibold text-gray-800">
                                            {customerGroupId ? groups.find(g => g._id === customerGroupId)?.name : 'All Groups'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Status Filter:</span>
                                        <span className="font-semibold text-gray-800 capitalize">{status || 'All'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Quick Tips */}
                    <Card className="p-6 bg-gradient-to-br from-indigo-50/20 to-white dark:from-indigo-950/25 dark:to-slate-900 border border-gray-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 mb-2">
                            <Sparkles size={16} /> Campaign Best Practices
                        </h3>
                        <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
                            <li>Keep messages short, punchy, and under 160 characters (1 page) when possible.</li>
                            <li>Always sign off with your brand name so recipients recognize you.</li>
                            <li>Avoid using special characters or emojis to prevent encoding shifts that limit SMS page lengths.</li>
                        </ul>
                    </Card>
                </div>
                
            </div>
        </div>
    );
}
