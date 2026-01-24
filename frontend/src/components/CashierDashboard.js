import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  ShoppingCart,
  Scan,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  DollarSign,
  Receipt,
  LogOut,
  History,
  Search,
} from 'lucide-react';

const CashierDashboard = () => {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcode, setBarcode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReceived, setPaymentReceived] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [themeColor, setThemeColor] = useState(user?.theme_color || '#dc2626');
  const [salesHistory, setSalesHistory] = useState([]);
  const [salesPagination, setSalesPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPagination, setSearchPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [isSearching, setIsSearching] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const [overrideDiscount, setOverrideDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [manualPrice, setManualPrice] = useState('');
  const [settings, setSettings] = useState({});
  const barcodeInputRef = useRef(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
  const [productHistory, setProductHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [isVatExempt, setIsVatExempt] = useState(false);

  // Currency formatting helper
  const formatCurrency = (amount) => {
    const currency = settings.currency?.value || 'PHP';
    const symbols = {
      'PHP': '₱',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };
    const symbol = symbols[currency] || '₱';
    return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Admin override barcode (secret)
  const ADMIN_OVERRIDE_BARCODE = 'ADMIN_OVERRIDE_2024';

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products?limit=100');
      setProducts(response.data.products || []);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

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

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      setSettings(response.data || {});
    } catch (error) {
      console.error('Failed to load settings');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Failed to load customers');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSettings();
    fetchCustomers();
    // Focus barcode input on component mount
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Apply user theme color
  useEffect(() => {
    if (user?.theme_color) {
      document.documentElement.style.setProperty('--theme-color', user.theme_color);
    }
  }, [user]);

  // Debounced search when search term changes in product search modal
  useEffect(() => {
    if (showProductSearch && searchTerm) {
      const timeoutId = setTimeout(() => {
        searchProducts(searchTerm, 1, 50);
      }, 300); // 300ms debounce
      return () => clearTimeout(timeoutId);
    } else if (showProductSearch && !searchTerm) {
      setSearchResults([]);
      setSearchPagination({ page: 1, limit: 50, total: 0, pages: 1 });
    }
  }, [searchTerm, showProductSearch, searchProducts]);

  const fetchSalesHistory = async (page = 1, limit = 20) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      let queryParams = `page=${page}&limit=${limit}&start_date=${today}&end_date=${today}`;
      if (user.role !== 'admin') queryParams += `&cashier_id=${user.id}`;
      const response = await axios.get(`/api/sales?${queryParams}`);
      setSalesHistory(response.data.sales || []);
      if (response.data.pagination) {
        setSalesPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error('Failed to load sales history');
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

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/customers', newCustomer);
      toast.success('Customer added successfully!');
      setCustomers([...customers, response.data]);
      setSelectedCustomerId(response.data.id);
      setShowAddCustomerModal(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    // Check for admin override barcode
    if (barcode === ADMIN_OVERRIDE_BARCODE) {
      if (user.role === 'admin') {
        setAdminOverride(true);
        toast.success('Admin override activated');
      } else {
        toast.error('Access denied');
      }
      setBarcode('');
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
      return;
    }

    try {
      const response = await axios.get(`/api/products/barcode/${barcode}`);
      const product = response.data;

      if (product.stock <= 0) {
        toast.error('Product is out of stock');
        return;
      }

      addToCart(product);
      setBarcode('');

      // Refocus barcode input
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Product not found - Use search to find manually');
        setShowProductSearch(true);
      } else {
        toast.error('Error scanning barcode');
      }
    }
  };

  const addToCart = (product, customPrice = null) => {
    const existingItem = cart.find(item => item.id === product.id);

    // Role-based pricing: only admin can use custom prices
    // Cashiers can only use custom prices if admin override is active
    const canEditPrice = user.role === 'admin' || adminOverride;
    const finalPrice = (canEditPrice && (customPrice || manualPrice))
      ? parseFloat(customPrice || manualPrice)
      : product.price;
    const productWithPrice = { ...product, price: finalPrice };

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('Cannot add more items than available in stock');
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1, price: finalPrice }
          : item
      ));
    } else {
      setCart([...cart, { ...productWithPrice, quantity: 1 }]);
    }

    if (canEditPrice && (customPrice || manualPrice)) {
      toast.success(`Added ${product.name} with custom price ${formatCurrency(finalPrice)}`);
    } else {
      toast.success(`Added ${product.name} to cart`);
    }

    // Reset manual price after adding
    setManualPrice('');
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (newQuantity > product.stock) {
      toast.error('Cannot add more items than available in stock');
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

  const clearCart = () => {
    setCart([]);
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // Only admin can apply discounts (or cashier with admin override)
    const canApplyDiscount = user.role === 'admin' || adminOverride;

    // Calculate discount based on type
    let discountAmount = 0;
    if (canApplyDiscount && overrideDiscount > 0) {
      if (discountType === 'percentage') {
        discountAmount = subtotal * (overrideDiscount / 100);
      } else {
        // Fixed amount discount
        discountAmount = Math.min(overrideDiscount, subtotal); // Can't discount more than subtotal
      }
    }

    const afterDiscount = subtotal - discountAmount;

    // VAT calculation - exempt if admin sets VAT exempt
    const vatRate = (isVatExempt && user.role === 'admin') ? 0 : parseFloat(settings.vat_rate?.value || settings.tax_rate?.value || 12) / 100;
    const vat = afterDiscount * vatRate;
    const total = afterDiscount + vat;
    return {
      subtotal: subtotal.toFixed(2),
      discount: discountAmount.toFixed(2),
      vat: vat.toFixed(2),
      total: total.toFixed(2),
      discountType,
      vatRate: (vatRate * 100).toFixed(1)
    };
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Validate customer selection
    if (!selectedCustomerId) {
      toast.error('Please select a customer or add a new customer');
      return;
    }

    const totals = calculateTotal();
    const paymentAmount = parseFloat(paymentReceived) || 0;

    if (paymentMethod === 'cash' && !paymentReceived) {
      toast.error('Please enter amount received');
      return;
    }

    if (paymentMethod === 'cash' && paymentAmount < parseFloat(totals.total)) {
      toast.error('Insufficient payment amount');
      return;
    }

    setLoading(true);

    try {
      const saleData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        })),
        payment_method: paymentMethod,
        payment_received: paymentAmount,
        discount_amount: parseFloat(totals.discount),
        customer_id: selectedCustomerId || null,
        amount_paid: isPartialPayment ? parseFloat(amountPaid) : parseFloat(totals.total)
      };

      const response = await axios.post('/api/sales', saleData);

      setLastSale(response.data);
      setShowReceipt(true);
      setShowCheckout(false);
      clearCart();
      setPaymentReceived('');
      setAmountPaid('');
      setIsPartialPayment(false);
      setSelectedCustomerId('');

      toast.success('Sale completed successfully!');

      // Refresh products to update stock
      fetchProducts();
    } catch (error) {
      const message = error.response?.data?.error || 'Checkout failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const printThermalReceipt = () => {
    if (!lastSale) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=400,height=600');

    // Generate thermal printer formatted HTML
    const thermalHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 5px;
            width: 80mm;
            background: white;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
            margin-bottom: 5px;
          }
          .header h1 {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 2px 0;
            text-transform: uppercase;
          }
          .header p {
            margin: 1px 0;
            font-size: 10px;
          }
          .separator {
            text-align: center;
            margin: 3px 0;
            font-size: 10px;
          }
          .item {
            margin-bottom: 3px;
            font-size: 11px;
          }
          .item-name {
            font-weight: bold;
            margin-bottom: 1px;
          }
          .item-details {
            font-size: 9px;
            color: #666;
            margin-bottom: 1px;
          }
          .item-total {
            text-align: right;
            font-weight: bold;
          }
          .totals {
            border-top: 1px dashed #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 11px;
          }
          .total-line.final {
            font-size: 13px;
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 3px;
            margin-top: 3px;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            padding-top: 5px;
            border-top: 1px dashed #000;
            font-size: 9px;
          }
          .footer p {
            margin: 1px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Go Tire Car Care Center</h1>
          <p>B2 L18-B Camarin Road, Camarin Rd, Caloocan, 1400 Metro Manila</p>
          <div class="separator">================================</div>
          <p>Sale ID: #${lastSale.sale.id}</p>
          <p>Date: ${new Date(lastSale.sale.created_at).toLocaleDateString()}</p>
          <p>Time: ${new Date(lastSale.sale.created_at).toLocaleTimeString()}</p>
          <p>Cashier: ${lastSale.sale.cashier_name}</p>
          <div class="separator">================================</div>
        </div>

        <div class="items">
          ${lastSale.items.map(item => `
            <div class="item">
              <div class="item-name">${item.product_name}</div>
              <div class="item-details">Qty: ${item.quantity} @ $${parseFloat(item.unit_price).toFixed(2)}</div>
              <div class="item-total">$${parseFloat(item.total_price).toFixed(2)}</div>
            </div>
          `).join('')}
        </div>

        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>${formatCurrency(lastSale.receipt_data.subtotal)}</span>
          </div>
          <div class="total-line">
            <span>VAT (${settings.vat_rate?.value || settings.tax_rate?.value || 12}%):</span>
            <span>${formatCurrency(lastSale.receipt_data.tax_amount)}</span>
          </div>
          <div class="separator">================================</div>
          <div class="total-line final">
            <span>TOTAL:</span>
            <span>${formatCurrency(lastSale.receipt_data.total_amount)}</span>
          </div>
          <div class="total-line">
            <span>Payment (${lastSale.sale.payment_method.toUpperCase()}):</span>
            <span>${formatCurrency(lastSale.receipt_data.payment_received || lastSale.receipt_data.total_amount)}</span>
          </div>
          <div class="total-line">
            <span>Change:</span>
            <span>${formatCurrency(lastSale.receipt_data.change_given || 0)}</span>
          </div>
        </div>

        <div class="footer">
          <div class="separator">================================</div>
          <p><strong>Thank you for your business!</strong></p>
          <p>Drive safely! 🚗</p>
          <p>Warranty: 30 days on parts</p>
          <p>Returns: 7 days with receipt</p>
          <div class="separator">================================</div>
          <p>Go Tire Car Care Center</p>
          <p>Your trusted automotive partner</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(thermalHTML);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  // Use search results if available, otherwise fall back to client-side filtering
  const filteredProducts = searchTerm && showProductSearch && searchResults.length > 0
    ? searchResults
    : products.filter(product =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.includes(searchTerm) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.tire_size?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const totals = calculateTotal();


  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <div style={{ backgroundColor: user?.theme_color || '#dc2626' }} className="p-4 rounded-xl text-white">
                  <h1 className="text-2xl font-bold">{settings?.company_name?.value || 'Go Tire Car Care Center'} POS</h1>
                  <p className="text-sm opacity-90">Welcome, {user?.username}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button onClick={logout} className="btn btn-secondary">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="pos-layout">
          {/* Main Scanning Section */}
          <div className="pos-main-section">
            {/* Primary Barcode Scanner */}
            <div className="pos-scanner-card">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">🔍 Product Scanner</h2>
                <p className="text-lg opacity-90">Scan product barcode or search manually</p>
              </div>

              <form onSubmit={handleBarcodeSubmit} className="space-y-6">
                <div className="barcode-input">
                  <Scan className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white opacity-80 w-5 h-5" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan product barcode or enter manually..."
                    className="pos-scanner-input"
                  />
                </div>

                <button type="submit" className="pos-action-btn w-full bg-white text-purple-700 font-semibold text-lg min-h-16">
                  <Plus className="w-6 h-6" />
                  Add to Cart
                </button>
              </form>

              {(user.role === 'admin' || adminOverride) && (
                <div className="pos-override-panel">
                  <h4 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                    🔓 {user.role === 'admin' ? 'Admin Pricing Controls' : 'Admin Override Active'}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-1">Custom Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(e.target.value)}
                        placeholder="Enter price"
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-1">Discount Type</label>
                      <select
                        value={discountType}
                        onChange={(e) => {
                          setDiscountType(e.target.value);
                          setOverrideDiscount(0);
                        }}
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₱)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-1">
                        {discountType === 'percentage' ? 'Discount %' : 'Discount Amount (₱)'}
                      </label>
                      <input
                        type="number"
                        step={discountType === 'percentage' ? '0.1' : '0.01'}
                        value={overrideDiscount}
                        onChange={(e) => setOverrideDiscount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                  {adminOverride && user.role !== 'admin' && (
                    <button
                      onClick={() => {
                        setAdminOverride(false);
                        setOverrideDiscount(0);
                        setManualPrice('');
                      }}
                      className="mt-3 px-4 py-2 bg-white border border-orange-300 rounded-lg text-orange-800 font-medium hover:bg-orange-50 transition-colors"
                    >
                      Disable Override
                    </button>
                  )}
                  {user.role === 'admin' && (
                    <p className="mt-3 text-sm text-orange-700">
                      ✓ Admin account - full pricing control enabled
                    </p>
                  )}
                </div>
              )}
              {user.role === 'cashier' && !adminOverride && (
                <div className="pos-override-panel bg-gray-100">
                  <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                    🔒 Cashier Account
                  </h4>
                  <p className="text-sm text-gray-600">
                    Price editing and discounts are restricted. Scan barcode ADMIN_OVERRIDE_2024 to enable admin override.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions Grid */}
            <div className="pos-action-grid">
              <button
                onClick={() => setShowProductSearch(true)}
                className="pos-action-btn"
              >
                <Search className="w-8 h-8 text-blue-500" />
                <span className="font-semibold text-gray-700">Search Products</span>
              </button>

              <button
                onClick={() => {
                  setShowHistory(true);
                  fetchSalesHistory();
                }}
                className="pos-action-btn"
              >
                <History className="w-8 h-8 text-green-500" />
                <span className="font-semibold text-gray-700">Sales History</span>
              </button>

              <button
                onClick={clearCart}
                className="pos-action-btn"
                disabled={cart.length === 0}
              >
                <Trash2 className="w-8 h-8 text-red-500" />
                <span className="font-semibold text-gray-700">Clear Cart</span>
              </button>

              <button
                onClick={() => {
                  if (barcodeInputRef.current) {
                    barcodeInputRef.current.focus();
                  }
                }}
                className="pos-action-btn"
              >
                <Scan className="w-8 h-8 text-purple-500" />
                <span className="font-semibold text-gray-700">Focus Scanner</span>
              </button>
            </div>

            {/* Instructions */}
            <div className="pos-instructions">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                💡 Quick Guide
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <p className="font-medium mb-1">🔍 Product Scanning:</p>
                  <p>Use barcode scanner or type manually</p>
                </div>
                <div>
                  <p className="font-medium mb-1">🔍 Product Search:</p>
                  <p>Find products when barcode fails</p>
                </div>
                <div>
                  <p className="font-medium mb-1">🔓 Admin Override:</p>
                  <p>Admin barcode: ADMIN_OVERRIDE_2024</p>
                </div>
                <div>
                  <p className="font-medium mb-1">⚡ Quick Entry:</p>
                  <p>Scanner stays focused for rapid entry</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cart Panel */}
          <div className="cart-panel">
            <div className="cart-header">
              <h3 className="cart-title">
                <ShoppingCart className="w-6 h-6" />
                Shopping Cart ({cart.length})
              </h3>
            </div>

            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Shopping cart is empty</p>
                  <p className="text-gray-400 text-sm">Scan products to get started</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{item.name}</h4>
                      <p className="text-sm text-gray-500">${item.price} each</p>
                    </div>
                    <div className="cart-item-controls">
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="cart-btn"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold text-lg">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="cart-btn"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="cart-btn danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-800">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <>
                <div className="cart-summary">
                  <div className="flex justify-between mb-3 text-lg">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  {adminOverride && parseFloat(totals.discount) > 0 && (
                    <div className="flex justify-between mb-3 text-lg text-orange-600">
                      <span className="font-medium">
                        Discount {totals.discountType === 'percentage' ? `(${overrideDiscount}%)` : '(Fixed)'}:
                      </span>
                      <span className="font-semibold">-{formatCurrency(totals.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between mb-3 text-lg">
                    <span className="font-medium">VAT ({settings.vat_rate?.value || settings.tax_rate?.value || 12}%):</span>
                    <span className="font-semibold">{formatCurrency(totals.vat)}</span>
                  </div>
                  <div className="flex justify-between cart-total">
                    <span className="text-xl font-bold">Total:</span>
                    <span className="text-2xl font-bold">{formatCurrency(totals.total)}</span>
                  </div>
                  {adminOverride && (
                    <div className="text-center mt-3 px-3 py-2 bg-yellow-100 rounded-lg">
                      <span className="text-sm font-medium text-yellow-800">🔓 Admin Override Active</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowCheckout(true)}
                  className="checkout-btn"
                >
                  <CreditCard className="w-5 h-5" />
                  Checkout Now
                </button>
              </>
            )}
          </div>
        </div>

        {/* Checkout Modal */}
        <div
          className="modal-overlay"
          style={{ display: showCheckout ? 'flex' : 'none' }}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Checkout</h3>
              <button
                onClick={() => setShowCheckout(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Order Summary</h4>
                <div className="bg-gray-50 p-3 rounded">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name} x{item.quantity}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 font-medium">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>${totals.total}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-select"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="digital">Digital Payment</option>
                </select>
              </div>

              {paymentMethod === 'cash' && (
                <div className="form-group">
                  <label className="form-label">Amount Received</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="exactAmount"
                      checked={paymentReceived === totals.total.toString()}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPaymentReceived(totals.total.toString());
                        } else {
                          setPaymentReceived('');
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="exactAmount" className="text-sm text-gray-700">
                      Exact Amount
                    </label>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentReceived}
                    onChange={(e) => setPaymentReceived(e.target.value)}
                    placeholder="Enter amount received"
                    className="form-input"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Change: {formatCurrency(Math.max(0, parseFloat(paymentReceived) - parseFloat(totals.total)))}
                  </p>
                </div>
              )}

              {/* Customer Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search customer..."
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="form-input w-full"
                    >
                      <option value="">Walk-in Customer</option>
                      {customers
                        .filter(c =>
                          c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                          (c.phone && c.phone.includes(customerSearchTerm))
                        )
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
                        ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    + Add New
                  </button>
                </div>
              </div>

              {/* Partial Payment Toggle */}
              <div className="mb-4">
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
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
                    className="form-input"
                  />
                  <p className="text-sm text-blue-700 mt-2 font-medium">
                    Balance Remaining: {formatCurrency(parseFloat(totals.total) - (parseFloat(amountPaid) || 0))}
                  </p>
                </div>
              )}

              {/* VAT Exempt Toggle (Admin Only) */}
              {user.role === 'admin' && (
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isVatExempt}
                      onChange={(e) => setIsVatExempt(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="text-sm font-medium text-gray-700">VAT Exempt</span>
                  </label>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="btn btn-success flex-1"
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Complete Sale
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <div
        className="modal-overlay"
        style={{ display: showReceipt && lastSale ? 'flex' : 'none' }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title">Receipt</h3>
            <button
              onClick={() => setShowReceipt(false)}
              className="modal-close"
            >
              ×
            </button>
          </div>

          <div className="receipt">
            <div className="receipt-header">
              <h3>Go Tire Car Care Center</h3>
              <p>B2 L18-B Camarin Road, Camarin Rd, Caloocan, 1400 Metro Manila</p>
              <p>================================</p>
              <p>Sale ID: #{lastSale?.sale?.id}</p>
              <p>Date: {lastSale?.sale?.created_at ? new Date(lastSale.sale.created_at).toLocaleDateString() : ''}</p>
              <p>Time: {lastSale?.sale?.created_at ? new Date(lastSale.sale.created_at).toLocaleTimeString() : ''}</p>
              <p>Cashier: {lastSale?.sale?.cashier_name}</p>
              <p>================================</p>
            </div>

            <div className="receipt-items">
              {lastSale?.items?.map(item => (
                <div key={item.id} className="receipt-item">
                  <div style={{ flex: 1 }}>
                    <div className="product-name">{item.product_name}</div>
                    <div className="product-details">
                      Qty: {item.quantity} @ ${parseFloat(item.unit_price).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    ${parseFloat(item.total_price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="receipt-total">
              <div className="receipt-item">
                <span>Subtotal:</span>
                <span>{formatCurrency(lastSale?.receipt_data?.subtotal)}</span>
              </div>
              {parseFloat(lastSale?.receipt_data?.discount_amount) > 0 && (
                <div className="receipt-item">
                  <span>Discount:</span>
                  <span>-{formatCurrency(lastSale.receipt_data.discount_amount)}</span>
                </div>
              )}
              <div className="receipt-item">
                <span>VAT ({parseFloat(settings.vat_rate?.value || 12)}%):</span>
                <span>{formatCurrency(lastSale?.receipt_data?.vat_amount || lastSale?.receipt_data?.tax_amount)}</span>
              </div>
              <div className="receipt-item">
                <span>================================</span>
              </div>
              <div className="receipt-item">
                <span><strong>TOTAL:</strong></span>
                <span><strong>{formatCurrency(lastSale?.receipt_data?.total_amount)}</strong></span>
              </div>
              <div className="receipt-item">
                <span>Payment ({lastSale?.sale?.payment_method?.toUpperCase()}):</span>
                <span>{formatCurrency(lastSale?.receipt_data?.payment_received || lastSale?.receipt_data?.total_amount)}</span>
              </div>
              <div className="receipt-item">
                <span>Change:</span>
                <span>{formatCurrency(lastSale?.receipt_data?.change_given || 0)}</span>
              </div>
              {lastSale?.sale?.status === 'pending' && (
                <div className="receipt-item" style={{ marginTop: '5px', color: 'red', fontWeight: 'bold' }}>
                  <span>BALANCE DUE:</span>
                  <span>{formatCurrency(parseFloat(lastSale.sale.total_amount) - parseFloat(lastSale.sale.amount_paid))}</span>
                </div>
              )}
            </div>

            <div className="receipt-footer">
              <p>================================</p>
              <p><strong>Thank you for your business!</strong></p>
              <p>Drive safely! 🚗</p>
              <p>Warranty: 30 days on parts</p>
              <p>Returns: 7 days with receipt</p>
              <p>================================</p>
              <p>Auto Parts Center</p>
              <p>Your trusted automotive partner</p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => printThermalReceipt()}
              className="btn btn-primary flex-1 print-button"
            >
              <Receipt className="w-4 h-4" />
              Print Receipt
            </button>
            <button
              onClick={() => setShowReceipt(false)}
              className="btn btn-outline flex-1"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Product Search Modal */}
      <div
        className="modal-overlay"
        style={{ display: showProductSearch ? 'flex' : 'none' }}
      >
        <div className="modal-content" style={{ maxWidth: '600px' }}>
          <div className="modal-header">
            <h3 className="modal-title">Search Products</h3>
            <button
              onClick={() => {
                setShowProductSearch(false);
                setSearchTerm('');
                setSearchResults([]);
              }}
              className="modal-close"
            >
              ×
            </button>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                key="product-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by product name, brand, SKU, barcode, or category..."
                className="form-input pl-10"
                autoFocus
              />
            </div>
            {searchTerm && (
              <p className="text-xs text-gray-500 mt-2">
                {isSearching ? 'Searching...' : searchPagination.total > 0 ? `Found ${searchPagination.total} product${searchPagination.total !== 1 ? 's' : ''}` : 'No products found'}
              </p>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isSearching ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500">Searching products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {searchTerm ? 'No products found matching your search' : 'Start typing to search for products'}
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className={`p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${product.stock <= 0 ? 'opacity-50' : ''
                        }`}
                      onClick={() => {
                        if (product.stock > 0) {
                          addToCart(product);
                          setShowProductSearch(false);
                          setSearchTerm('');
                          setSearchResults([]);
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-gray-500">
                            {product.brand} • {product.sku || product.tire_size} • {product.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-green-600">{formatCurrency(product.price)}</p>
                            <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductForHistory(product);
                              fetchProductHistory(product.id);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                            title="Product History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (product.stock > 0) {
                                addToCart(product);
                                setShowProductSearch(false);
                                setSearchTerm('');
                                setSearchResults([]);
                              }
                            }}
                            className="p-2 rounded-full hover:opacity-80"
                            style={{ backgroundColor: user?.theme_color || '#dc2626', color: 'white' }}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination for search results */}
                {searchPagination.pages > 1 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page {searchPagination.page} of {searchPagination.pages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => searchProducts(searchTerm, searchPagination.page - 1, searchPagination.limit)}
                        disabled={searchPagination.page === 1}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => searchProducts(searchTerm, searchPagination.page + 1, searchPagination.limit)}
                        disabled={searchPagination.page >= searchPagination.pages}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sales History Modal */}
      <div
        className="modal-overlay"
        style={{ display: showHistory ? 'flex' : 'none' }}
      >
        <div className="modal-content" style={{ maxWidth: '800px' }}>
          <div className="modal-header">
            <h3 className="modal-title">Sales History</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="modal-close"
            >
              ×
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Sale ID</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.map(sale => (
                  <tr key={sale.id}>
                    <td>#{sale.id}</td>
                    <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                    <td>${sale.total_amount}</td>
                    <td className="capitalize">{sale.payment_method}</td>
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
                  onClick={() => fetchSalesHistory(salesPagination.page - 1, salesPagination.limit)}
                  disabled={salesPagination.page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-medium text-gray-700">
                  Page {salesPagination.page} of {salesPagination.pages}
                </span>
                <button
                  onClick={() => fetchSalesHistory(salesPagination.page + 1, salesPagination.limit)}
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
                    fetchSalesHistory(1, newLimit);
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product History Modal */}
      <div
        className="modal-overlay"
        style={{ display: showHistoryModal ? 'flex' : 'none' }}
      >
        <div className="modal-content" style={{ maxWidth: '600px' }}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title">Product History</h3>
              <p className="text-sm text-gray-500">{selectedProductForHistory?.name}</p>
            </div>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="modal-close"
            >
              ×
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {productHistory.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Qty</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {productHistory.map((item, idx) => (
                    <tr key={idx}>
                      <td>{new Date(item.created_at).toLocaleDateString()}</td>
                      <td>{item.customer_name || 'Walk-in'}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
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

      {/* Add Customer Modal */}
      <div
        className="modal-overlay"
        style={{ display: showAddCustomerModal ? 'flex' : 'none' }}
      >
        <div className="modal-content" style={{ maxWidth: '500px' }}>
          <div className="modal-header">
            <h3 className="modal-title">Add New Customer</h3>
            <button
              onClick={() => {
                setShowAddCustomerModal(false);
                setNewCustomer({ name: '', phone: '', email: '', address: '' });
              }}
              className="modal-close"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input
                type="text"
                required
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Enter customer name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="Enter phone number"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="Enter email address"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder="Enter address"
                className="form-input"
                rows="3"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setNewCustomer({ name: '', phone: '', email: '', address: '' });
                }}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? 'Adding...' : 'Add Customer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CashierDashboard;

