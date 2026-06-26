const { getCurrentUser, canSeePrice, goLoginOrApply, refreshCurrentUser } = require('../../utils/auth');
const { addToCart, fetchCartItems } = require('../../utils/cart-service');
const { fetchCategories, fetchVisibleProducts } = require('../../utils/catalog-service');

function getAvailableStock(product) {
  if (!product) return 0;
  return Math.max(0, (product.stock || 0) - (product.lockedStock || 0));
}

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

  lastManualCategoryId: '',
  autoCategoryKeyword: '',

  onShow() {
    Promise.all([
      refreshCurrentUser(),
      fetchCategories(),
      fetchVisibleProducts()
    ]).then(([user, categories, products]) => {
      const currentUser = user || getCurrentUser();
      const activeCategoryId = this.data.activeCategoryId || (categories[0] && categories[0].id) || '';
      this.lastManualCategoryId = activeCategoryId;
      this.setData({
        categories: categories.map((item) => ({ ...item, active: item.id === activeCategoryId })),
        products: products.map(enrichProduct),
        activeCategoryId,
        canSeePrice: canSeePrice(),
        applyButtonText: currentUser && currentUser.customerStatus === 'pending' ? '查看申请' : '申请查看'
      }, () => {
        this.filterProducts();
        this.refreshCartSummary();
      });
    }).catch(() => {
      this.setData({
        categories: [],
        products: [],
        filteredProducts: [],
        activeCategoryId: '',
        canSeePrice: canSeePrice(),
        applyButtonText: getCurrentUser() && getCurrentUser().customerStatus === 'pending' ? '查看申请' : '申请查看',
        cartCount: 0,
        total: '0.00'
      });
    });
  },

  filterProducts() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const matchesKeyword = (item) => {
      const text = `${item.name}${item.barcode}${item.code}${item.simple}`.toLowerCase();
      return !keyword || text.includes(keyword);
    };

    let activeCategoryId = this.data.activeCategoryId;
    if (keyword) {
      const categoryMatchedProducts = this.data.products.filter((item) => item.categoryId === activeCategoryId && matchesKeyword(item));
      const shouldAutoSwitch = this.autoCategoryKeyword !== keyword;
      if (shouldAutoSwitch && !categoryMatchedProducts.length) {
        const firstMatched = this.data.products.find(matchesKeyword);
        if (firstMatched) {
          activeCategoryId = firstMatched.categoryId || '';
        }
      }
      this.autoCategoryKeyword = keyword;
    } else {
      activeCategoryId = this.lastManualCategoryId || activeCategoryId;
      this.autoCategoryKeyword = '';
    }

    const filteredProducts = this.data.products.filter((item) => {
      const inCategory = !activeCategoryId || item.categoryId === activeCategoryId;
      return inCategory && matchesKeyword(item);
    });

    this.setData({
      activeCategoryId,
      categories: this.data.categories.map((item) => ({ ...item, active: item.id === activeCategoryId })),
      filteredProducts
    });
  },

  refreshCartSummary() {
    if (!this.data.canSeePrice) {
      this.setData({ cartCount: 0, total: '0.00' });
      return;
    }
    fetchCartItems().then((items) => {
      const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
      const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      this.setData({ cartCount, total: total.toFixed(2) });
    }).catch(() => {
      this.setData({ cartCount: 0, total: '0.00' });
    });
  },

  onKeyword(event) {
    this.setData({ keyword: event.detail.value }, this.filterProducts);
  },

  changeCategory(event) {
    const activeCategoryId = event.currentTarget.dataset.id;
    this.lastManualCategoryId = activeCategoryId;
    this.autoCategoryKeyword = this.data.keyword.trim().toLowerCase();
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
      wx.navigateTo({
        url: `/pages/login/login?redirect=${encodeURIComponent('/pages/cart/cart')}`
      });
      return;
    }
    if (!this.data.canSeePrice) {
      goLoginOrApply();
      return;
    }
    addToCart(event.currentTarget.dataset.id, 1).then((result) => {
      wx.showToast({ title: result.ok ? '已加入选购' : result.message, icon: result.ok ? 'success' : 'none' });
      this.refreshCartSummary();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '加入选购失败',
        icon: 'none'
      });
    });
  },

  goApply() {
    goLoginOrApply();
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
