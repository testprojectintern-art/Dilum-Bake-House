export const ROLES = [
    {
        value: 'admin',
        label: 'Admin (Owner)',
        description: 'Full system access — users, settings, all financial data, all operations',
        color: '#dc2626',
        permissions: ['all'],
    },
    {
        value: 'manager',
        label: 'Manager',
        description: 'Full system access — users, settings, approvals, reports, stock, sales, HR',
        color: '#ea580c',
        permissions: ['all'],
    },
    {
        value: 'cashier',
        label: 'Cashier',
        description: 'POS terminal, sales orders, invoices, payments, customers. Logs into POS directly.',
        color: '#2563eb',
        permissions: ['create_orders', 'process_payments', 'manage_customers'],
    },
    {
        value: 'accountant',
        label: 'Accountant',
        description: 'Finance, procurement, invoicing, payments, payroll, and all financial reports',
        color: '#059669',
        permissions: ['invoicing', 'payments', 'credit_holds', 'view_financial_reports'],
    },
    {
        value: 'employee',
        label: 'Employee',
        description: 'Own salary/leave/attendance only. Can view stock and manage manufacturing.',
        color: '#7c3aed',
        permissions: ['view_own_payslip', 'submit_leave', 'view_stock', 'manage_bom'],
    },
];

export const getRoleConfig = (roleValue) =>
    ROLES.find((r) => r.value === roleValue) || ROLES[ROLES.length - 1];