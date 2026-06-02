const { getStore, updateStore, nextId, nowText } = require('../../../utils/store');
const { getCurrentUser, isSuperAdmin } = require('../../../utils/auth');

Page({
  data: {
    phone: '',
    admins: []
  },

  onShow() {
    this.setData({ admins: getStore().admins });
  },

  onPhone(event) {
    this.setData({ phone: event.detail.value });
  },

  add() {
    const user = getCurrentUser();
    if (!isSuperAdmin(user)) {
      wx.showToast({ title: '仅超级管理员可添加', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(this.data.phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    updateStore((store) => {
      if (!store.admins.some((item) => item.phone === this.data.phone)) {
        store.admins.push({ id: nextId('admin'), phone: this.data.phone, role: 'admin', status: 'enabled', createdAt: nowText() });
      }
    });
    wx.showToast({ title: '已添加' });
    this.setData({ phone: '', admins: getStore().admins });
  }
});
