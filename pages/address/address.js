const { leaveRestrictedPageAfterLoginCancel, requireLogin } = require('../../utils/auth');
const { deleteAddress, setDefaultAddress, fetchAddressesByCurrentUser } = require('../../utils/customer-service');

Page({
  data: {
    mode: '',
    addresses: []
  },

  onLoad(options) {
    this.setData({ mode: options.mode || '' });
  },

  onShow() {
    if (!requireLogin('/pages/address/address')) {
      leaveRestrictedPageAfterLoginCancel();
      return;
    }
    this.refresh();
  },

  refresh() {
    fetchAddressesByCurrentUser().then((addresses) => {
      this.setData({ addresses });
    }).catch(() => {
      this.setData({ addresses: [] });
    });
  },

  choose(event) {
    if (this.data.mode === 'choose') {
      wx.setStorageSync('zht_checkout_address_id', event.currentTarget.dataset.id);
      wx.navigateBack();
    }
  },

  editAddress(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/address-edit/address-edit?id=${encodeURIComponent(id)}` });
  },

  removeAddress(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除地址',
      content: '确定删除这条地址吗？',
      confirmText: '删除',
      success: (res) => {
        if (!res.confirm) return;
        deleteAddress(id).then(() => {
          if (this.data.editingId === id) {
            this.resetForm();
          }
          this.refresh();
          wx.showToast({ title: '已删除' });
        }).catch((error) => {
          wx.showToast({
            title: error && error.message ? error.message : '删除失败',
            icon: 'none'
          });
        });
      }
    });
  },

  markDefault(event) {
    const id = event.currentTarget.dataset.id;
    const address = this.data.addresses.find((item) => item.id === id);
    if (!address || address.isDefault) return;
    setDefaultAddress(id).then(() => {
      this.refresh();
      wx.showToast({ title: '已设为默认' });
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '设置失败',
        icon: 'none'
      });
    });
  },

  openCreate() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' });
  }
});
