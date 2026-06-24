const { getCurrentUser, canSeePrice, refreshCurrentUser } = require('../../utils/auth');
const { fetchCartItems, updateCartQuantity } = require('../../utils/cart-service');
const { fetchAddressesByCurrentUser } = require('../../utils/customer-service');
const { submitOrder } = require('../../utils/order-service');

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
    refreshCurrentUser().then(() => {
      const user = getCurrentUser();
    if (!user || !canSeePrice()) {
      wx.showToast({ title: '暂无选购权限', icon: 'none' });
      setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }), 300);
      return;
    }
    Promise.all([fetchCartItems(), fetchAddressesByCurrentUser()]).then(([cartItems, addresses]) => {
      const items = cartItems.filter((item) => item.checked).map((item) => ({
        ...item,
        subtotalText: (item.product.price * item.quantity).toFixed(2)
      }));
      const addressId = wx.getStorageSync('zht_checkout_address_id');
      const address = addresses.find((item) => item.id === addressId) || addresses.find((item) => item.isDefault) || null;
      const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      this.setData({ items, address, total: total.toFixed(2) });
    }).catch(() => {
      this.setData({ items: [], address: null, total: '0.00' });
    });
    });
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
    updateCartQuantity(id, nextQuantity).then(() => {
      this.loadPageData();
    });
  },

  increaseQty(event) {
    const id = event.currentTarget.dataset.id;
    const item = this.data.items.find((current) => current.id === id);
    if (!item) return;
    updateCartQuantity(id, item.quantity + 1).then((result) => {
      if (!result.ok) {
        wx.showToast({ title: result.message, icon: 'none' });
      }
      this.loadPageData();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '修改数量失败',
        icon: 'none'
      });
    });
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
    updateCartQuantity(id, nextQuantity).then((result) => {
      if (!result.ok) {
        wx.showToast({ title: result.maxQuantity > 0 ? `库存不足，最多 ${result.maxQuantity}` : result.message, icon: 'none' });
      }
      this.loadPageData();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '修改数量失败',
        icon: 'none'
      });
    });
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
    const items = this.data.items;
    const insufficient = items.find((item) => item.product.stock - item.product.lockedStock < item.quantity);
    if (insufficient) {
      wx.showToast({ title: `${insufficient.product.name}库存不足`, icon: 'none' });
      return;
    }
    submitOrder({
      address: this.data.address,
      remark: this.data.remark
    }).then((order) => {
      wx.showToast({ title: '订单已提交' });
      setTimeout(() => wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${order.id}` }), 500);
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '提交失败，请稍后再试',
        icon: 'none'
      });
    });
  }
});
