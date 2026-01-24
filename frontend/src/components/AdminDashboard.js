import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  Settings,
  Database,
  LogOut,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  AlertTriangle,
  Save,
  X,
  History,
  Search
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Currency formatting helper
  const formatCurrency = (amount) => {
    const currency = settingsForm.currency || settings.currency?.value || 'PHP';
    const symbols = {
      'PHP': '₱',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };
    const symbol = symbols[currency] || '₱';
    return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Dashboard data (currently unused but kept for future use)
  // eslint-disable-next-line no-unused-vars
  const [dashboardData, setDashboardData] = useState({});

  // Products data
  const [products, setProducts] = useState([]);
  const [productsPagination, setProductsPagination] = useState({ page: 1, limit: 100, total: 0, pages: 1 });
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    price: '',
    cost: '',
    stock: '',
    category: '',
    description: '',
    min_stock: '',
    brand: ''
  });
  const [productHistory, setProductHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');

  // Users data
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Customers data
  const [customers, setCustomers] = useState([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  // Sales data (currently unused but kept for future use)
  // eslint-disable-next-line no-unused-vars
  const [salesData, setSalesData] = useState({});
  const [salesHistory, setSalesHistory] = useState([]);
  const [salesPagination, setSalesPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

  // Reports data
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [reportData, setReportData] = useState({});

  // User management
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'cashier',
    full_name: ''
  });

  // Settings data
  const [settings, setSettings] = useState({});
  const [settingsForm, setSettingsForm] = useState({
    store_name: '',
    store_address: '',
    phone: '',
    vat_rate: '',
    currency: 'PHP'
  });

  // Backup data
  const [backups, setBackups] = useState([]);

  // Pending orders data
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Brands data
  const [brands, setBrands] = useState([]);
  const [newBrand, setNewBrand] = useState('');

  // Customer purchase history
  const [customerHistory, setCustomerHistory] = useState([]);
  const [showCustomerHistoryModal, setShowCustomerHistoryModal] = useState(false);

  // Product search
  const [productSearchTerm, setProductSearchTerm] = useState('');


  // Load all essential data when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true);
        // Load all essential data in parallel
        await Promise.all([
          fetchDashboardData(),
          fetchProducts(1, 100),
          fetchUsers(),
          fetchCustomers(),
          fetchSalesReports(1, 50),
          fetchSettings(),
          fetchBackups(),
          fetchPendingOrders(),
          fetchBrands()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, []); // Empty dependency array - run once on mount

  // Apply user theme color
  useEffect(() => {
    if (user?.theme_color) {
      document.documentElement.style.setProperty('--theme-color', user.theme_color);
    }
  }, [user]);

  // Load tab-specific data when switching tabs
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReportData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, reportPeriod]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/system/info');
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    }
  };

  const fetchProducts = async (page = 1, limit = 100, search = '', category = '') => {
    try {
      const url = `/api/products?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}`;
      const response = await axios.get(url);
      setProducts(response.data.products || []);
      if (response.data.pagination) {
        setProductsPagination(response.data.pagination);
        setTotalProductsCount(response.data.pagination.total); // Store total count for dashboard
      }
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data || []);
    } catch (error) {
      toast.error('Failed to load users');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data || []);
    } catch (error) {
      toast.error('Failed to load customers');
    }
  };

  const fetchSalesReports = async (page = 1, limit = 50) => {
    try {
      const response = await axios.get('/api/sales/reports/summary');
      setSalesData(response.data);

      const historyResponse = await axios.get(`/api/sales?page=${page}&limit=${limit}`);
      setSalesHistory(historyResponse.data.sales || []);
      if (historyResponse.data.pagination) {
        setSalesPagination(historyResponse.data.pagination);
      }
    } catch (error) {
      toast.error('Failed to load sales reports');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      const settingsData = response.data || {};
      setSettings(settingsData);

      // Update form with current settings
      setSettingsForm({
        store_name: settingsData.company_name?.value || '',
        store_address: settingsData.company_address?.value || '',
        phone: settingsData.phone?.value || '',
        vat_rate: settingsData.vat_rate?.value || settingsData.tax_rate?.value || '12.0',
        currency: settingsData.currency?.value || 'PHP'
      });
    } catch (error) {
      toast.error('Failed to load settings');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const settingsToUpdate = {
        company_name: settingsForm.store_name,
        company_address: settingsForm.store_address,
        phone: settingsForm.phone,
        vat_rate: settingsForm.vat_rate.toString(),
        currency: settingsForm.currency
      };

      await axios.put('/api/settings', { settings: settingsToUpdate });
      toast.success('Settings saved successfully');
      fetchSettings(); // Refresh settings
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const response = await axios.get('/api/backup/list');
      setBackups(response.data || []);
    } catch (error) {
      toast.error('Failed to load backups');
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const response = await axios.get('/api/sales/pending');
      setPendingOrders(response.data || []);
    } catch (error) {
      console.error('Failed to load pending orders:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await axios.get('/api/brands');
      setBrands(response.data || []);
    } catch (error) {
      console.error('Failed to load brands:', error);
    }
  };

  const fetchCustomerHistory = async (customerId) => {
    try {
      const response = await axios.get(`/api/sales?customer_id=${customerId}`);
      setCustomerHistory(response.data.sales || []);
      setShowCustomerHistoryModal(true);
    } catch (error) {
      toast.error('Failed to load customer history');
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post('/api/payments', {
        sale_id: selectedSale.id,
        amount: parseFloat(paymentAmount),
        payment_method: 'cash',
        notes: 'Payment added by admin'
      });
      toast.success('Payment added successfully');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedSale(null);
      fetchPendingOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      await axios.post('/api/backup/create');
      toast.success('Backup created successfully');
      fetchBackups(); // Refresh the backup list
    } catch (error) {
      toast.error('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    try {
      console.log(`Fetching report data for period: ${reportPeriod}`);
      const response = await axios.get(`/api/sales/reports/${reportPeriod}`);
      console.log('Report data response:', response.data);
      setReportData(response.data || {});
    } catch (error) {
      console.error('Report data fetch error:', error);
      toast.error(`Failed to load report data: ${error.response?.data?.error || error.message}`);
    }
  };


  // User Management Functions
  const openUserModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username || '',
        password: '',
        role: user.role || 'cashier',
        full_name: user.full_name || ''
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '',
        password: '',
        role: 'cashier',
        full_name: ''
      });
    }
    setShowUserModal(true);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        const updateData = {
          role: userForm.role,
          full_name: userForm.full_name,
          username: userForm.username
        };

        // Handle password change separately if provided
        if (userForm.password && userForm.password.trim()) {
          await axios.post(`/api/users/${editingUser.id}/reset-password`, {
            new_password: userForm.password
          });
        }

        await axios.put(`/api/users/${editingUser.id}`, updateData);
        toast.success('User updated successfully');
      } else {
        await axios.post('/api/users', userForm);
        toast.success('User created successfully');
      }

      setShowUserModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`/api/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  // Customer Management Functions
  const openCustomerModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerForm({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || ''
      });
    } else {
      setEditingCustomer(null);
      setCustomerForm({
        name: '',
        phone: '',
        email: '',
        address: ''
      });
    }
    setShowCustomerModal(true);
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCustomer) {
        await axios.put(`/api/customers/${editingCustomer.id}`, customerForm);
        toast.success('Customer updated successfully');
      } else {
        await axios.post('/api/customers', customerForm);
        toast.success('Customer created successfully');
      }

      setShowCustomerModal(false);
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;

    try {
      await axios.delete(`/api/customers/${customerId}`);
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete customer');
    }
  };

  // Export Functions
  const exportToCSV = (data, filename) => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + Object.keys(data[0]).join(",") + "\n"
      + data.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Product Management Functions
  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        price: product.price?.toString() || '',
        cost: product.cost?.toString() || '',
        stock: product.stock?.toString() || '',
        category: product.category || '',
        description: product.description || '',
        min_stock: product.min_stock?.toString() || '',
        tire_size: product.tire_size || '',
        brand: product.brand || ''
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        sku: '',
        barcode: '',
        price: '',
        cost: '',
        stock: '',
        category: '',
        description: '',
        min_stock: '',
        tire_size: '',
        brand: ''
      });
    }
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        ...productForm,
        price: parseFloat(parseFloat(productForm.price).toFixed(2)),
        cost: parseFloat(parseFloat(productForm.cost || 0).toFixed(2)),
        stock: parseInt(productForm.stock),
        min_stock: parseInt(productForm.min_stock || 0)
      };

      if (editingProduct) {
        await axios.put(`/api/products/${editingProduct.id}`, productData);
        toast.success('Product updated successfully');
      } else {
        await axios.post('/api/products', productData);
        toast.success('Product created successfully');
      }

      setShowProductModal(false);
      fetchProducts(productsPagination.page, productsPagination.limit);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await axios.delete(`/api/products/${productId}`);
      toast.success('Product deleted successfully');
      fetchProducts(productsPagination.page, productsPagination.limit);
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const fetchProductHistory = async (productId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/sales/product/${productId}`);
      setProductHistory(response.data || []);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error('Failed to load product history');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateThemeColor = async (color) => {
    try {
      await axios.patch('/api/users/theme-color', { theme_color: color });
      toast.success('Theme color updated');
      // Update local state if needed or reload
      window.location.reload();
    } catch (error) {
      toast.error('Failed to update theme color');
    }
  };

  const handleBulkImport = async () => {
    try {
      setLoading(true);
      let productsToImport = [];
      try {
        productsToImport = JSON.parse(importData);
      } catch (e) {
        toast.error('Invalid JSON format. Please provide a valid JSON array of products.');
        setLoading(false);
        return;
      }

      const response = await axios.post('/api/products/bulk', { products: productsToImport });
      const { success, failed, errors } = response.data;

      toast.success(`Import complete! ${success} succeeded, ${failed} failed.`);
      if (failed > 0) {
        console.error('Import errors:', errors);
      }

      setShowImportModal(false);
      setImportData('');
      fetchProducts();
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setLoading(false);
    }
  };


  // Analytics Data Processing
  const getAnalyticsData = () => {
    if (!salesHistory.length) return { dailySales: [], topProducts: [], lowStockProducts: [], pendingOrders: [] };

    // Daily sales for the last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTotal = salesHistory
        .filter(sale => sale.created_at?.startsWith(dateStr))
        .reduce((sum, sale) => sum + parseFloat(sale.total_amount || sale.total || 0), 0);

      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: dayTotal
      });
    }

    // Top selling products
    const productSales = {};
    salesHistory.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          if (!productSales[item.product_name]) {
            productSales[item.product_name] = 0;
          }
          productSales[item.product_name] += item.quantity;
        });
      }
    });

    const topProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));

    // Low stock products
    const lowStockProducts = products.filter(product =>
      product.stock <= (product.min_stock || 5)
    );

    // Pending orders
    const pendingOrders = salesHistory.filter(sale => sale.status === 'pending');

    return { dailySales: last7Days, topProducts, lowStockProducts, pendingOrders };
  };

  const analytics = getAnalyticsData();

  // User Modal Component
  const renderUserModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{ display: showUserModal ? 'flex' : 'none' }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingUser ? 'Edit User' : 'Add New User'}
          </h3>
          <button
            onClick={() => setShowUserModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              required
              disabled={editingUser}
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {editingUser ? '(leave blank to keep current)' : '*'}
            </label>
            <input
              type="password"
              required={!editingUser}
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={userForm.full_name}
              onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
              placeholder="Enter full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              required
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="cashier">Cashier</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowUserModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
        <button
          onClick={() => openCustomerModal()}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map(customer => (
                <tr key={customer.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.address || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => fetchCustomerHistory(customer.id)}
                        className="text-green-600 hover:text-green-900"
                        title="View Purchase History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openCustomerModal(customer)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <button
          onClick={() => openUserModal()}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openUserModal(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Sales Reports</h2>
        <div className="flex items-center gap-4">
          <select
            value={reportPeriod}
            onChange={(e) => {
              setReportPeriod(e.target.value);
              fetchReportData(); // Refresh data when period changes
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button
            onClick={() => exportToCSV(salesHistory, `sales-report-${reportPeriod}`)}
            className="btn btn-outline flex items-center gap-2"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend ({reportPeriod})</h3>
          {reportData.sales_data && reportData.sales_data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={reportData.sales_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>No sales data available for {reportPeriod} reports</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Performance</h3>
          {reportData.product_performance && reportData.product_performance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.product_performance}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="units_sold"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {reportData.product_performance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>No product performance data available</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesHistory.map(sale => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sale.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(sale.total_amount || sale.total || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.items_count || sale.items?.length || 0} items
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {sale.payment_method}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {salesPagination.pages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((salesPagination.page - 1) * salesPagination.limit) + 1} to {Math.min(salesPagination.page * salesPagination.limit, salesPagination.total)} of {salesPagination.total} sales
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchSalesReports(salesPagination.page - 1, salesPagination.limit)}
                disabled={salesPagination.page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm font-medium text-gray-700">
                Page {salesPagination.page} of {salesPagination.pages}
              </span>
              <button
                onClick={() => fetchSalesReports(salesPagination.page + 1, salesPagination.limit)}
                disabled={salesPagination.page >= salesPagination.pages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <select
                value={salesPagination.limit}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value);
                  setSalesPagination({ ...salesPagination, limit: newLimit, page: 1 });
                  fetchSalesReports(1, newLimit);
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
                <option value="200">200 per page</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Name
            </label>
            <input
              type="text"
              value={settingsForm.store_name}
              onChange={(e) => setSettingsForm({ ...settingsForm, store_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Address
            </label>
            <input
              type="text"
              value={settingsForm.store_address}
              onChange={(e) => setSettingsForm({ ...settingsForm, store_address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={settingsForm.phone}
              onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VAT Rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={settingsForm.vat_rate}
              onChange={(e) => setSettingsForm({ ...settingsForm, vat_rate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={settingsForm.currency}
              onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PHP">PHP (₱)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Account Personalization */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Personalization</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Theme Color
          </label>
          <div className="flex flex-wrap gap-3">
            {['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#4b5563'].map(color => (
              <button
                key={color}
                onClick={() => handleUpdateThemeColor(color)}
                className={`w-10 h-10 rounded-full border-2 transition-all transform hover:scale-110 ${user?.theme_color === color ? 'border-gray-900 scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">This color will be applied to your sidebar and buttons.</p>
        </div>
      </div>

      {/* Thermal Printer Settings */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🖨️ Thermal Printer Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Printer Width
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="58mm">58mm (Standard)</option>
              <option value="80mm">80mm (Wide)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Print Quality
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="normal">Normal</option>
              <option value="high">High Quality</option>
              <option value="draft">Draft (Fast)</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="auto-cut"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="auto-cut" className="ml-2 block text-sm text-gray-700">
              Auto-cut paper after printing
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="open-drawer"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="open-drawer" className="ml-2 block text-sm text-gray-700">
              Open cash drawer after sale
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receipt Footer Message
            </label>
            <textarea
              rows="3"
              placeholder="Enter custom message for receipt footer..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              defaultValue={`Thank you for your business!\nDrive safely! 🚗\nWarranty: 30 days on parts\nReturns: 7 days with receipt`}
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📋 Printer Setup Instructions:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Connect thermal printer via USB</li>
              <li>• Install printer drivers if required</li>
              <li>• Set printer as default in system settings</li>
              <li>• Test print using browser's print function</li>
              <li>• Adjust paper width settings above</li>
            </ul>
          </div>
        </div>
        <div className="mt-6">
          <button className="btn btn-primary">
            Save Printer Settings
          </button>
        </div>
      </div>
    </div>
  );

  const renderBackup = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Backup Management</h2>
        <button
          onClick={handleCreateBackup}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Creating...' : 'Create Backup'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Backups</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Backup Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backups.length > 0 ? (
                backups.map((backup, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {backup.filename || `Backup ${index + 1}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {backup.created_at ? new Date(backup.created_at).toLocaleString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {backup.size ? `${(backup.size / 1024).toFixed(1)} KB` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          Download
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                    No backups available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{settings.company_name?.value || 'Go Tire Car Care Center'} Dashboard</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Products</p>
                <p className="text-4xl font-bold">{totalProductsCount || products.length}</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <Package className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Low Stock Items</p>
                <p className="text-4xl font-bold">{analytics.lowStockProducts.length}</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <AlertTriangle className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Sales (7d)</p>
                <p className="text-4xl font-bold">
                  {formatCurrency(analytics.dailySales.reduce((sum, day) => sum + day.sales, 0))}
                </p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <DollarSign className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Pending Orders</p>
                <p className="text-4xl font-bold">{analytics.pendingOrders.length}</p>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <History className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Pending Orders List */}
        {analytics.pendingOrders.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl mr-4">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Pending Orders (Down Payments)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.pendingOrders.map(order => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(order.total_amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatCurrency(order.amount_paid)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">{formatCurrency(order.total_amount - order.amount_paid)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedSale(order);
                            setShowPaymentModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Add Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Trend Chart */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mr-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Sales Trend (Last 7 Days)</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Sales']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products Chart */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl mr-4">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Top Selling Products</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="quantity" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alert */}
        {analytics.lowStockProducts.length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-xl mr-4">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-red-800">Low Stock Alert</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.lowStockProducts.map(product => (
                <div key={product.id} className="bg-white rounded-xl p-6 border border-red-200 shadow-md hover:shadow-lg transition-all duration-200">
                  <h4 className="font-bold text-gray-900 mb-2">{product.name}</h4>
                  <p className="text-sm text-red-600 font-medium">Stock: {product.stock}</p>
                  <p className="text-xs text-gray-500 mt-1">Min Required: {product.min_stock || 5}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mr-4">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Product Inventory Management</h2>
        </div>
        <div className="flex gap-4">
          <select
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              fetchProducts(1, productsPagination.limit, '', e.target.value);
            }}
          >
            <option value="">All Categories</option>
            <option value="Passenger Tires">Passenger Tires</option>
            <option value="Truck Tires">Truck Tires</option>
            <option value="SUV Tires">SUV Tires</option>
            <option value="Performance Tires">Performance Tires</option>
            <option value="Oil & Fluids">Oil & Fluids</option>
            <option value="Auto Parts">Auto Parts</option>
            <option value="Brake Pads">Brake Pads</option>
            <option value="Wheels">Wheels</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 min-w-80"
              onChange={(e) => fetchProducts(1, productsPagination.limit, e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium whitespace-nowrap"
          >
            <Database className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => openProductModal()}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Size/Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {products.map(product => (
                <tr key={product.id} className={`hover:bg-gray-50 transition-colors duration-200 ${product.stock <= (product.min_stock || 5) ? 'bg-red-50 border-l-4 border-red-400' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-gray-500 mt-1">{product.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.sku || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.brand || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.tire_size || product.category || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-bold ${product.stock <= (product.min_stock || 5) ? 'text-red-600' : 'text-gray-900'
                        }`}>
                        {product.stock}
                      </span>
                      {product.stock <= (product.min_stock || 5) && (
                        <AlertTriangle className="w-4 h-4 text-red-500 ml-2" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setSelectedProductForHistory(product);
                          fetchProductHistory(product.id);
                        }}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all duration-200"
                        title="View History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openProductModal(product)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {productsPagination.pages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((productsPagination.page - 1) * productsPagination.limit) + 1} to {Math.min(productsPagination.page * productsPagination.limit, productsPagination.total)} of {productsPagination.total} products
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchProducts(productsPagination.page - 1, productsPagination.limit)}
                disabled={productsPagination.page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm font-medium text-gray-700">
                Page {productsPagination.page} of {productsPagination.pages}
              </span>
              <button
                onClick={() => fetchProducts(productsPagination.page + 1, productsPagination.limit)}
                disabled={productsPagination.page >= productsPagination.pages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <select
                value={productsPagination.limit}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value);
                  setProductsPagination({ ...productsPagination, limit: newLimit, page: 1 });
                  fetchProducts(1, newLimit);
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
                <option value="200">200 per page</option>
                <option value="500">500 per page</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Product Modal Component
  // Customer Modal Component
  const renderCustomerModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{ display: showCustomerModal ? 'flex' : 'none' }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </h3>
          <button
            onClick={() => setShowCustomerModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleCustomerSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={customerForm.name}
              onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={customerForm.phone}
              onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={customerForm.email}
              onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              rows={2}
              value={customerForm.address}
              onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowCustomerModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Create Customer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Product History Modal
  const renderProductHistoryModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{ display: showHistoryModal ? 'flex' : 'none' }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Product History</h3>
            <p className="text-sm text-gray-500">{selectedProductForHistory?.name}</p>
          </div>
          <button
            onClick={() => setShowHistoryModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {productHistory.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productHistory.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 text-sm">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="py-2 text-sm">{item.customer_name || 'Walk-in'}</td>
                    <td className="py-2 text-sm">{item.quantity}</td>
                    <td className="py-2 text-sm">{formatCurrency(item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-8">No sales history found for this product.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderProductModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{ display: showProductModal ? 'flex' : 'none' }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button
            onClick={() => setShowProductModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU *
              </label>
              <input
                type="text"
                required
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                placeholder="e.g., MIC-DEF-225-65-17"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barcode
              </label>
              <input
                type="text"
                value={productForm.barcode}
                onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost
              </label>
              <input
                type="number"
                step="0.01"
                value={productForm.cost}
                onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Quantity *
              </label>
              <input
                type="number"
                required
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Stock
              </label>
              <input
                type="number"
                value={productForm.min_stock}
                onChange={(e) => setProductForm({ ...productForm, min_stock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Category</option>
                <option value="Passenger Tires">Passenger Tires</option>
                <option value="Truck Tires">Truck Tires</option>
                <option value="SUV Tires">SUV Tires</option>
                <option value="Performance Tires">Performance Tires</option>
                <option value="Winter Tires">Winter Tires</option>
                <option value="All-Season Tires">All-Season Tires</option>
                <option value="Motorcycle Tires">Motorcycle Tires</option>
                <option value="Oil & Fluids">Oil & Fluids</option>
                <option value="Auto Parts">Auto Parts</option>
                <option value="Brake Pads">Brake Pads</option>
                <option value="Tire Accessories">Tire Accessories</option>
                <option value="Wheels">Wheels</option>
                <option value="Car Care">Car Care</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <select
                value={productForm.brand}
                onChange={(e) => {
                  if (e.target.value === '__ADD_NEW__') {
                    const brandName = prompt('Enter new brand name:');
                    if (brandName && brandName.trim()) {
                      setBrands([...brands, brandName.trim()]);
                      setProductForm({ ...productForm, brand: brandName.trim() });
                    }
                  } else {
                    setProductForm({ ...productForm, brand: e.target.value });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Brand</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
                <option value="__ADD_NEW__">+ Add New Brand</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tire Size / Type
              </label>
              <input
                type="text"
                value={productForm.tire_size}
                onChange={(e) => setProductForm({ ...productForm, tire_size: e.target.value })}
                placeholder="225/65R17, 5W-30, 17x8, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowProductModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderImportModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{ display: showImportModal ? 'flex' : 'none' }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Bulk Product Import</h3>
          <button
            onClick={() => setShowImportModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-bold mb-1">Format Requirement:</p>
            <p>Please provide a JSON array of products. Example:</p>
            <pre className="mt-2 text-xs overflow-x-auto bg-white p-2 border rounded">
              {"[\n  {\n    \"name\": \"Sample Tire\",\n    \"sku\": \"TIRE-001\",\n    \"price\": 1500,\n    \"cost\": 1000,\n    \"stock\": 10,\n    \"category\": \"Passenger Tires\",\n    \"brand\": \"Michelin\",\n    \"tire_size\": \"225/65/17\"\n  }\n]"}
            </pre>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              JSON Data
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste JSON array here..."
              rows="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end p-6 border-t gap-3">
          <button
            onClick={() => setShowImportModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkImport}
            disabled={loading || !importData.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      </div>
    </div>
  );

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'backup', label: 'Backup', icon: Database },
  ];

  // Show loading screen while initial data is being fetched
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Dashboard</h2>
          <p className="text-gray-600">Fetching your data...</p>
        </div>
      </div>
    );
  }

  // Payment Modal for Pending Orders
  const renderPaymentModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{ display: showPaymentModal ? 'flex' : 'none' }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Add Payment</h3>
          <button
            onClick={() => {
              setShowPaymentModal(false);
              setPaymentAmount('');
              setSelectedSale(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleAddPayment} className="p-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Order ID: #{selectedSale?.id}</p>
            <p className="text-sm text-gray-600">Total: {formatCurrency(selectedSale?.total_amount)}</p>
            <p className="text-sm text-gray-600">Paid: {formatCurrency(selectedSale?.amount_paid)}</p>
            <p className="text-lg font-bold text-gray-900 mt-2">
              Balance: {formatCurrency((selectedSale?.total_amount || 0) - (selectedSale?.amount_paid || 0))}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter payment amount"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowPaymentModal(false);
                setPaymentAmount('');
                setSelectedSale(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Add Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Customer History Modal
  const renderCustomerHistoryModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{ display: showCustomerHistoryModal ? 'flex' : 'none' }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Customer Purchase History</h3>
          <button
            onClick={() => setShowCustomerHistoryModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {customerHistory.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customerHistory.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(sale.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">#{sale.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(sale.total_amount)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sale.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-8">No purchase history found.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl border-r border-gray-700 sticky top-0 h-screen flex flex-col">
        <div className="p-8">
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">{settings.company_name?.value || 'Go Tire Car Care Center'} Admin</h1>
            <p className="text-red-100 text-sm">Welcome back, {user?.username}</p>
          </div>
        </div>

        <nav className="px-6">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-all duration-200 rounded-xl mb-2 ${activeTab === item.id
                  ? 'text-white shadow-lg transform scale-105'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white hover:transform hover:scale-105'
                  }`}
                style={activeTab === item.id ? { backgroundColor: user?.theme_color || '#dc2626' } : {}}
              >
                <Icon className="w-6 h-6 mr-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-6 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full flex items-center px-6 py-4 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-6 h-6 mr-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'products' && renderProducts()}
          {activeTab === 'customers' && renderCustomers()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'reports' && renderReports()}
          {activeTab === 'settings' && renderSettings()}
          {activeTab === 'backup' && renderBackup()}
        </div>
      </div>

      {/* Modals */}
      {renderProductModal()}
      {renderUserModal()}
      {renderCustomerModal()}
      {renderProductHistoryModal()}
      {renderImportModal()}
      {renderPaymentModal()}
      {renderCustomerHistoryModal()}
    </div>
  );
};

export default AdminDashboard;
