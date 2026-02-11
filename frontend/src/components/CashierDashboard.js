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
  // eslint-disable-next-line no-unused-vars
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
  const [paymentDeadline, setPaymentDeadline] = useState('');

  // Validation state
  const [showOverrideLogin, setShowOverrideLogin] = useState(false);
  const [overrideUsername, setOverrideUsername] = useState('');
  const [overridePassword, setOverridePassword] = useState('');

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

  // Admin override handler
  const handleOverrideLogin = async (e) => {
    e.preventDefault();
    try {
      // Direct login check for admin connection
      const response = await axios.post('/api/auth/login', {
        username: overrideUsername,
        password: overridePassword
      });

      if (response.data.user.role === 'admin') {
        setAdminOverride(true);
        toast.success('Admin override enabled successfully');
        setShowOverrideLogin(false);
        setOverrideUsername('');
        setOverridePassword('');
      } else {
        toast.error('Provided account is not an admin');
      }
    } catch (error) {
      toast.error('Invalid credentials');
    }
  };

  const printReceipt = () => {
    if (!lastSale) return;

    const printWindow = window.open('', '_blank', 'width=550,height=800');
    // Half-sheet (approx 5.5in x 8.5in) Layout
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${lastSale.sale.id}</title>
        <style>
          @page { size: 5.5in 8.5in; margin: 10mm; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #333; max-width: 5.5in; margin: 0 auto; padding: 10px; }
          .sales-order { text-align: center; color: red; font-size: 18px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
          .header h1 { font-size: 20px; font-weight: bold; margin: 0 0 5px 0; color: #000; text-transform: uppercase; }
          .header p { margin: 2px 0; font-size: 12px; }
          .meta-info { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .meta-left { text-align: left; }
          .meta-right { text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { text-align: left; border-bottom: 2px solid #ddd; padding: 6px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
          td { border-bottom: 1px solid #eee; padding: 6px; vertical-align: top; }
          .text-right { text-align: right; }
          .totals { margin-left: auto; width: 250px; }
          .total-row { display: flex; justify-content: space-between; padding: 3px 0; }
          .grand-total { font-weight: bold; font-size: 14px; border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; }
          .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #777; border-top: 1px solid #eee; padding-top: 15px; }
          .brand-logo { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="sales-order">Sales Order</div>
        <div class="header">
          <h1>${settings.company_name?.value || 'Go Tire POS'}</h1>
          <p>${settings.company_address?.value || ''}</p>
          <p>Tel: ${settings.phone?.value || '88212304'}</p>
        </div>

        <div class="meta-info">
          <div class="meta-left">
            <p><strong>Customer:</strong> ${lastSale.sale.customer_name || 'Walk-in'}</p>
            <p><strong>Cashier:</strong> ${lastSale.sale.cashier_name}</p>
          </div>
          <div class="meta-right">
            <p><strong>Receipt #:</strong> ${lastSale.sale.id.toString().padStart(6, '0')}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lastSale.items.map(item => `
              <tr>
                <td>
                  <div style="font-weight:bold;">${item.product_name}</div>
                  <div style="font-size:11px; color:#666;">${item.brand || ''} ${item.tire_size ? item.tire_size.replace(/\?/g, ' ') : ''}</div>
                </td>
                <td class="text-right">${item.quantity}</td>
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
          <br/>
          <div class="total-row"><span>Payment Method:</span><span>${(lastSale.sale.payment_method || 'Cash').toUpperCase()}</span></div>
          <div class="total-row"><span>Amount Paid:</span><span>${formatCurrency(lastSale.sale.payment_received || lastSale.sale.amount_paid || 0)}</span></div>
          <div class="total-row"><span>Change:</span><span>${formatCurrency(Math.max(0, (lastSale.sale.payment_received || lastSale.sale.amount_paid || 0) - lastSale.receipt_data.total_amount))}</span></div>
          
           ${(lastSale.sale.total_amount - lastSale.sale.amount_paid) > 0.01 ? `
            <div class="total-row" style="color:orange; font-weight:bold; border-top:1px dashed #ccc; margin-top:5px; padding-top:5px;">
              <span>Balance Due:</span><span>${formatCurrency(lastSale.sale.total_amount - lastSale.sale.amount_paid)}</span>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>${settings.receipt_footer?.value || 'Thank you for your business!'}</p>
          <p style="font-size:10px; margin-top:5px;">System Generated Receipt</p>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
  };

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

    // Check for admin override trigger (hidden shortcut)
    if (barcode === 'ADMIN_LOGIN') {
      setShowOverrideLogin(true);
      setBarcode('');
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

    if (paymentMethod === 'cash' && !isPartialPayment && !paymentReceived) {
      toast.error('Please enter amount received');
      return;
    }

    // Only validate full payment if NOT a partial payment
    if (!isPartialPayment && paymentMethod === 'cash' && paymentAmount < parseFloat(totals.total)) {
      toast.error('Insufficient payment amount');
      return;
    }

    if (isPartialPayment && (!amountPaid || parseFloat(amountPaid) <= 0)) {
      toast.error('Please enter a valid downpayment amount');
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

        amount_paid: isPartialPayment ? parseFloat(amountPaid) : parseFloat(totals.total),
        payment_deadline: isPartialPayment ? paymentDeadline : null
      };

      const response = await axios.post('/api/sales', saleData);

      setLastSale(response.data);
      setShowReceipt(true);
      setShowCheckout(false);
      clearCart();
      setPaymentReceived('');
      setAmountPaid('');
      setPaymentDeadline('');
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
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                    🔓 {user.role === 'admin' ? 'Admin Pricing Controls' : 'Admin Override Active'}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">Custom Price</label>
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
                      <label className="block text-sm font-medium text-white mb-1">Discount Type</label>
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
                      <label className="block text-sm font-medium text-white mb-1">
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
                <div className="pos-override-panel bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                    🔒 Cashier Account
                  </h4>
                  <p className="text-sm text-yellow-800 font-medium mb-3">
                    Price editing and discounts are restricted.
                  </p>
                  <button
                    onClick={() => setShowOverrideLogin(true)}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-bold text-sm"
                  >
                    Enable Admin Override
                  </button>
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
                      <p className="text-sm text-gray-500">{formatCurrency(item.price)} each</p>
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
                        Discount {totals.discountType === 'percentage' ? `(${overrideDiscount} %)` : '(Fixed)'}:
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
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 font-medium">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>{formatCurrency(totals.total)}</span>
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
                  <option value="gcash">GCash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              {paymentMethod === 'cash' && !isPartialPayment && (
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
                      <option value="">Select Customer (Required)</option>
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


                  <label className="block text-sm font-medium text-blue-900 mt-3 mb-1">
                    Payment Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDeadline}
                    onChange={(e) => setPaymentDeadline(e.target.value)}
                    className="form-input"
                    min={new Date().toISOString().split('T')[0]}
                  />
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

      {/* Admin Override Login Modal */}
      {showOverrideLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Admin Override</h3>
            <p className="text-gray-600 mb-4 text-sm">Enter admin credentials to unlock pricing controls.</p>
            <form onSubmit={handleOverrideLogin}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={overrideUsername}
                    onChange={(e) => setOverrideUsername(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={overridePassword}
                    onChange={(e) => setOverridePassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowOverrideLogin(false);
                    setOverrideUsername('');
                    setOverridePassword('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <div
        className="modal-overlay"
        style={{ display: showReceipt && lastSale ? 'flex' : 'none' }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title">Receipt</h3>
            <button onClick={() => setShowReceipt(false)} className="modal-close">×</button>
          </div>

          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sale Completed!</h2>
            <p className="text-gray-600">Transaction #{lastSale?.sale?.id} recorded successfully.</p>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => printReceipt()}
              className="btn btn-primary flex-1 print-button"
            >
              <Receipt className="w-4 h-4" />
              Print Receipt
            </button>
            <button
              onClick={() => setShowReceipt(false)}
              className="btn btn-outline flex-1"
            >
              New Sale
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
                {isSearching ? 'Searching...' : searchPagination.total > 0 ? `Found ${searchPagination.total} product${searchPagination.total !== 1 ? 's' : ''} ` : 'No products found'}
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
                      className={`p - 3 border rounded cursor - pointer hover: bg - gray - 50 transition - colors ${product.stock <= 0 ? 'opacity-50' : ''
                        } `}
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
                    <td>{formatCurrency(sale.total_amount)}</td>
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

