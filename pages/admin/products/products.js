const { createAudit } = require('../../../utils/audit-service');
const { fetchAdminProducts, fetchCategories } = require('../../../utils/catalog-service');
const { getCurrentUser, isAdmin, refreshCurrentUser } = require('../../../utils/auth');

Page({
  data: {
    keyword: '',
    status: 'all',
    statusLabel: '全部商品',
    statusOptions: [
      { label: '全部商品', value: 'all' },
      { label: '在售', value: 'on' },
      { label: '下架', value: 'off' },
      { label: '库存预警', value: 'warning' }
    ],
    products: []
  },

  onShow() {
    refreshCurrentUser().then((user) => {
      if (!isAdmin(user)) {
        wx.showToast({ title: '后台权限已失效', icon: 'none' });
        wx.navigateBack();
        return;
      }
      this.refresh();
    }).catch(() => {
      wx.showToast({ title: '权限校验失败', icon: 'none' });
      wx.navigateBack();
    });
  },

  refresh() {
    Promise.all([fetchCategories(), fetchAdminProducts()]).then(([categories, allProducts]) => {
      const keyword = this.data.keyword.toLowerCase();
      const categoryMap = Object.fromEntries(categories.map((item) => [item.id, item.name]));
      const products = allProducts.filter((item) => {
        if (item.deleteStatus === 'deleted') return false;
        const text = `${item.name}${item.barcode}${item.code}`.toLowerCase();
        const warning = item.availableStock <= item.warningStock;
        const statusMatched = this.data.status === 'all'
          || (this.data.status === 'warning' ? warning : item.saleStatus === this.data.status);
        return statusMatched && (!keyword || text.includes(keyword));
      }).map((item) => ({
        ...item,
        warning: item.availableStock <= item.warningStock,
        categoryName: categoryMap[item.categoryId] || '未分类',
        saleStatusText: item.saleStatus === 'on' ? '在售' : '下架'
      }));
      this.setData({ products });
    }).catch((error) => {
      this.setData({ products: [] });
      wx.showToast({
        title: error && error.message ? error.message : '商品数据加载失败',
        icon: 'none'
      });
    });
  },

  onKeyword(event) {
    this.setData({ keyword: event.detail.value }, this.refresh);
  },

  onStatus(event) {
    const option = this.data.statusOptions[event.detail.value];
    this.setData({ status: option.value, statusLabel: option.label }, this.refresh);
  },

  add() {
    wx.navigateTo({ url: '/pages/admin/product-edit/product-edit' });
  },

  edit(event) {
    wx.navigateTo({ url: `/pages/admin/product-edit/product-edit?id=${event.currentTarget.dataset.id}` });
  },

  requestDelete(event) {
    if (!isAdmin(getCurrentUser())) {
      wx.showToast({ title: '无后台权限', icon: 'none' });
      return;
    }
    const product = this.data.products.find((item) => item.id === event.currentTarget.dataset.id);
    if (!product) {
      wx.showToast({ title: '未找到商品数据', icon: 'none' });
      return;
    }
    createAudit({
      type: 'product_delete',
      targetCollection: 'products',
      targetId: product.id,
      beforeData: product,
      afterData: { ...product, deleteStatus: 'deleted' },
      summary: `删除商品：${product.name}`
    }).then(() => {
      wx.showToast({ title: '已提交审核' });
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '提交审核失败',
        icon: 'none'
      });
    });
  }
});
