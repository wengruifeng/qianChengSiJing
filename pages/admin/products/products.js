const { getStore } = require('../../../utils/store');
const { createAudit } = require('../../../utils/business');
const { fetchAdminProducts, fetchCategories } = require('../../../utils/catalog-service');

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
    this.refresh();
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
    }).catch(() => {
      this.setData({ products: [] });
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
    const product = getStore().products.find((item) => item.id === event.currentTarget.dataset.id);
    createAudit('product_delete', 'products', product.id, product, { ...product, deleteStatus: 'deleted' }, `删除商品：${product.name}`);
    wx.showToast({ title: '已提交审核' });
  }
});
