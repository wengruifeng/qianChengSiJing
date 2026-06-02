const { getCurrentUser, canSeePrice } = require('../../utils/auth');
const { getCartItems, updateCartQuantity } = require('../../utils/business');
const { getStore, updateStore, nextId, nowText, clone } = require('../../utils/store');

Page({
  data: {
    items: [],
    address: null,
    total: '0.00',
    remark: ''
  },

  onShow() {
    this.loadPageData();
  },

  loadPageData() {
    const user = getCurrentUser();
    if (!user || !canSeePrice()) {
      wx.showToast({ title: '暂无选购权限', icon: 'none' });
      setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }), 300);
      return;
    }
    const store = getStore();
    const items = getCartItems().filter((item) => item.checked).map((item) => ({
      ...item,
      subtotalText: (item.product.price * item.quantity).toFixed(2)
    }));
    const addressId = wx.getStorageSync('zht_checkout_address_id');
    const address = store.addresses.find((item) => item.id === addressId) || store.addresses.find((item) => item.userId === user.id && item.isDefault) || null;
    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    this.setData({ items, address, total: total.toFixed(2) });
  },

  chooseAddress() {
    wx.navigateTo({ url: '/pages/address/address?mode=choose' });
  },

  onRemark(event) {
    this.setData({ remark: event.detail.value });
  },

  decreaseQty(event) {
    const id = event.currentTarget.dataset.id;
    const item = this.data.items.find((current) => current.id === id);
    if (!item) return;
    const nextQuantity = Math.max(0, item.quantity - 1);
    updateCartQuantity(id, nextQuantity);
    this.loadPageData();
  },

  increaseQty(event) {
    const id = event.currentTarget.dataset.id;
    const item = this.data.items.find((current) => current.id === id);
    if (!item) return;
    const result = updateCartQuantity(id, item.quantity + 1);
    if (!result.ok) {
      wx.showToast({ title: result.message, icon: 'none' });
    }
    this.loadPageData();
  },

  onQtyBlur(event) {
    const id = event.currentTarget.dataset.id;
    const rawValue = `${event.detail.value || ''}`.trim();
    const nextQuantity = Number(rawValue);
    if (!rawValue || !Number.isInteger(nextQuantity) || nextQuantity < 0) {
      wx.showToast({ title: '请输入正确数量', icon: 'none' });
      this.loadPageData();
      return;
    }
    const result = updateCartQuantity(id, nextQuantity);
    if (!result.ok) {
      wx.showToast({ title: result.maxQuantity > 0 ? `库存不足，最多 ${result.maxQuantity}` : result.message, icon: 'none' });
    }
    this.loadPageData();
  },

  submit() {
    if (!canSeePrice()) {
      wx.showToast({ title: '暂无选购权限', icon: 'none' });
      return;
    }
    if (!this.data.items.length) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }
    if (!this.data.address) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' });
      return;
    }
    const user = getCurrentUser();
    const items = this.data.items;
    const insufficient = items.find((item) => item.product.stock - item.product.lockedStock < item.quantity);
    if (insufficient) {
      wx.showToast({ title: `${insufficient.product.name}库存不足`, icon: 'none' });
      return;
    }
    let orderId = '';
    updateStore((store) => {
      orderId = nextId('order');
      const orderNo = `QCSJ${Date.now()}`;
      const amount = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      store.orders.unshift({
        id: orderId,
        orderNo,
        userId: user.id,
        customerName: user.company || user.nickName,
        customerPhone: user.phone,
        addressSnapshot: clone(this.data.address),
        status: 'pending',
        settlementStatus: 'pending',
        amount,
        remark: this.data.remark,
        paymentMethod: 'offline',
        paymentStatus: 'unpaid',
        paymentAmount: 0,
        paymentTime: '',
        paymentNo: '',
        createdAt: nowText(),
        completedAt: '',
        items: items.map((item) => ({
          id: nextId('oi'),
          productId: item.product.id,
          productName: item.product.name,
          spec: item.product.spec,
          unit: item.product.unit,
          mainImage: item.product.mainImage,
          price: item.product.price,
          quantity: item.quantity,
          subtotal: item.product.price * item.quantity
        }))
      });
      items.forEach((item) => {
        const product = store.products.find((productItem) => productItem.id === item.product.id);
        if (product) product.lockedStock += item.quantity;
      });
      store.cart = store.cart.filter((cart) => !(cart.userId === user.id && cart.checked));
      store.operationLogs.unshift({
        id: nextId('op'),
        operatorId: user.id,
        operatorName: user.nickName,
        type: 'create_order',
        target: orderNo,
        summary: `客户提交订单 ${orderNo}`,
        createdAt: nowText()
      });
    });
    wx.showToast({ title: '订单已提交' });
    setTimeout(() => wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${orderId}` }), 500);
  }
});
