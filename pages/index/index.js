const { canSeePrice, goLoginOrApply, refreshCurrentUser } = require('../../utils/auth');
const { fetchCategories, fetchHomeContent, fetchVisibleProducts } = require('../../utils/catalog-service');
const { selectProducts } = require('../../utils/content');
const { APP_NAME } = require('../../utils/config');

Page({
  data: {
    categories: [],
    recommendedProducts: [],
    newProducts: [],
    home: {},
    canSeePrice: false
  },

  onShow() {
    Promise.all([
      refreshCurrentUser(),
      fetchCategories(),
      fetchVisibleProducts(),
      fetchHomeContent()
    ]).then(([, categories, visibleProducts, home]) => {
      this.setData({
        categories: categories.map((item) => ({ ...item, initial: item.name.substring(0, 1) })),
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
    }).catch(() => {
      this.setData({
        categories: [],
        recommendedProducts: [],
        newProducts: [],
        home: {},
        canSeePrice: canSeePrice()
      });
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
    goLoginOrApply();
  },

  scanCode() {
    wx.scanCode({
      success: (res) => {
        wx.navigateTo({ url: `/pages/catalog/catalog?keyword=${encodeURIComponent(res.result)}` });
      },
      fail: () => wx.showToast({ title: '扫码未完成', icon: 'none' })
    });
  },

  onShareAppMessage() {
    const imageUrl = this.data.home.heroImage || this.data.home.logoImage || '';
    return {
      title: `${APP_NAME}，火锅串串食材选购平台`,
      path: '/pages/index/index',
      imageUrl
    };
  },

  onShareTimeline() {
    const imageUrl = this.data.home.heroImage || this.data.home.logoImage || '';
    return {
      title: `${APP_NAME}，火锅串串食材选购平台`,
      query: '',
      imageUrl
    };
  }
});
