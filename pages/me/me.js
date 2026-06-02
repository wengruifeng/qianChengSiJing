const { getCurrentUser, isAdmin } = require('../../utils/auth');

Page({
  data: {
    user: null,
    isAdmin: false,
    statusText: '未申请'
  },

  onShow() {
    const user = getCurrentUser();
    const map = {
      not_applied: '未申请',
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝'
    };
    this.setData({
      user,
      initial: user ? user.nickName.substring(0, 1) : '未',
      isAdmin: isAdmin(user),
      statusText: user ? map[user.customerStatus] || '未申请' : '未登录'
    });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  goApply() {
    wx.navigateTo({ url: '/pages/apply/apply' });
  },

  goAddress() {
    wx.navigateTo({ url: '/pages/address/address' });
  },

  goAgreement() {
    wx.navigateTo({ url: '/pages/agreement/agreement' });
  },

  goMessages() {
    wx.navigateTo({ url: '/pages/message-settings/message-settings' });
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' });
  }
});
