const { getStore } = require('../../../utils/store');

const statusMap = { not_applied: '未申请', pending: '待审核', approved: '已通过', rejected: '已拒绝' };

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
    const store = getStore();
    const customer = store.users.find((item) => item.id === options.id);
    const orders = store.orders.filter((item) => item.userId === options.id);
    const addresses = store.addresses.filter((item) => item.userId === options.id);
    const logs = store.operationLogs.filter((item) => item.operatorId === options.id || item.target === customer.phone).slice(0, 20);
    this.setData({
      customer,
      initial: customer.nickName.substring(0, 1),
      displayName: customer.company || customer.nickName,
      statusText: statusMap[customer.customerStatus] || '未申请',
      regionText: customer.region || '-',
      addressText: customer.addressDetail || '-',
      remarkText: customer.remark || '-',
      orderCount: orders.length,
      orderAmount: orders.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
      addresses,
      latestOrders: orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
      logs
    });
  }
});
