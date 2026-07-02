const { addToCart } = require('../../utils/cart-service');
const { canSeePrice, refreshCurrentUser, requireLogin } = require('../../utils/auth');
const { fetchProductById } = require('../../utils/catalog-service');
const { APP_NAME } = require('../../utils/config');

Page({
  data: {
    product: null,
    images: [],
    detailImages: [],
    canSeePrice: false
  },

  onLoad(options) {
    this.productId = options.id;
    this.loadProduct();
  },

  onShow() {
    if (this.productId) this.loadProduct();
  },

  loadProduct() {
    Promise.all([
      refreshCurrentUser(),
      fetchProductById(this.productId)
    ]).then(([, product]) => {
      const availableStock = product ? product.availableStock : 0;
      this.setData({
        product,
        images: product ? (product.imageList || []) : [],
        detailImages: product ? (product.detailImages || []) : [],
        availableStock,
        canSeePrice: canSeePrice(),
        isSoldOut: availableStock <= 0,
        isLowStock: availableStock > 0 && product && availableStock <= (product.warningStock || 0)
      });
    }).catch(() => {
      this.setData({
        product: null,
        images: [],
        detailImages: [],
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
  },

  onShareAppMessage() {
    const product = this.data.product;
    if (!product || !product.id) {
      return {
        title: `${APP_NAME}，火锅串串食材选购平台`,
        path: '/pages/index/index'
      };
    }
    const imageUrl = product.mainImage || (product.imageList && product.imageList[0]) || '';
    return {
      title: `给你推荐一个商品：${product.name}`,
      path: `/pages/product/product?id=${encodeURIComponent(product.id)}`,
      imageUrl
    };
  },

  onShareTimeline() {
    const product = this.data.product;
    if (!product || !product.id) {
      return {
        title: `${APP_NAME}，火锅串串食材选购平台`,
        query: ''
      };
    }
    const imageUrl = product.mainImage || (product.imageList && product.imageList[0]) || '';
    return {
      title: `给你推荐一个商品：${product.name}`,
      query: `id=${encodeURIComponent(product.id)}`,
      imageUrl
    };
  }
});
