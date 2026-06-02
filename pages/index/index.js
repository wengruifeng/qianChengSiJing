const { getStore } = require('../../utils/store');
const { canSeePrice } = require('../../utils/auth');
const { getAvailableStock } = require('../../utils/business');

Page({
  data: {
    categories: [],
    recommendedProducts: [],
    newProducts: [],
    home: {},
    canSeePrice: false
  },

  onShow() {
    const store = getStore();
    const visibleProducts = store.products
      .filter((item) => item.saleStatus === 'on' && item.deleteStatus !== 'deleted')
      .map((item) => {
        const availableStock = getAvailableStock(item);
        return {
          ...item,
          availableStock,
          isSoldOut: availableStock <= 0,
          isLowStock: availableStock > 0 && availableStock <= (item.warningStock || 0)
        };
      });
    const categories = store.categories
      .filter((item) => item.status === 'enabled')
      .sort((a, b) => a.sort - b.sort)
      .map((item) => ({ ...item, initial: item.name.substring(0, 1) }));
    const home = store.homeContent || {};
    this.setData({
      categories,
      recommendedProducts: selectProducts(
        visibleProducts,
        home.recommendedProductIds,
        (item) => Array.isArray(item.tags) && item.tags.includes('推荐')
      ),
      newProducts: selectProducts(
        visibleProducts,
        home.newProductIds,
        (item) => Array.isArray(item.tags) && item.tags.includes('新品')
      ),
      home,
      canSeePrice: canSeePrice()
    });
  },

  goCatalog() {
    wx.navigateTo({ url: '/pages/catalog/catalog' });
  },

  openCategory(event) {
    wx.navigateTo({ url: `/pages/catalog/catalog?categoryId=${event.currentTarget.dataset.id}` });
  },

  openProduct(event) {
    wx.navigateTo({ url: `/pages/product/product?id=${event.currentTarget.dataset.id}` });
  },

  goApply() {
    wx.navigateTo({ url: '/pages/apply/apply' });
  },

  scanCode() {
    wx.scanCode({
      success: (res) => {
        wx.navigateTo({ url: `/pages/catalog/catalog?keyword=${encodeURIComponent(res.result)}` });
      },
      fail: () => wx.showToast({ title: '扫码未完成', icon: 'none' })
    });
  }
});

function selectProducts(products, preferredIds, predicate) {
  const byId = Object.fromEntries(products.map((item) => [item.id, item]));
  const selected = [];
  (preferredIds || []).forEach((id) => {
    if (byId[id]) selected.push(byId[id]);
  });
  if (selected.length >= 4) return selected.slice(0, 4);
  products.forEach((item) => {
    if (selected.find((current) => current.id === item.id)) return;
    if (!predicate(item)) return;
    selected.push(item);
  });
  if (selected.length >= 4) return selected.slice(0, 4);
  products.forEach((item) => {
    if (selected.find((current) => current.id === item.id)) return;
    selected.push(item);
  });
  return selected.slice(0, 4);
}
