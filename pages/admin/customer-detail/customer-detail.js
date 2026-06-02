const { fetchCustomerDetail, statusMap } = require('../../../utils/customer-service');

Page({
  data: {
    customer: null,
    statusText: '',
    orderCount: 0,
    orderAmount: '0.00',
    logs: [],
    addresses: [],
    latestOrders: []
  },

  onLoad(options) {
    fetchCustomerDetail(options.id).then(({ customer, orders, addresses, logs }) => {
      this.setData({
        customer,
        initial: customer.nickName.substring(0, 1),
        displayName: customer.company || customer.nickName,
        statusText: statusMap[customer.customerStatus] || '未申请',
        regionText: customer.region || '-',
        addressText: customer.addressDetail || '-',
        remarkText: customer.remark || '-',
        orderCount: orders.length,
        orderAmount: orders.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2),
        addresses,
        latestOrders: orders.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5),
        logs
      });
    }).catch(() => {
      wx.showToast({ title: '客户资料加载失败', icon: 'none' });
    });
  }
});
