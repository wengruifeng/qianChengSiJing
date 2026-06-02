const { getCurrentUser, isSuperAdmin } = require('../../../utils/auth');
const { fetchAudits, reviewAudit } = require('../../../utils/audit-service');

Page({
  data: {
    tabs: [
      { label: '全部', value: 'all' },
      { label: '待审核', value: 'pending' },
      { label: '已通过', value: 'approved' },
      { label: '已拒绝', value: 'rejected' }
    ],
    active: 'all',
    audits: [],
    filteredAudits: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    fetchAudits().then((audits) => {
      this.setData({ audits }, this.filter);
    }).catch(() => {
      this.setData({ audits: [], filteredAudits: [] });
    });
  },

  changeTab(event) {
    this.setData({ active: event.currentTarget.dataset.value }, this.filter);
  },

  filter() {
    this.setData({
      filteredAudits: this.data.active === 'all'
        ? this.data.audits
        : this.data.audits.filter((item) => item.status === this.data.active)
    });
  },

  approve(event) {
    const reviewer = getCurrentUser();
    if (!isSuperAdmin(reviewer)) {
      wx.showToast({ title: '仅超级管理员可审核', icon: 'none' });
      return;
    }
    reviewAudit({ id: event.currentTarget.dataset.id, action: 'approve' }).then(() => {
      wx.showToast({ title: '已通过' });
      this.refresh();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '审核失败',
        icon: 'none'
      });
    });
  },

  reject(event) {
    const reviewer = getCurrentUser();
    if (!isSuperAdmin(reviewer)) {
      wx.showToast({ title: '仅超级管理员可审核', icon: 'none' });
      return;
    }
    reviewAudit({ id: event.currentTarget.dataset.id, action: 'reject', rejectReason: '后台拒绝' }).then(() => {
      wx.showToast({ title: '已拒绝' });
      this.refresh();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '审核失败',
        icon: 'none'
      });
    });
  }
});
