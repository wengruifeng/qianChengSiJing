const { getCurrentUser, requireLogin } = require('../../utils/auth');
const { submitApply } = require('../../utils/customer-service');

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
    submitApply({
      company: this.data.company,
      region: this.data.region,
      addressDetail: this.data.addressDetail
    }).then(() => {
      wx.showToast({ title: '已提交申请' });
      setTimeout(() => wx.switchTab({ url: '/pages/me/me' }), 500);
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '提交失败，请稍后再试',
        icon: 'none'
      });
    });
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
