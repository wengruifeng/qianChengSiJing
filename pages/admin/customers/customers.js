const { reviewCustomer, fetchCustomers } = require('../../../utils/customer-service');

Page({
  data: {
    keyword: '',
    customers: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    fetchCustomers().then((allCustomers) => {
      const keyword = this.data.keyword.toLowerCase();
      const customers = allCustomers.filter((item) => {
        const text = `${item.company}${item.nickName}${item.phone}${item.region}`.toLowerCase();
        return !keyword || text.includes(keyword);
      });
      this.setData({ customers });
    }).catch(() => {
      this.setData({ customers: [] });
    });
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
    reviewCustomer({ id, status }).then(() => {
      wx.showToast({ title: status === 'approved' ? '已通过' : '已拒绝' });
      this.refresh();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '操作失败，请稍后再试',
        icon: 'none'
      });
    });
  }
});
