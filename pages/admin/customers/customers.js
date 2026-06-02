const { getStore, updateStore, nowText, nextId } = require('../../../utils/store');
const { getCurrentUser } = require('../../../utils/auth');

const statusMap = {
  not_applied: '未申请',
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝'
};

Page({
  data: {
    keyword: '',
    customers: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const keyword = this.data.keyword.toLowerCase();
    const store = getStore();
    const customers = store.users.filter((item) => item.role === 'customer' || item.customerStatus).filter((item) => {
      const text = `${item.company}${item.nickName}${item.phone}${item.region}`.toLowerCase();
      return !keyword || text.includes(keyword);
    }).map((item) => {
      const customerOrders = store.orders.filter((order) => order.userId === item.id);
      const addressCount = store.addresses.filter((address) => address.userId === item.id).length;
      return {
        ...item,
        displayName: item.company || item.nickName,
        statusText: statusMap[item.customerStatus] || '未申请',
        statusClass: `status-${item.customerStatus || 'not_applied'}`,
        orderCount: customerOrders.length,
        totalAmount: customerOrders.reduce((sum, order) => sum + order.amount, 0).toFixed(2),
        addressCount
      };
    });
    this.setData({ customers });
  },

  onKeyword(event) {
    this.setData({ keyword: event.detail.value }, this.refresh);
  },

  open(event) {
    wx.navigateTo({ url: `/pages/admin/customer-detail/customer-detail?id=${event.currentTarget.dataset.id}` });
  },

  approve(event) {
    this.review(event.currentTarget.dataset.id, 'approved');
  },

  reject(event) {
    this.review(event.currentTarget.dataset.id, 'rejected');
  },

  review(id, status) {
    const reviewer = getCurrentUser();
    updateStore((store) => {
      const user = store.users.find((item) => item.id === id);
      user.customerStatus = status;
      user.reviewedAt = nowText();
      user.reviewerName = reviewer.nickName;
      store.operationLogs.unshift({
        id: nextId('op'),
        operatorId: reviewer.id,
        operatorName: reviewer.nickName,
        type: 'customer_review',
        target: user.phone,
        summary: `${status === 'approved' ? '通过' : '拒绝'}客户看价申请`,
        createdAt: nowText()
      });
    });
    wx.showToast({ title: status === 'approved' ? '已通过' : '已拒绝' });
    this.refresh();
  }
});
