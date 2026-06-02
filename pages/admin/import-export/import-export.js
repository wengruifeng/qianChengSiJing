const { getStore } = require('../../../utils/store');
const { createAudit } = require('../../../utils/business');

Page({
  data: {
    importTemplates: [
      { name: '商品导入模板', fields: '分类、名称、条码、编货号、简拼、规格、单位、价格、库存、预警库存、标签' },
      { name: '客户导入模板', fields: '手机号、公司/店铺、所在地区、详细地址、客户状态、备注' }
    ],
    exportItems: []
  },

  onShow() {
    const store = getStore();
    this.setData({
      exportItems: [
        { key: 'products', name: '商品列表', count: store.products.length },
        { key: 'customers', name: '客户列表', count: store.users.filter((item) => item.role === 'customer').length },
        { key: 'orders', name: '订单列表', count: store.orders.length },
        { key: 'stats', name: '统计报表', count: 1 }
      ]
    });
  },

  mockImport() {
    createAudit('import_products', 'products', '', null, { rows: 1 }, '导入商品数据');
    wx.showToast({ title: '已生成审核' });
  },

  exportData(event) {
    const type = event.currentTarget.dataset.type;
    const store = getStore();
    const countMap = {
      products: store.products.length,
      customers: store.users.length,
      orders: store.orders.length,
      stats: 1
    };
    wx.showModal({
      title: '导出预览',
      content: `${type} 可导出 ${countMap[type]} 条数据。正式版将生成 CSV 文件。`,
      showCancel: false
    });
  },

  previewTemplate(event) {
    const name = event.currentTarget.dataset.name;
    const fields = event.currentTarget.dataset.fields;
    wx.showModal({
      title: name,
      content: `模板字段：${fields}`,
      showCancel: false
    });
  }
});
