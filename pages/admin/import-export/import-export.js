const { fetchAdminProducts } = require('../../../utils/catalog-service');
const { fetchCustomers } = require('../../../utils/customer-service');
const { fetchAdminOrders } = require('../../../utils/order-service');

Page({
  data: {
    importTemplates: [
      { name: '商品导入模板', fields: '分类、名称、条码、编货号、简拼、规格、单位、价格、库存、预警库存、标签' },
      { name: '客户导入模板', fields: '手机号、公司/店铺、所在地区、详细地址、客户状态、备注' }
    ],
    exportItems: []
  },

  onShow() {
    Promise.all([
      fetchAdminProducts(),
      fetchCustomers(),
      fetchAdminOrders()
    ]).then(([products, customers, orders]) => {
      this.setData({
        exportItems: [
          { key: 'products', name: '商品列表', count: products.length },
          { key: 'customers', name: '客户列表', count: customers.length },
          { key: 'orders', name: '订单列表', count: orders.length },
          { key: 'stats', name: '统计报表', count: 1 }
        ]
      });
    }).catch(() => {
      this.setData({
        exportItems: [
          { key: 'products', name: '商品列表', count: 0 },
          { key: 'customers', name: '客户列表', count: 0 },
          { key: 'orders', name: '订单列表', count: 0 },
          { key: 'stats', name: '统计报表', count: 0 }
        ]
      });
    });
  },

  requestImport() {
    wx.showModal({
      title: '导入说明',
      content: '当前页面可查看商品和客户导入字段说明，导入文件请按统一模板整理后再执行导入流程。',
      showCancel: false
    });
  },

  exportData(event) {
    const type = event.currentTarget.dataset.type;
    const countMap = Object.fromEntries((this.data.exportItems || []).map((item) => [item.key, item.count]));
    wx.showModal({
      title: '导出预览',
      content: `${type} 当前可导出 ${countMap[type]} 条数据。`,
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
