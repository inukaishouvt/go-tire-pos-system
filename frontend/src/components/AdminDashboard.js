import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Minus,
  Edit,
  Trash2,
  DollarSign,
  AlertTriangle,
  Save,
  X,
  History,
  Search,
  ShoppingCart,
  Scan,
  CheckCircle,
  Printer
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
  // eslint-disable-next-line no-unused-vars
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Partial Payment / Down Payment State
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDeadline, setPaymentDeadline] = useState('');

  // Brands data
  const [brands, setBrands] = useState([]);
  const [newBrand, setNewBrand] = useState('');

  // Date Range State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Customer purchase history
  const [customerHistory, setCustomerHistory] = useState([]);
  const [showCustomerHistoryModal, setShowCustomerHistoryModal] = useState(false);

  // Product search
  // eslint-disable-next-line no-unused-vars
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Checkout / Cashier for Admin
  const [cart, setCart] = useState([]);
  const [barcode, setBarcode] = useState('');
  const [checkoutSearchTerm, setCheckoutSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [searchPagination, setSearchPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  // eslint-disable-next-line no-unused-vars
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReceived, setPaymentReceived] = useState('');
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [discountValue, setDiscountValue] = useState(0);
  const [isVatExempt, setIsVatExempt] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const barcodeInputRef = useRef(null);


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

  const fetchSalesReports = async (page = 1, limit = 50, start = startDate, end = endDate) => {
    try {
      // Build query params
      const dateParams = `&start_date=${start || ''}&end_date=${end || ''}`;

      // Update summary data (top cards)
      // If period is custom, we might need a specific endpoint or just rely on summary
      const summaryUrl = `/api/sales/reports/summary?${dateParams.replace('&', '')}`;
      const response = await axios.get(summaryUrl);
      setSalesData(response.data);

      // Update sales history list
      const historyResponse = await axios.get(`/api/sales?page=${page}&limit=${limit}${dateParams}`);
      setSalesHistory(historyResponse.data.sales || []);
      if (historyResponse.data.pagination) {
        setSalesPagination(historyResponse.data.pagination);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load sales reports');
    }
  };

  // Helper to clean category names (remove ? and replace with space)
  const cleanText = (text) => {
    if (!text) return '';
    return text.toString().replace(/\?/g, ' ');
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
      let url = `/api/sales/reports/${reportPeriod}`;
      if (reportPeriod === 'custom') {
        // for custom, maybe we default to daily logic but filtered? 
        // logic is handled in backend now since we added query params
        url = `/api/sales/reports/daily?start_date=${startDate}&end_date=${endDate}`;
      } else {
        // Pass current date range filters to other periods too if needed, 
        // but usually 'monthly' implies "group by month". 
        // If user wants specific range for the current period view:
        if (startDate || endDate) {
          url += `?start_date=${startDate || ''}&end_date=${endDate || ''}`;
        }
      }

      const response = await axios.get(url);
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
          username: userForm.username // Include username in update
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

  const exportToCSV = (data, filename) => {
    if (!data || !data.length) {
      toast.error('No data to export');
      return;
    }

    // Process data to include items and customer name
    const processedData = data.map(sale => {
      // Format items list
      const itemsList = sale.items && sale.items.length > 0
        ? sale.items.map(item => `${item.quantity}x ${item.product_name} (${item.tire_size})`).join('; ')
        : `${sale.items_count || 0} items`;

      // Customer name fallback
      const customerName = sale.customer_name || (sale.customer_id ? `Customer #${sale.customer_id}` : 'Walk-In');

      return {
        'Date': new Date(sale.created_at).toLocaleDateString() + ' ' + new Date(sale.created_at).toLocaleTimeString(),
        'Sale ID': sale.id,
        'Customer': customerName,
        'Cashier': sale.cashier_name || sale.cashier_id,
        'Items': itemsList,
        'Total Amount': sale.total_amount,
        'Payment Method': sale.payment_method,
        'Status': sale.status
      };
    });

    const headers = Object.keys(processedData[0]);
    const csvContent = [
      headers.join(','),
      ...processedData.map(row => headers.map(header => `"${String(row[header]).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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

      // Check if input looks like CSV (contains commas and newlines)
      if (importData.includes(',') && importData.includes('\n')) {
        // Rudimentary CSV Parser
        const lines = importData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        // Map CSV headers to API fields
        const fieldMap = {
          'product name': 'name',
          'product': 'name',
          'name': 'name',
          'barcode': 'barcode',
          'sku': 'sku',
          'brand': 'brand',
          'category': 'category',
          'price': 'price',
          'cost': 'cost',
          'stock': 'stock',
          'tire_size': 'tire_size',
          'tire size': 'tire_size'
        };

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const values = lines[i].split(',');
          const product = {};

          headers.forEach((header, index) => {
            const mappedField = fieldMap[header] || header;
            if (values[index]) {
              product[mappedField] = values[index].trim();
            }
          });

          if (product.name && product.price) {
            productsToImport.push({
              ...product,
              stock: parseInt(product.stock) || 0,
              price: parseFloat(product.price) || 0,
              cost: parseFloat(product.cost) || 0
            });
          }
        }
      } else {
        // Try parsing as JSON
        productsToImport = JSON.parse(importData);
        if (!Array.isArray(productsToImport)) {
          throw new Error('Data must be an array');
        }
      }

      if (productsToImport.length === 0) {
        toast.error('No valid products found in the data');
        return;
      }

      const response = await axios.post('/api/products/bulk', { products: productsToImport });

      toast.success(`Successfully imported ${response.data.imported} products`);
      if (response.data.errors && response.data.errors.length > 0) {
        toast.error(`Failed to import ${response.data.errors.length} products`);
        console.error('Import errors:', response.data.errors);
      }

      setShowImportModal(false);
      setImportData('');
      fetchProducts();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Invalid data format. Please check JSON or CSV syntax.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSVTemplate = () => {
    const headers = 'name,sku,price,cost,stock,min_stock,category,brand,tire_size,description';
    const sample = 'Example Tire,TIRE-001,1500,1000,10,5,Passenger Tires,Michelin,225/65/17,A great tire';
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${sample}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderCheckout = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Left Panel: Product Selection */}
      <div className="lg:col-span-2 flex flex-col gap-4 h-full">
        {/* Search & Scan */}
        <div className="bg-white p-4 rounded-xl shadow-sm border flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={checkoutSearchTerm}
              onChange={(e) => {
                setCheckoutSearchTerm(e.target.value);
                searchProducts(e.target.value);
                setShowProductSearch(true);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <form onSubmit={handleBarcodeSubmit} className="flex-1">
            <div className="relative">
              <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan barcode..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </form>
        </div>

        {/* Product Grid / Search Results */}
        <div className="bg-white p-4 rounded-xl shadow-sm border flex-1 overflow-auto">
          {showProductSearch && checkoutSearchTerm ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {searchResults.map(product => (
                <button
                  key={product.id}
                  onClick={() => {
                    addToCart(product);
                    setCheckoutSearchTerm('');
                    setShowProductSearch(false);
                  }}
                  className="p-4 border rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group"
                >
                  <div className="font-semibold text-gray-900 group-hover:text-blue-600 truncate">{product.name}</div>
                  <div className="text-sm text-gray-500 mb-2">{product.brand}</div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">{formatCurrency(product.price)}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${product.stock > 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.stock} left
                    </span>
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && !isSearching && (
                <div className="col-span-full text-center py-8 text-gray-500">No products found</div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Search or scan products to add to cart</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Cart & Payment */}
      <div className="flex flex-col gap-4 h-full">
        <div className="bg-white p-4 rounded-xl shadow-sm border flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Current Sale
            </h3>
            <button onClick={() => setCart([])} className="text-red-600 hover:text-red-700 text-sm">Clear Cart</button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-500">{formatCurrency(item.price)} x {item.quantity}</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-white rounded shadow-sm"><Minus className="w-4 h-4" /></button>
                  <span className="w-8 text-center font-bold">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-white rounded shadow-sm"><Plus className="w-4 h-4" /></button>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 ml-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="text-center py-8 text-gray-400">Cart is empty</div>
            )}
          </div>

          {/* Totals Section */}
          <div className="mt-4 pt-4 border-t space-y-2">
            {/* Discount Controls */}
            <div className="flex gap-2 mb-2">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="percentage">Discount %</option>
                <option value="fixed">Fixed Off</option>
              </select>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="w-20 text-sm border rounded px-2 py-1"
              />
            </div>

            {/* VAT Toggle */}
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-600">VAT Exempt?</label>
              <input
                type="checkbox"
                checked={isVatExempt}
                onChange={(e) => setIsVatExempt(e.target.checked)}
                className="rounded text-blue-600"
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(calculateTotal().subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(calculateTotal().discount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT ({isVatExempt ? '0' : (settings.vat_rate?.value || 12)}%)</span>
              <span>{formatCurrency(calculateTotal().vat)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(calculateTotal().total)}</span>
            </div>
          </div>
        </div>

        {/* Customer & Pay */}
        <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <div className="flex gap-2">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button onClick={() => openCustomerModal()} className="p-2 border rounded-lg hover:bg-gray-50"><Plus className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Partial Payment Toggle */}
          <div className="mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPartialPayment}
                onChange={(e) => setIsPartialPayment(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="text-sm font-medium text-gray-700">Down Payment / Partial Payment</span>
            </label>
          </div>

          {isPartialPayment && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">
                  Amount to Pay Now *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="Enter initial payment"
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-blue-700 mt-1 font-bold">
                  Balance: {formatCurrency(parseFloat(calculateTotal().total) - (parseFloat(amountPaid) || 0))}
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-bold">₱</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentReceived}
                  onChange={(e) => setPaymentReceived(e.target.value)}
                  className="pl-8 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                  placeholder="0.00"
                />
                <button
                  onClick={() => setPaymentReceived(calculateTotal().total.toFixed(2))}
                  className="absolute inset-y-0 right-0 px-3 py-1 m-1 text-xs font-bold text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                >
                  Exact Amount
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">
                  Payment Deadline *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDeadline}
                  onChange={(e) => setPaymentDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="grid grid-cols-2 gap-2">
            {['cash', 'card', 'gcash', 'bank_transfer'].map(method => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border ${paymentMethod === method ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                {method.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          {/* Amount Paid (Full Payment Only) */}
          {!isPartialPayment && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (Full)</label>
              <input
                type="number"
                value={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-lg"
                placeholder="0.00"
              />
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || loading}
            className="w-full btn btn-primary py-3 text-lg"
          >
            {loading ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
  const searchProducts = useCallback(async (searchTerm, page = 1, limit = 50) => {
    if (!searchTerm || searchTerm.trim() === '') {
      setSearchResults([]);
      setSearchPagination({ page: 1, limit: 50, total: 0, pages: 1 });
      return;
    }

    try {
      setIsSearching(true);
      const response = await axios.get(`/api/products?search=${encodeURIComponent(searchTerm)}&page=${page}&limit=${limit}`);
      setSearchResults(response.data.products || []);
      if (response.data.pagination) {
        setSearchPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error('Failed to search products');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    try {
      const response = await axios.get(`/api/products/barcode/${barcode}`);
      const product = response.data;

      if (product.stock <= 0) {
        toast.error('Product is out of stock');
        return;
      }

      addToCart(product);
      setBarcode('');
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Product not found');
      } else {
        toast.error('Error scanning barcode');
      }
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('Insufficient stock');
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.id !== productId));
      return;
    }
    // const product = products.find(p => p.id === productId) || searchResults.find(p => p.id === productId);
    // If not found in current lists, finding it in cart is safer but stock might be stale.
    // Ideally we should check against strict stock, but for now relying on cart item's original data if available
    const cartItem = cart.find(item => item.id === productId);

    if (cartItem && newQuantity > cartItem.stock) {
      toast.error('Insufficient stock');
      return;
    }

    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let discountAmount = 0;
    if (discountValue > 0) {
      if (discountType === 'percentage') {
        discountAmount = subtotal * (discountValue / 100);
      } else {
        discountAmount = Math.min(discountValue, subtotal);
      }
    }

    const afterDiscount = subtotal - discountAmount;

    // VAT Logic: If Exempt is ON, VAT is 0. Else use Settings rate.
    const vatRate = isVatExempt ? 0 : parseFloat(settings.vat_rate?.value || 12) / 100;
    const vat = afterDiscount * vatRate;
    const total = afterDiscount + vat;

    return {
      subtotal: subtotal.toFixed(2),
      discount: discountAmount.toFixed(2),
      vat: vat.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    const totals = calculateTotal();
    const totalAmount = parseFloat(totals.total);
    const received = parseFloat(paymentReceived) || 0;

    // Validation for Full Payment
    if (!isPartialPayment && paymentMethod === 'cash' && received < totalAmount) {
      toast.error('Insufficient payment');
      return;
    }

    // Validation for Partial Payment
    if (isPartialPayment) {
      if (!amountPaid || parseFloat(amountPaid) <= 0) {
        toast.error('Please enter a valid downpayment amount');
        return;
      }
      // You might want to validate deadline too
      if (!paymentDeadline) {
        toast.error('Please set a payment deadline');
        return;
      }
    }

    setLoading(true);
    try {
      const saleData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        })),
        payment_method: paymentMethod,
        // For partial payment, we use amountPaid as the initial payment
        payment_received: isPartialPayment ? (parseFloat(amountPaid) || 0) : (received),
        discount_amount: parseFloat(totals.discount),
        customer_id: selectedCustomerId,
        amount_paid: isPartialPayment ? (parseFloat(amountPaid) || 0) : totalAmount,
        payment_deadline: isPartialPayment ? paymentDeadline : null
      };

      const response = await axios.post('/api/sales', saleData);
      setLastSale(response.data);
      setShowReceipt(true);
      setCart([]);
      setPaymentReceived('');
      setDiscountValue(0);
      setSelectedCustomerId('');
      setIsVatExempt(false);

      // Reset partial payment state
      setIsPartialPayment(false);
      setAmountPaid('');
      setPaymentDeadline('');

      toast.success('Sale completed');
      fetchProducts(); // Update stock
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Checkout failed');
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
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={reportPeriod}
            onChange={(e) => {
              setReportPeriod(e.target.value);
              // reset dates if switching away from custom/daily?
              // keeping dates allows filtering within that period
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom Range</option>
          </select>

          {/* Date Range Pars */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                fetchReportData();
                fetchSalesReports(1, salesPagination.limit, startDate, endDate);
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Filter
            </button>
          </div>

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Summary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesHistory.map(sale => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(sale.total_amount || sale.total || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {sale.items && sale.items.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {sale.items.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="text-xs">
                            {item.quantity}x {item.product_name} ({item.tire_size || '-'})
                          </span>
                        ))}
                        {sale.items.length > 3 && (
                          <span className="text-xs text-blue-600 font-medium">+{sale.items.length - 3} more...</span>
                        )}
                      </div>
                    ) : (
                      <span>{sale.items_count || 0} items</span>
                    )}
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
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Store Name
          </label>
          <input
            type="text"
            value={settingsForm.store_name}
            onChange={(e) => setSettingsForm({ ...settingsForm, store_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          {/* Legacy VAT Rate Display (Hidden/Read-only per request) or just Currency */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            value={settingsForm.currency}
            onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="PHP">Philippine Peso (₱)</option>
            <option value="USD">US Dollar ($)</option>
            <option value="EUR">Euro (€)</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Receipt Footer Message
          </label>
          <textarea
            value={settings.receipt_footer?.value || ''}
            onChange={(e) => setSettings({ ...settings, receipt_footer: { ...settings.receipt_footer, value: e.target.value } })}
            placeholder="Thank you for your business!"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">This message will appear at the bottom of printed receipts.</p>
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
                    {cleanText(product.tire_size || product.category || 'N/A')}
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

  const printReceipt = () => {
    if (!lastSale) return;

    const printWindow = window.open('', '_blank', 'width=550,height=800');
    // Half-sheet (approx 5.5in width) Layout
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${lastSale.sale.id}</title>
        <style>
          @page { size: 5.5in 8.5in; margin: 0.5in; }
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            font-size: 11px; 
            line-height: 1.3; 
            color: #333; 
            width: 100%; 
            max-width: 500px; 
            margin: 0 auto; 
            padding: 10px;
          }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px; }
          .logo { max-width: 150px; margin-bottom: 5px; } /* Placeholder for Logo */
          .store-name { font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 5px 0; }
          .header p { margin: 2px 0; }
          .sales-order-label { color: red; font-weight: bold; font-size: 14px; margin-top: 5px; text-transform: uppercase; }

          .meta-info { margin-bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; font-size: 10px; text-transform: uppercase; }
          td { border-bottom: 1px dashed #eee; padding: 5px 0; vertical-align: top; }
          .text-right { text-align: right; }
          .qty-col { width: 30px; text-align: center; }
          
          .totals { margin-left: auto; width: 100%; border-top: 1px solid #000; padding-top: 5px; }
          .total-row { display: flex; justify-content: space-between; padding: 2px 0; }
          .grand-total { font-weight: bold; font-size: 14px; border-top: 1px double #000; margin-top: 5px; padding-top: 5px; }
          
          .footer { text-align: center; margin-top: 30px; font-size: 9px; color: #555; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <!-- Logo Placeholder -->
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">GOTIRE</div> 
          
          <div class="store-name">${settings.company_name?.value || 'Go Tire POS'}</div>
          <p>${settings.company_address?.value || ''}</p>
          <p>Tel: ${settings.phone?.value || '88212304'}</p>
          
          <div class="sales-order-label">Sales Order: <span style="text-decoration: underline; color: #000; font-weight: normal;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
        </div>

        <div class="meta-info">
          <div class="meta-row">
            <span><strong>Receipt #:</strong> ${lastSale.sale.id.toString().padStart(6, '0')}</span>
            <span><strong>Date:</strong> ${new Date().toLocaleDateString()}</span>
          </div>
          <div class="meta-row">
            <span><strong>Cashier:</strong> ${lastSale.sale.cashier_name}</span>
            <span><strong>Time:</strong> ${new Date().toLocaleTimeString()}</span>
          </div>
          <div class="meta-row">
             <span><strong>Customer:</strong> ${lastSale.sale.customer_name || 'Walk-in'}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="qty-col">Qty</th>
              <th class="text-right">Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lastSale.items.map(item => `
              <tr>
                <td>
                  <div style="font-weight:bold;">${item.product_name}</div>
                  <div style="font-size:10px; color:#666;">${item.brand || ''} ${cleanText(item.tire_size)}</div>
                </td>
                <td class="qty-col">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.unit_price)}</td>
                <td class="text-right">${formatCurrency(item.total_price)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row"><span>Subtotal:</span><span>${formatCurrency(lastSale.receipt_data?.subtotal || 0)}</span></div>
          ${lastSale.receipt_data?.discount_amount > 0 ? `
          <div class="total-row" style="color:red;"><span>Discount:</span><span>-${formatCurrency(lastSale.receipt_data.discount_amount)}</span></div>
          ` : ''}
          <div class="total-row"><span>VAT (${isVatExempt ? '0' : (settings.vat_rate?.value || 12)}%):</span><span>${formatCurrency(lastSale.receipt_data?.tax_amount || 0)}</span></div>
          <div class="total-row grand-total"><span>TOTAL:</span><span>${formatCurrency(lastSale.receipt_data?.total_amount || 0)}</span></div>
          
          <div style="margin-top: 10px; border-top: 1px dashed #999; padding-top: 5px;">
            <div class="total-row"><span>Payment (${(lastSale.sale.payment_method || 'Cash').toUpperCase()}):</span><span>${formatCurrency(lastSale.sale.payment_received || lastSale.sale.amount_paid || 0)}</span></div>
            <div class="total-row"><span>Change:</span><span>${formatCurrency(Math.max(0, (lastSale.sale.payment_received || lastSale.sale.amount_paid || 0) - lastSale.receipt_data.total_amount))}</span></div>
          </div>

           ${(lastSale.sale.total_amount - lastSale.sale.amount_paid) > 0.05 ? `
            <div class="total-row" style="color:black; font-weight:bold; border-top:1px solid #000; margin-top:5px; padding-top:5px;">
              <span>Balance Due:</span><span>${formatCurrency(lastSale.sale.total_amount - lastSale.sale.amount_paid)}</span>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>${settings.receipt_footer?.value || 'Thank you for your business!'}</p>
          <p>Please keep this receipt for warranty purposes.</p>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
  };


  const renderTransactionModals = () => (
    <>
      {/* Product Search Modal */}
      {
        showProductSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold">Search Products</h3>
                <button onClick={() => setShowProductSearch(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 border-b bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search by name, sku, brand..."
                    value={checkoutSearchTerm}
                    onChange={(e) => {
                      setCheckoutSearchTerm(e.target.value);
                      searchProducts(e.target.value);
                    }}
                    className="w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 text-lg"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {searchResults.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">No products found</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { addToCart(p); setCheckoutSearchTerm(''); setShowProductSearch(false); }}
                        className={`text-left p-4 border rounded-xl hover:border-blue-500 hover:shadow-md transition-all ${p.stock <= 0 ? 'opacity-50 bg-gray-50' : 'bg-white'}`}
                        disabled={p.stock <= 0}
                      >
                        <h4 className="font-bold text-gray-900">{p.name}</h4>
                        <div className="flex justify-between items-end mt-2">
                          <div>
                            <p className="text-sm text-gray-500">{p.brand}</p>
                            <p className={`text-sm font-bold ${p.stock <= 5 ? 'text-red-500' : 'text-green-600'}`}>{p.stock} in stock</p>
                          </div>
                          <span className="text-lg font-bold text-blue-600">{formatCurrency(p.price)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Receipt Modal */}
      {
        showReceipt && lastSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Sale Completed!</h3>
              <p className="text-gray-600 mb-6">Transaction #{lastSale.sale.id} successful</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => printReceipt()} className="px-6 py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 flex items-center gap-2">
                  <Printer className="w-5 h-5" /> Print Receipt
                </button>
                <button onClick={() => setShowReceipt(false)} className="px-6 py-3 border border-gray-300 rounded-lg font-bold hover:bg-gray-50">
                  New Sale
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
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
                placeholder=""
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
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold mb-1">Format Requirement:</p>
                <p>Supports JSON array or CSV format.</p>
                <p className="mt-1"><strong>CSV Headers:</strong> name, sku, price, cost, stock, min_stock, category, brand, tire_size, description</p>
              </div>
              <button
                onClick={downloadCSVTemplate}
                className="text-blue-600 hover:text-blue-800 underline text-xs font-semibold"
              >
                Download CSV Template
              </button>
            </div>
            <pre className="mt-2 text-xs overflow-x-auto bg-white p-2 border rounded">
              {"Example CSV:\nSample Tire,TIRE-001,1500,1000,10,5,Passenger Tires,Michelin,225/65/17,Description"}
            </pre>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data (JSON or CSV)
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
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
    { id: 'checkout', label: 'Checkout', icon: ShoppingCart },
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
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter payment amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  const balance = (selectedSale?.total_amount || 0) - (selectedSale?.amount_paid || 0);
                  setPaymentAmount(balance.toFixed(2));
                }}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 whitespace-nowrap text-sm font-bold"
              >
                Exact Amount
              </button>
            </div>
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
          {activeTab === 'checkout' && renderCheckout()}
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