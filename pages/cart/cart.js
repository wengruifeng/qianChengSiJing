const { getStore } = require('../../utils/store');
const { getCurrentUser, canSeePrice } = require('../../utils/auth');
const { addToCart, getCartItems, getAvailableStock } = require('../../utils/business');

function enrichProduct(item) {
  const availableStock = getAvailableStock(item);
  return {
    ...item,
    availableStock,
    isSoldOut: availableStock <= 0,
    isLowStock: availableStock > 0 && availableStock <= (item.warningStock || 0)
  };
}

Page({
  data: {
    categories: [],
    products: [],
    filteredProducts: [],
    activeCategoryId: '',
    keyword: '',
    canSeePrice: false,
    applyButtonText: '申请查看',
    cartCount: 0,
    total: '0.00'
  },

  onShow() {
    const store = getStore();
    const categories = store.categories
      .filter((item) => item.status === 'enabled')
      .sort((a, b) => a.sort - b.sort);
    const activeCategoryId = this.data.activeCategoryId || (categories[0] && categories[0].id) || '';
    const user = getCurrentUser();

    this.setData({
      categories: categories.map((item) => ({ ...item, active: item.id === activeCategoryId })),
      products: store.products
        .filter((item) => item.saleStatus === 'on' && item.deleteStatus !== 'deleted')
        .map(enrichProduct),
      activeCategoryId,
      canSeePrice: canSeePrice(),
      applyButtonText: user && user.customerStatus === 'pending' ? '查看申请' : '申请查看'
    }, () => {
      this.filterProducts();
      this.refreshCartSummary();
    });
  },

  filterProducts() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const filteredProducts = this.data.products.filter((item) => {
      const inCategory = !this.data.activeCategoryId || item.categoryId === this.data.activeCategoryId;
      const text = `${item.name}${item.barcode}${item.code}${item.simple}`.toLowerCase();
      return inCategory && (!keyword || text.includes(keyword));
    });
    this.setData({ filteredProducts });
  },

  refreshCartSummary() {
    if (!this.data.canSeePrice) {
      this.setData({ cartCount: 0, total: '0.00' });
      return;
    }
    const items = getCartItems();
    const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    this.setData({ cartCount, total: total.toFixed(2) });
  },

  onKeyword(event) {
    this.setData({ keyword: event.detail.value }, this.filterProducts);
  },

  changeCategory(event) {
    const activeCategoryId = event.currentTarget.dataset.id;
    this.setData({
      activeCategoryId,
      categories: this.data.categories.map((item) => ({ ...item, active: item.id === activeCategoryId }))
    }, this.filterProducts);
  },

  openProduct(event) {
    wx.navigateTo({ url: `/pages/product/product?id=${event.currentTarget.dataset.id}` });
  },

  addCart(event) {
    const user = getCurrentUser();
    if (!user) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    if (!this.data.canSeePrice) {
      wx.navigateTo({ url: '/pages/apply/apply' });
      return;
    }
    const result = addToCart(event.currentTarget.dataset.id, 1);
    wx.showToast({ title: result.ok ? '已加入选购' : result.message, icon: result.ok ? 'success' : 'none' });
    this.refreshCartSummary();
  },

  goApply() {
    const user = getCurrentUser();
    wx.navigateTo({ url: user ? '/pages/apply/apply' : '/pages/login/login' });
  },

  checkout() {
    if (!this.data.canSeePrice) return;
    if (!this.data.cartCount) {
      wx.showToast({ title: '请先添加商品', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/checkout/checkout' });
  },

  scanCode() {
    wx.scanCode({
      success: (res) => this.setData({ keyword: res.result }, this.filterProducts),
      fail: () => wx.showToast({ title: '扫码未完成', icon: 'none' })
    });
  }
});
