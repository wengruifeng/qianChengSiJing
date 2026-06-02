const { getCurrentUser, requireLogin } = require('../../utils/auth');
const { updateStore, nowText, nextId } = require('../../utils/store');

Page({
  data: {
    user: null,
    company: '',
    region: '',
    addressDetail: '',
    statusText: ''
  },

  onShow() {
    const user = requireLogin('/pages/apply/apply');
    if (!user) return;
    const map = { not_applied: '未申请', pending: '待审核', approved: '已通过', rejected: '已拒绝' };
    this.setData({
      user,
      company: user.company,
      region: user.region,
      addressDetail: user.addressDetail,
      statusText: map[user.customerStatus]
    });
  },

  onCompany(event) {
    this.setData({ company: event.detail.value });
  },

  onRegion(event) {
    this.setData({ region: event.detail.value });
  },

  onDetail(event) {
    this.setData({ addressDetail: event.detail.value });
  },

  submit() {
    if (!this.data.company || !this.data.region || !this.data.addressDetail) {
      wx.showToast({ title: '请填写完整资料', icon: 'none' });
      return;
    }
    updateStore((store) => {
      const user = store.users.find((item) => item.id === this.data.user.id);
      user.company = this.data.company;
      user.region = this.data.region;
      user.addressDetail = this.data.addressDetail;
      user.customerStatus = 'pending';
      user.appliedAt = nowText();
      store.operationLogs.unshift({
        id: nextId('op'),
        operatorId: user.id,
        operatorName: user.nickName,
        type: 'apply_price',
        target: user.phone,
        summary: `${user.company} 提交查看价格申请`,
        createdAt: nowText()
      });
    });
    wx.showToast({ title: '已提交申请' });
    setTimeout(() => wx.switchTab({ url: '/pages/me/me' }), 500);
  },

  saveDefaultAddress() {
    const user = this.data.user;
    updateStore((store) => {
      store.addresses.forEach((item) => {
        if (item.userId === user.id) item.isDefault = false;
      });
      store.addresses.push({
        id: nextId('addr'),
        userId: user.id,
        contactName: this.data.company,
        phone: user.phone,
        region: this.data.region,
        detail: this.data.addressDetail,
        isDefault: true
      });
    });
    wx.showToast({ title: '已保存默认地址' });
  }
});
