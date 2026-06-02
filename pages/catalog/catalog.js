const { canSeePrice, requireLogin } = require('../../utils/auth');
const { addToCart } = require('../../utils/business');
const { fetchCategories, fetchVisibleProducts } = require('../../utils/catalog-service');

Page({
  data: {
    categories: [],
    products: [],
    filteredProducts: [],
    activeCategoryId: '',
    keyword: '',
    canSeePrice: false
  },

  onLoad(options) {
    this.initialCategoryId = options.categoryId || '';
    this.initialKeyword = options.keyword || '';
  },

  onShow() {
    Promise.all([
      fetchCategories(),
      fetchVisibleProducts()
    ]).then(([categories, products]) => {
      this.setData({
        categories,
        products,
        activeCategoryId: this.data.activeCategoryId || this.initialCategoryId || (categories[0] && categories[0].id) || '',
        keyword: this.data.keyword || decodeURIComponent(this.initialKeyword || ''),
        canSeePrice: canSeePrice()
      }, this.filterProducts);
    }).catch(() => {
      this.setData({
        categories: [],
        products: [],
        filteredProducts: [],
        canSeePrice: canSeePrice()
      });
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

  onKeyword(event) {
    this.setData({ keyword: event.detail.value }, this.filterProducts);
  },

  changeCategory(event) {
    this.setData({ activeCategoryId: event.currentTarget.dataset.id }, this.filterProducts);
  },

  openProduct(event) {
    wx.navigateTo({ url: `/pages/product/product?id=${event.currentTarget.dataset.id}` });
  },

  addCart(event) {
    if (!requireLogin('/pages/catalog/catalog')) return;
    if (!this.data.canSeePrice) {
      wx.navigateTo({ url: '/pages/apply/apply' });
      return;
    }
    const result = addToCart(event.currentTarget.dataset.id, 1);
    wx.showToast({ title: result.ok ? '已加入选购' : result.message, icon: result.ok ? 'success' : 'none' });
  },

  goApply() {
    wx.navigateTo({ url: '/pages/apply/apply' });
  },

  scanCode() {
    wx.scanCode({
      success: (res) => this.setData({ keyword: res.result }, this.filterProducts),
      fail: () => wx.showToast({ title: '扫码未完成', icon: 'none' })
    });
  }
});
