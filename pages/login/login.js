const { loginByPhone, loginByWxPhoneCode, markLoginCancelled } = require('../../utils/auth');
const { runtime } = require('../../utils/config');

Page({
  data: {
    phone: '',
    redirect: '',
    loading: false,
    loginSucceeded: false,
    showDevPhoneLogin: !!runtime.devPhoneLoginEnabled,
    phoneAuthEnabled: !!runtime.wechatPhoneAuthEnabled
  },

  onLoad(options) {
    this.setData({ redirect: decodeURIComponent(options.redirect || '') });
  },

  onPhone(event) {
    this.setData({ phone: event.detail.value });
  },

  onUnload() {
    if (!this.data.loginSucceeded) {
      markLoginCancelled();
    }
  },

  onGetPhoneNumber(event) {
    if (this.data.loading) return;

    const detail = event.detail || {};
    const code = detail.code;
    const errMsg = detail.errMsg || '';

    if (!code) {
      if (errMsg && errMsg.includes('deny')) {
        wx.showToast({ title: '已取消登录', icon: 'none' });
        return;
      }

      this.showError(
        `未拿到手机号授权凭据。${errMsg || '请优先用真机调试或预览版重试。'}`
      );
      return;
    }

    this.setData({ loading: true });
    loginByWxPhoneCode(code).then(() => {
      this.handleLoginSuccess();
    }).catch((error) => {
      this.showError(error && error.message ? error.message : '登录失败，请稍后重试');
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  showError(content) {
    wx.showModal({
      title: '登录失败',
      content,
      showCancel: false
    });
  },

  login() {
    if (!this.data.showDevPhoneLogin) {
      wx.showToast({ title: '当前版本请使用手机号一键登录', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(this.data.phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    if (this.data.loading) return;
    this.setData({ loading: true });
    loginByPhone(this.data.phone).then(() => {
      this.handleLoginSuccess();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '登录失败，请稍后重试',
        icon: 'none'
      });
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  handleLoginSuccess() {
    this.setData({ loginSucceeded: true });
    wx.showToast({ title: '登录成功' });
    setTimeout(() => {
      if (this.data.redirect) {
        this.navigateAfterLogin(this.data.redirect);
      } else {
        wx.switchTab({ url: '/pages/me/me' });
      }
    }, 350);
  },

  cancelLogin() {
    markLoginCancelled();
    wx.switchTab({ url: '/pages/index/index' });
  },

  navigateAfterLogin(url) {
    if (!url) {
      wx.switchTab({ url: '/pages/me/me' });
      return;
    }

    const tabPages = [
      '/pages/index/index',
      '/pages/cart/cart',
      '/pages/orders/orders',
      '/pages/me/me'
    ];

    if (tabPages.includes(url)) {
      wx.switchTab({ url });
      return;
    }

    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({
        fail: () => wx.redirectTo({ url })
      });
      return;
    }

    wx.redirectTo({
      url,
      fail: () => wx.switchTab({ url: '/pages/me/me' })
    });
  }
});
