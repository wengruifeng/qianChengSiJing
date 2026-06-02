const { addToCart } = require('../../utils/cart-service');
const { canSeePrice, requireLogin } = require('../../utils/auth');
const { fetchProductById } = require('../../utils/catalog-service');

Page({
  data: {
    product: null,
    images: [],
    canSeePrice: false
  },

  onLoad(options) {
    fetchProductById(options.id).then((product) => {
      const availableStock = product ? product.availableStock : 0;
      this.setData({
        product,
        images: product ? [product.mainImage].concat(product.detailImages || []) : [],
        availableStock,
        canSeePrice: canSeePrice(),
        isSoldOut: availableStock <= 0,
        isLowStock: availableStock > 0 && product && availableStock <= (product.warningStock || 0)
      });
    }).catch(() => {
      this.setData({
        product: null,
        images: [],
        availableStock: 0,
        canSeePrice: canSeePrice(),
        isSoldOut: true,
        isLowStock: false
      });
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
    addToCart(this.data.product.id, 1).then((result) => {
      wx.showToast({ title: result.ok ? '已加入选购' : result.message, icon: result.ok ? 'success' : 'none' });
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '加入选购失败',
        icon: 'none'
      });
    });
  },

  goCart() {
    if (!this.data.canSeePrice) return;
    wx.switchTab({ url: '/pages/cart/cart' });
  }
});
