const { findProduct, addToCart, getAvailableStock } = require('../../utils/business');
const { canSeePrice, requireLogin } = require('../../utils/auth');

Page({
  data: {
    product: null,
    images: [],
    canSeePrice: false
  },

  onLoad(options) {
    const product = findProduct(options.id);
    const availableStock = product ? getAvailableStock(product) : 0;
    this.setData({
      product,
      images: product ? [product.mainImage].concat(product.detailImages || []) : [],
      availableStock,
      canSeePrice: canSeePrice(),
      isSoldOut: availableStock <= 0,
      isLowStock: availableStock > 0 && product && availableStock <= (product.warningStock || 0)
    });
  },

  addCart() {
    if (!requireLogin(`/pages/product/product?id=${this.data.product.id}`)) return;
    if (!this.data.canSeePrice) {
      return;
    }
    if (this.data.isSoldOut) {
      wx.showToast({ title: '商品已售罄', icon: 'none' });
      return;
    }
    const result = addToCart(this.data.product.id, 1);
    wx.showToast({ title: result.ok ? '已加入选购' : result.message, icon: result.ok ? 'success' : 'none' });
  },

  goCart() {
    if (!this.data.canSeePrice) return;
    wx.switchTab({ url: '/pages/cart/cart' });
  }
});
