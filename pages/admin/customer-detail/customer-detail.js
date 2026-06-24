const { fetchCustomerDetail, fetchCustomerLogsPage, statusMap } = require('../../../utils/customer-service');

Page({
  data: {
    customer: null,
    statusText: '',
    orderCount: 0,
    orderAmount: '0.00',
    logs: [],
    addresses: [],
    latestOrders: [],
    logsPage: 1,
    logsPageSize: 20,
    logsHasMore: false,
    loadingLogs: false
  },

  onLoad(options) {
    this.customerId = options.id;
    fetchCustomerDetail(options.id).then(({ customer, orderCount, orderAmount, latestOrders, addresses, logs, logsPage, logsPageSize, logsHasMore }) => {
      this.setData({
        customer,
        initial: customer.nickName.substring(0, 1),
        displayName: customer.company || customer.nickName,
        statusText: statusMap[customer.customerStatus] || '未申请',
        regionText: customer.region || '-',
        addressText: customer.addressDetail || '-',
        remarkText: customer.remark || '-',
        orderCount,
        orderAmount,
        addresses,
        latestOrders,
        logs,
        logsPage,
        logsPageSize,
        logsHasMore
      });
    }).catch(() => {
      wx.showToast({ title: '客户资料加载失败', icon: 'none' });
    });
  },

  loadMoreLogs() {
    if (this.data.loadingLogs || !this.data.logsHasMore || !this.customerId) return;
    this.setData({ loadingLogs: true });
    fetchCustomerLogsPage(this.customerId, this.data.logsPage + 1, this.data.logsPageSize).then((result) => {
      this.setData({
        logs: this.data.logs.concat(result.logs || []),
        logsPage: result.logsPage,
        logsPageSize: result.logsPageSize,
        logsHasMore: result.logsHasMore
      });
    }).catch(() => {
      wx.showToast({ title: '操作记录加载失败', icon: 'none' });
    }).finally(() => {
      this.setData({ loadingLogs: false });
    });
  }
});
