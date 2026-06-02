const { getCurrentUser, requireLogin } = require('../../utils/auth');
const { saveAddress, fetchAddressesByCurrentUser } = require('../../utils/customer-service');

Page({
  data: {
    mode: '',
    addresses: [],
    form: {
      contactName: '',
      phone: '',
      region: '',
      detail: ''
    }
  },

  onLoad(options) {
    this.setData({ mode: options.mode || '' });
  },

  onShow() {
    if (!requireLogin('/pages/address/address')) return;
    this.refresh();
  },

  refresh() {
    fetchAddressesByCurrentUser().then((addresses) => {
      this.setData({ addresses });
    }).catch(() => {
      this.setData({ addresses: [] });
    });
  },

  onInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value });
  },

  save() {
    const form = this.data.form;
    if (!form.contactName || !form.phone || !form.region || !form.detail) {
      wx.showToast({ title: '请填写完整地址', icon: 'none' });
      return;
    }
    saveAddress(form).then(() => {
      this.setData({ form: { contactName: '', phone: '', region: '', detail: '' } });
      this.refresh();
      wx.showToast({ title: '已保存' });
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '保存失败，请稍后再试',
        icon: 'none'
      });
    });
  },

  choose(event) {
    if (this.data.mode === 'choose') {
      wx.setStorageSync('zht_checkout_address_id', event.currentTarget.dataset.id);
      wx.navigateBack();
    }
  }
});
