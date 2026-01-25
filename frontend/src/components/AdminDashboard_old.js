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
  ShoppingCart,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Eye,
  Save,
  X
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState({});

  // Products data
  const [products, setProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    barcode: '',
    price: '',
    cost: '',
    stock: '',
    category: '',
    description: '',
    min_stock: ''
  });

  // Users data
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Sales data
  const [salesData, setSalesData] = useState({});
  const [salesHistory, setSalesHistory] = useState([]);

  // Settings data
  const [settings, setSettings] = useState({});

  // Backup data
  const [backups, setBackups] = useState([]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'reports') {
      fetchSalesReports();
    } else if (activeTab === 'settings') {
      fetchSettings();
    } else if (activeTab === 'backup') {
      fetchBackups();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/system/info');
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products?limit=100');
      setProducts(response.data.products || []);
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

  const fetchSalesReports = async () => {
    try {
      const response = await axios.get('/api/sales/reports/summary');
      setSalesData(response.data);

      const historyResponse = await axios.get('/api/sales?limit=50');
      setSalesHistory(historyResponse.data.sales || []);
    } catch (error) {
      toast.error('Failed to load sales reports');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      setSettings(response.data || {});
    } catch (error) {
      toast.error('Failed to load settings');
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

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      await axios.post('/api/backup/create');
      toast.success('Backup created successfully');
      fetchBackups();
    } catch (error) {
      toast.error('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  // Product Management Functions
  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name || '',
        barcode: product.barcode || '',
        price: product.price || '',
        cost: product.cost || '',
        stock: product.stock || '',
        category: product.category || '',
        description: product.description || '',
        min_stock: product.min_stock || ''
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        barcode: '',
        price: '',
        cost: '',
        stock: '',
        category: '',
        description: '',
        min_stock: ''
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
        price: parseFloat(productForm.price),
        cost: parseFloat(productForm.cost || 0),
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
      fetchProducts();
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
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  // Analytics Data Processing
  const getAnalyticsData = () => {
    if (!salesHistory.length) return { dailySales: [], topProducts: [], lowStockProducts: [] };

    // Daily sales for the last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTotal = salesHistory
        .filter(sale => sale.created_at?.startsWith(dateStr))
        .reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);

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

    return { dailySales: last7Days, topProducts, lowStockProducts };
  };

  const analytics = getAnalyticsData();

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{products.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-3xl font-bold text-red-600">{analytics.lowStockProducts.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales (7d)</p>
                <p className="text-3xl font-bold text-green-600">
                  ${analytics.dailySales.reduce((sum, day) => sum + day.sales, 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-purple-600">{users.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Trend Chart */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Sales']} />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products Chart */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alert */}
        {analytics.lowStockProducts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-red-800">Low Stock Alert</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.lowStockProducts.map(product => (
                <div key={product.id} className="bg-white rounded-lg p-4 border border-red-200">
                  <h4 className="font-medium text-gray-900">{product.name}</h4>
                  <p className="text-sm text-gray-600">Stock: {product.stock}</p>
                  <p className="text-sm text-red-600">Min Stock: {product.min_stock || 5}</p>
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
        <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
        <button
          onClick={() => openProductModal()}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map(product => (
                <tr key={product.id} className={product.stock <= (product.min_stock || 5) ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-gray-500">{product.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.barcode || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${product.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${product.stock <= (product.min_stock || 5) ? 'text-red-600' : 'text-gray-900'
                        }`}>
                        {product.stock}
                      </span>
                      {product.stock <= (product.min_stock || 5) && (
                        <AlertTriangle className="w-4 h-4 text-red-500 ml-2" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {product.category || 'Uncategorized'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openProductModal(product)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
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

  // Product Modal Component
  const ProductModal = () => (
    showProductModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                <input
                  type="text"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
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
    )
  );
  <p className="stat-value">{dashboardData.database?.total_sales || 0}</p>
              </div >
  <ShoppingCart className="w-8 h-8 text-purple-500" />
            </div >
          </div >
          
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Today's Sales</p>
                <p className="stat-value">{dashboardData.database?.today_sales || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Today's Revenue</p>
                <p className="stat-value">${dashboardData.database?.today_revenue || '0.00'}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Server Uptime</p>
                <p className="stat-value">{Math.floor((dashboardData.server?.uptime || 0) / 3600)}h</p>
              </div>
              <TrendingUp className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
        </div >
      </div >
    );
  };
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div className="card">
    <h3 className="card-title mb-4">Quick Actions</h3>
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => setActiveTab('products')}
        className="btn btn-primary"
      >
        <Package className="w-4 h-4" />
        Manage Products
      </button>
      <button
        onClick={() => setActiveTab('users')}
        className="btn btn-secondary"
      >
        <Users className="w-4 h-4" />
        Manage Users
      </button>
      <button
        onClick={() => setActiveTab('reports')}
        className="btn btn-success"
      >
        <BarChart3 className="w-4 h-4" />
        View Reports
      </button>
      <button
        onClick={handleCreateBackup}
        disabled={loading}
        className="btn btn-outline"
      >
        <Database className="w-4 h-4" />
        Create Backup
      </button>
    </div>
  </div>

  <div className="card">
    <h3 className="card-title mb-4">System Status</h3>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Database Status</span>
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Online</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Backup System</span>
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Active</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Memory Usage</span>
        <span className="text-sm text-gray-800">
          {Math.round((dashboardData.server?.memory?.used || 0) / 1024 / 1024)}MB
        </span>
      </div>
    </div>
  </div>
</div>
    </div >
  );

const renderProducts = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
      <button
        onClick={() => {
          setEditingProduct(null);
          setShowProductModal(true);
        }}
        className="btn btn-primary"
      >
        <Plus className="w-4 h-4" />
        Add Product
      </button>
    </div>

    <div className="card">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Barcode</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td className="font-medium">{product.name}</td>
                <td className="text-sm text-gray-600">{product.barcode || 'N/A'}</td>
                <td className="text-sm">{product.category || 'N/A'}</td>
                <td className="font-medium">${product.price}</td>
                <td>
                  <span className={`px-2 py-1 rounded text-sm ${product.stock > 10 ? 'bg-green-100 text-green-800' :
                      product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                    {product.stock}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProduct(product);
                        setShowProductModal(true);
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="btn btn-danger btn-sm"
                    >
                      <Trash2 className="w-3 h-3" />
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
        onClick={() => {
          setEditingUser(null);
          setShowUserModal(true);
        }}
        className="btn btn-primary"
      >
        <Plus className="w-4 h-4" />
        Add User
      </button>
    </div>

    <div className="card">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td className="font-medium">{user.username}</td>
                <td>{user.full_name || 'N/A'}</td>
                <td>
                  <span className={`px-2 py-1 rounded text-sm capitalize ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                    {user.role}
                  </span>
                </td>
                <td className="text-sm text-gray-600">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setShowUserModal(true);
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="btn btn-danger btn-sm"
                    >
                      <Trash2 className="w-3 h-3" />
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
    <h2 className="text-2xl font-bold text-gray-900">Sales Reports</h2>

    {salesData.summary && (
      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Total Sales</p>
          <p className="stat-value">{salesData.summary.total_sales || 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Revenue</p>
          <p className="stat-value">${salesData.summary.total_revenue || '0.00'}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Average Sale</p>
          <p className="stat-value">${salesData.summary.average_sale || '0.00'}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Tax</p>
          <p className="stat-value">${salesData.summary.total_tax || '0.00'}</p>
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {salesData.payment_methods && (
        <div className="card">
          <h3 className="card-title mb-4">Payment Methods</h3>
          <div className="space-y-2">
            {salesData.payment_methods.map(method => (
              <div key={method.payment_method} className="flex justify-between items-center">
                <span className="capitalize">{method.payment_method}</span>
                <div className="text-right">
                  <div className="font-medium">${method.total}</div>
                  <div className="text-sm text-gray-500">{method.count} sales</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {salesData.top_products && (
        <div className="card">
          <h3 className="card-title mb-4">Top Products</h3>
          <div className="space-y-2">
            {salesData.top_products.slice(0, 5).map(product => (
              <div key={product.name} className="flex justify-between items-center">
                <span className="text-sm">{product.name}</span>
                <div className="text-right">
                  <div className="font-medium">{product.total_sold} sold</div>
                  <div className="text-sm text-gray-500">${product.total_revenue}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    <div className="card">
      <h3 className="card-title mb-4">Recent Sales</h3>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Sale ID</th>
              <th>Cashier</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {salesHistory.slice(0, 10).map(sale => (
              <tr key={sale.id}>
                <td>#{sale.id}</td>
                <td>{sale.cashier_name}</td>
                <td className="font-medium">${sale.total_amount}</td>
                <td className="capitalize">{sale.payment_method}</td>
                <td className="text-sm text-gray-600">
                  {new Date(sale.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const renderSettings = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="card-title mb-4">Store Information</h3>
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Store Name</label>
            <input
              type="text"
              value={settings.company_name?.value || ''}
              onChange={(e) => updateSetting('company_name', e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Store Address</label>
            <textarea
              value={settings.company_address?.value || ''}
              onChange={(e) => updateSetting('company_address', e.target.value)}
              className="form-input"
              rows="3"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Receipt Footer</label>
            <input
              type="text"
              value={settings.receipt_footer?.value || ''}
              onChange={(e) => updateSetting('receipt_footer', e.target.value)}
              className="form-input"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title mb-4">Tax & Currency</h3>
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Tax Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={settings.tax_rate?.value || ''}
              onChange={(e) => updateSetting('tax_rate', e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select
              value={settings.currency?.value || 'USD'}
              onChange={(e) => updateSetting('currency', e.target.value)}
              className="form-select"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div className="card">
      <h3 className="card-title mb-4">Backup Settings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label className="form-label">Backup Interval (minutes)</label>
          <input
            type="number"
            value={settings.backup_interval?.value || ''}
            onChange={(e) => updateSetting('backup_interval', e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Backup Retention (days)</label>
          <input
            type="number"
            value={settings.backup_retention?.value || ''}
            onChange={(e) => updateSetting('backup_retention', e.target.value)}
            className="form-input"
          />
        </div>
      </div>
    </div>

    <div className="flex justify-end">
      <button
        onClick={handleSaveSettings}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? (
          <>
            <div className="spinner"></div>
            Saving...
          </>
        ) : (
          'Save Settings'
        )}
      </button>
    </div>
  </div>
);

const renderBackup = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-gray-900">Database Backup</h2>
      <button
        onClick={handleCreateBackup}
        disabled={loading}
        className="btn btn-primary"
      >
        <Database className="w-4 h-4" />
        Create Backup
      </button>
    </div>

    <div className="card">
      <h3 className="card-title mb-4">Available Backups</h3>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Size</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {backups.map(backup => (
              <tr key={backup.filename}>
                <td className="font-medium">{backup.filename}</td>
                <td>{Math.round(backup.size / 1024)} KB</td>
                <td className="text-sm text-gray-600">
                  {new Date(backup.created_at).toLocaleString()}
                </td>
                <td>
                  <button
                    onClick={() => handleRestoreBackup(backup.filename)}
                    className="btn btn-outline btn-sm"
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// Helper functions
const updateSetting = (key, value) => {
  setSettings(prev => ({
    ...prev,
    [key]: { ...prev[key], value }
  }));
};

const handleSaveSettings = async () => {
  setLoading(true);
  try {
    const settingsToSave = {};
    Object.keys(settings).forEach(key => {
      settingsToSave[key] = settings[key].value;
    });

    await axios.put('/api/settings', { settings: settingsToSave });
    toast.success('Settings saved successfully');
  } catch (error) {
    toast.error('Failed to save settings');
  } finally {
    setLoading(false);
  }
};

const handleDeleteProductDuplicate = async (productId) => {
  if (!window.confirm('Are you sure you want to delete this product?')) return;

  try {
    await axios.delete(`/api/products/${productId}`);
    toast.success('Product deleted successfully');
    fetchProducts();
  } catch (error) {
    const message = error.response?.data?.error || 'Failed to delete product';
    toast.error(message);
  }
};

const handleDeleteUser = async (userId) => {
  if (!window.confirm('Are you sure you want to delete this user?')) return;

  try {
    await axios.delete(`/api/users/${userId}`);
    toast.success('User deleted successfully');
    fetchUsers();
  } catch (error) {
    const message = error.response?.data?.error || 'Failed to delete user';
    toast.error(message);
  }
};

const handleRestoreBackup = async (filename) => {
  if (!window.confirm('Are you sure you want to restore this backup? This will overwrite the current database.')) return;

  setLoading(true);
  try {
    await axios.post(`/api/backup/restore/${filename}`);
    toast.success('Backup restored successfully');
    fetchBackups();
  } catch (error) {
    toast.error('Failed to restore backup');
  } finally {
    setLoading(false);
  }
};

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'backup', label: 'Backup', icon: Database },
];

return (
  <div className="min-h-screen bg-gray-50">
    {/* Header */}
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">POS Admin Panel</h1>
            <p className="text-sm text-gray-600">Welcome, {user?.full_name || user?.username}</p>
          </div>
          <button onClick={logout} className="btn btn-secondary">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </header>

    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <nav>
          <ul className="sidebar-nav">
            {sidebarItems.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all ${activeTab === item.id ? 'bg-blue-50 text-blue-600 border-r-3 border-blue-600' : ''}`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'backup' && renderBackup()}
      </main>
    </div>
  </div>
);
};

export default AdminDashboard;
