import { Routes, Route } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import BrandsPage from './pages/BrandsPage';
import CustomersPage from './pages/CustomersPage';
import CustomerGroupsPage from './pages/CustomerGroupsPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import SalesOrderFormPage from './pages/SalesOrderFormPage';
import SalesOrderDetailPage from './pages/SalesOrderDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ComingSoonPage from './pages/ComingSoonPage';
import PriceCheckerPage from './pages/PriceCheckerPage';
import WholesalePricesPage from './pages/WholesalePricesPage';
import ChequesPage from './pages/ChequesPage';
import BankAccountsPage from './pages/BankAccountsPage';
import FundTransfersPage from './pages/FundTransfersPage';
import ExpensesPage from './pages/ExpensesPage';
import WarehousesPage from './pages/WarehousesPage';
import StockPage from './pages/StockPage';
import OpeningStockPage from './pages/OpeningStockPage';
import StockTransferPage from './pages/StockTransferPage';
import StockAdjustmentPage from './pages/StockAdjustmentPage';
import StockMovementsPage from './pages/StockMovementsPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderFormPage from './pages/PurchaseOrderFormPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import GrnsPage from './pages/GrnsPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceFromSalesOrderPage from './pages/InvoiceFromSalesOrderPage';
import InvoiceFormPage from './pages/InvoiceFormPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import BillsPage from './pages/BillsPage';
import BillDetailPage from './pages/BillDetailPage';
import BillFromGrnPage from './pages/BillFromGrnPage';
import DamagesPage from './pages/DamagesPage';
import SupplierReturnsPage from './pages/SupplierReturnsPage';
import PaymentsPage from './pages/PaymentsPage';
import InstallmentsPage from './pages/InstallmentsPage';
import PaymentFormPage from './pages/PaymentFormPage';
import PaymentDetailPage from './pages/PaymentDetailPage';
import BomsPage from './pages/BomsPage';
import BomFormPage from './pages/BomFormPage';
import BomDetailPage from './pages/BomDetailPage';
import ProductionOrdersPage from './pages/ProductionOrdersPage';
import ProductionOrderFormPage from './pages/ProductionOrderFormPage';
import ProductionOrderDetailPage from './pages/ProductionOrderDetailPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ReturnsPage from './pages/ReturnsPage';
import ReturnFormPage from './pages/ReturnFormPage';
import ReturnDetailPage from './pages/ReturnDetailPage';
import CreditNotesPage from './pages/CreditNotesPage';
import CreditNoteDetailPage from './pages/CreditNoteDetailPage';
import SupplierReturnDetailPage from './pages/SupplierReturnDetailPage';
import RepairsPage from './pages/RepairsPage';
import RepairDetailPage from './pages/RepairDetailPage';
import PosPage from './pages/PosPage';
import PosSessionsPage from './pages/PosSessionsPage';

import EmployeesPage from './pages/EmployeesPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import DepartmentsPage from './pages/DepartmentsPage';
import DesignationsPage from './pages/DesignationsPage';
import ShiftsPage from './pages/ShiftsPage';
import AttendancePage from './pages/AttendancePage';
import LeaveRequestsPage from './pages/LeaveRequestsPage';
import HolidaysPage from './pages/HolidaysPage';
import SalaryStructuresPage from './pages/SalaryStructuresPage';
import PayrollsPage from './pages/PayrollsPage';
import PayrollDetailPage from './pages/PayrollDetailPage';
import PayslipDetailPage from './pages/PayslipDetailPage';

import ReportsPage from './pages/ReportsPage';
import FinancialReportPage from './pages/FinancialReportPage';
import SalesSummaryReportPage from './pages/reports/SalesSummaryReportPage';
import SalesByProductReportPage from './pages/reports/SalesByProductReportPage';
import SalesByCustomerReportPage from './pages/reports/SalesByCustomerReportPage';
import StockValuationReportPage from './pages/reports/StockValuationReportPage';
import SlowFastMoversReportPage from './pages/reports/SlowFastMoversReportPage';
import LowStockReportPage from './pages/reports/LowStockReportPage';
import StockMovementReportPage from './pages/reports/StockMovementReportPage';
import ProductionReportPage from './pages/reports/ProductionReportPage';
import ReturnsReportPage from './pages/reports/ReturnsReportPage';
import FinancialSnapshotPage from './pages/reports/FinancialSnapshotPage';
import HrReportsPage from './pages/reports/HrReportsPage';
import AiPredictionsPage from './pages/reports/AiPredictionsPage';

import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import ReceiptPrintPage from './pages/ReceiptPrintPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route path="/receipt/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'accountant', 'cashier']}>
            <ReceiptPrintPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/price-checker"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier', 'employee']}>
            <PriceCheckerPage />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'accountant', 'cashier', 'employee']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier','employee']}><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier','employee']}><DashboardPage /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute allowedRoles={['admin','manager']}><ProductsPage /></ProtectedRoute>} />
        <Route path="/wholesale-prices" element={<ProtectedRoute allowedRoles={['admin','manager']}><WholesalePricesPage /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute allowedRoles={['admin','manager']}><CategoriesPage /></ProtectedRoute>} />
        <Route path="/brands" element={<ProtectedRoute allowedRoles={['admin','manager']}><BrandsPage /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><CustomersPage /></ProtectedRoute>} />
        <Route path="/customer-groups" element={<ProtectedRoute allowedRoles={['admin','manager']}><CustomerGroupsPage /></ProtectedRoute>} />
        <Route path="/sales-orders" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><SalesOrdersPage /></ProtectedRoute>} />
        <Route path="/sales-orders/new" element={<ProtectedRoute allowedRoles={['admin','manager','cashier']}><SalesOrderFormPage /></ProtectedRoute>} />
        <Route path="/sales-orders/:id" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><SalesOrderDetailPage /></ProtectedRoute>} />
        <Route path="/warehouses" element={<ProtectedRoute allowedRoles={['admin','manager']}><WarehousesPage /></ProtectedRoute>} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/stock/opening" element={<ProtectedRoute allowedRoles={['admin','manager']}><OpeningStockPage /></ProtectedRoute>} />
        <Route path="/stock/transfer" element={<ProtectedRoute allowedRoles={['admin','manager']}><StockTransferPage /></ProtectedRoute>} />
        <Route path="/stock/adjustment" element={<ProtectedRoute allowedRoles={['admin','manager']}><StockAdjustmentPage /></ProtectedRoute>} />
        <Route path="/stock/movements" element={<StockMovementsPage />} />
        <Route path="/damages" element={<ProtectedRoute allowedRoles={['admin','manager','employee']}><DamagesPage /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><SuppliersPage /></ProtectedRoute>} />
        <Route path="/supplier-returns" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><SupplierReturnsPage /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><PurchaseOrdersPage /></ProtectedRoute>} />
        <Route path="/purchase-orders/new" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><PurchaseOrderFormPage /></ProtectedRoute>} />
        <Route path="/purchase-orders/:id" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><PurchaseOrderDetailPage /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><InvoicesPage /></ProtectedRoute>} />
        <Route path="/invoices/new" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><InvoiceFormPage /></ProtectedRoute>} />
        <Route path="/invoices/from-sales-order" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><InvoiceFromSalesOrderPage /></ProtectedRoute>} />
        <Route path="/invoices/:id" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><InvoiceDetailPage /></ProtectedRoute>} />
        <Route path="/grns" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><GrnsPage /></ProtectedRoute>} />
        <Route path="/bills" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><BillsPage /></ProtectedRoute>} />
        <Route path="/bills/from-grn" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><BillFromGrnPage /></ProtectedRoute>} />
        <Route path="/bills/:id" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><BillDetailPage /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><PaymentsPage /></ProtectedRoute>} />
        <Route path="/cheques" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><ChequesPage /></ProtectedRoute>} />
        <Route path="/bank-accounts" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><BankAccountsPage /></ProtectedRoute>} />
        <Route path="/fund-transfers" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><FundTransfersPage /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><ExpensesPage /></ProtectedRoute>} />
        <Route path="/payments/new" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><PaymentFormPage /></ProtectedRoute>} />
        <Route path="/payments/:id" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><PaymentDetailPage /></ProtectedRoute>} />
        <Route path="/installments" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><InstallmentsPage /></ProtectedRoute>} />
        <Route path="/boms" element={<ProtectedRoute allowedRoles={['admin','manager','employee']}><BomsPage /></ProtectedRoute>} />
        <Route path="/boms/new" element={<ProtectedRoute allowedRoles={['admin','manager','employee']}><BomFormPage /></ProtectedRoute>} />
        <Route path="/boms/:id" element={<ProtectedRoute allowedRoles={['admin','manager','employee']}><BomDetailPage /></ProtectedRoute>} />
        <Route path="/boms/:id/edit" element={<ProtectedRoute allowedRoles={['admin','manager','employee']}><BomFormPage /></ProtectedRoute>} />
        <Route path="/production-orders" element={<ProtectedRoute allowedRoles={['admin','manager','employee']}><ProductionOrdersPage /></ProtectedRoute>} />
        <Route path="/production-orders/new" element={<ProtectedRoute allowedRoles={['admin','manager','employee']}><ProductionOrderFormPage /></ProtectedRoute>} />
        <Route path="/production-orders/:id" element={<ProtectedRoute allowedRoles={['admin','manager','employee']}><ProductionOrderDetailPage /></ProtectedRoute>} />
        <Route path="/returns" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><ReturnsPage /></ProtectedRoute>} />
        <Route path="/returns/new" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><ReturnFormPage /></ProtectedRoute>} />
        <Route path="/returns/:id" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','cashier']}><ReturnDetailPage /></ProtectedRoute>} />
        <Route path="/credit-notes" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><CreditNotesPage /></ProtectedRoute>} />
        <Route path="/credit-notes/:id" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><CreditNoteDetailPage /></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute allowedRoles={['admin','manager','cashier']}><PosPage /></ProtectedRoute>} />
        <Route path="/pos-sessions" element={<ProtectedRoute allowedRoles={['admin','manager','cashier']}><PosSessionsPage /></ProtectedRoute>} />

        <Route path="/supplier-returns/:id" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><SupplierReturnDetailPage /></ProtectedRoute>} />
        <Route path="/repairs" element={<RepairsPage />} />
        <Route path="/repairs/:id" element={<RepairDetailPage />} />
        <Route path="/employees" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><EmployeesPage /></ProtectedRoute>} />
        <Route path="/employees/new" element={<ProtectedRoute allowedRoles={['admin','manager']}><EmployeeFormPage /></ProtectedRoute>} />
        <Route path="/employees/:id" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><EmployeeDetailPage /></ProtectedRoute>} />
        <Route path="/employees/:id/edit" element={<ProtectedRoute allowedRoles={['admin','manager']}><EmployeeFormPage /></ProtectedRoute>} />
        <Route path="/departments" element={<ProtectedRoute allowedRoles={['admin','manager']}><DepartmentsPage /></ProtectedRoute>} />
        <Route path="/designations" element={<ProtectedRoute allowedRoles={['admin','manager']}><DesignationsPage /></ProtectedRoute>} />
        <Route path="/shifts" element={<ProtectedRoute allowedRoles={['admin','manager']}><ShiftsPage /></ProtectedRoute>} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/leaves" element={<LeaveRequestsPage />} />
        <Route path="/holidays" element={<HolidaysPage />} />
        <Route path="/salary-structures" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><SalaryStructuresPage /></ProtectedRoute>} />
        <Route path="/payroll" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><PayrollsPage /></ProtectedRoute>} />
        <Route path="/payroll/:id" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><PayrollDetailPage /></ProtectedRoute>} />
        <Route path="/payroll/:payrollId/payslip/:employeeId" element={<PayslipDetailPage />} />

        <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><ReportsPage /></ProtectedRoute>} />
        <Route path="/ai-predictions" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><AiPredictionsPage /></ProtectedRoute>} />
        <Route path="/reports/financial" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><FinancialReportPage /></ProtectedRoute>} />
        <Route path="/reports/sales" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><SalesSummaryReportPage /></ProtectedRoute>} />
        <Route path="/reports/sales-by-product" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><SalesByProductReportPage /></ProtectedRoute>} />
        <Route path="/reports/sales-by-customer" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><SalesByCustomerReportPage /></ProtectedRoute>} />
        <Route path="/reports/stock-valuation" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><StockValuationReportPage /></ProtectedRoute>} />
        <Route path="/reports/slow-fast-movers" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><SlowFastMoversReportPage /></ProtectedRoute>} />
        <Route path="/reports/inventory/low-stock" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><LowStockReportPage /></ProtectedRoute>} />
        <Route path="/reports/stock-movement" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><StockMovementReportPage /></ProtectedRoute>} />
        <Route path="/reports/production" element={<ProtectedRoute allowedRoles={['admin','manager','accountant','employee']}><ProductionReportPage /></ProtectedRoute>} />
        <Route path="/reports/returns-damages" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><ReturnsReportPage /></ProtectedRoute>} />
        <Route path="/reports/financial" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><FinancialSnapshotPage /></ProtectedRoute>} />
        <Route path="/reports/hr" element={<ProtectedRoute allowedRoles={['admin','manager','accountant']}><HrReportsPage /></ProtectedRoute>} />

        <Route path="/users"
          element={<ProtectedRoute allowedRoles={['admin', 'manager']}><UsersPage /></ProtectedRoute>} />
        <Route path="/roles"
          element={<ProtectedRoute allowedRoles={['admin', 'manager']}><RolesPage /></ProtectedRoute>} />

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin','manager']}><SettingsPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;