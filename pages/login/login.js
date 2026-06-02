const { loginByPhone } = require('../../utils/auth');

Page({
  data: {
    phone: '',
    redirect: '',
    loading: false
  },

  onLoad(options) {
    this.setData({ redirect: decodeURIComponent(options.redirect || '') });
  },

  onPhone(event) {
    this.setData({ phone: event.detail.value });
  },

  login() {
    if (!/^1\d{10}$/.test(this.data.phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    if (this.data.loading) return;
    this.setData({ loading: true });
    loginByPhone(this.data.phone).then(() => {
      wx.showToast({ title: '登录成功' });
      setTimeout(() => {
        if (this.data.redirect) {
          wx.redirectTo({ url: this.data.redirect });
        } else {
          wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/me/me' }) });
        }
      }, 400);
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '登录失败，请稍后重试',
        icon: 'none'
      });
    }).finally(() => {
      this.setData({ loading: false });
    });
  }
});
