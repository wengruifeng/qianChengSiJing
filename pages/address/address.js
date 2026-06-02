const { getCurrentUser, requireLogin } = require('../../utils/auth');
const { getStore, updateStore, nextId } = require('../../utils/store');

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
    const user = getCurrentUser();
    this.setData({ addresses: getStore().addresses.filter((item) => item.userId === user.id) });
  },

  onInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value });
  },

  save() {
    const user = getCurrentUser();
    const form = this.data.form;
    if (!form.contactName || !form.phone || !form.region || !form.detail) {
      wx.showToast({ title: '请填写完整地址', icon: 'none' });
      return;
    }
    updateStore((store) => {
      const hasDefault = store.addresses.some((item) => item.userId === user.id && item.isDefault);
      store.addresses.push({ id: nextId('addr'), userId: user.id, ...form, isDefault: !hasDefault });
    });
    this.setData({ form: { contactName: '', phone: '', region: '', detail: '' } });
    this.refresh();
    wx.showToast({ title: '已保存' });
  },

  choose(event) {
    if (this.data.mode === 'choose') {
      wx.setStorageSync('zht_checkout_address_id', event.currentTarget.dataset.id);
      wx.navigateBack();
    }
  }
});
