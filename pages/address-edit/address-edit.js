const { leaveRestrictedPageAfterLoginCancel, requireLogin } = require('../../utils/auth');
const {
  saveAddress,
  updateAddress,
  fetchAddressesByCurrentUser
} = require('../../utils/customer-service');

const emptyForm = {
  contactName: '',
  phone: '',
  region: '',
  regionParts: [],
  detail: ''
};

Page({
  data: {
    id: '',
    saving: false,
    title: '新增地址',
    submitText: '保存地址',
    form: { ...emptyForm }
  },

  onLoad(options) {
    this.setData({ id: options.id || '' });
  },

  onShow() {
    if (!requireLogin('/pages/address/address')) {
      leaveRestrictedPageAfterLoginCancel();
      return;
    }
    if (!this.data.id) {
      wx.setNavigationBarTitle({ title: '新增地址' });
      return;
    }
    wx.setNavigationBarTitle({ title: '编辑地址' });
    this.loadDetail();
  },

  loadDetail() {
    fetchAddressesByCurrentUser().then((addresses) => {
      const address = addresses.find((item) => item.id === this.data.id);
      if (!address) {
        wx.showToast({ title: '地址不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 400);
        return;
      }
      this.setData({
        title: '编辑地址',
        submitText: '保存修改',
        form: {
          contactName: address.contactName || '',
          phone: address.phone || '',
          region: address.region || '',
          regionParts: splitRegion(address.region),
          detail: address.detail || ''
        }
      });
    }).catch(() => {
      wx.showToast({ title: '地址加载失败', icon: 'none' });
    });
  },

  onInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value });
  },

  onRegionChange(event) {
    const regionParts = event.detail.value || [];
    this.setData({
      'form.regionParts': regionParts,
      'form.region': regionParts.join(' ')
    });
  },

  save() {
    if (this.data.saving) return;
    const form = this.data.form;
    const isEditing = !!this.data.id;
    if (!form.contactName || !form.phone || !form.region || !form.detail) {
      wx.showToast({ title: '请填写完整地址', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(form.phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    const task = isEditing
      ? updateAddress({ id: this.data.id, form })
      : saveAddress(form);
    task.then(() => {
      wx.showToast({ title: isEditing ? '已更新' : '已保存' });
      setTimeout(() => wx.navigateBack(), 350);
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '保存失败，请稍后再试',
        icon: 'none'
      });
    }).finally(() => {
      this.setData({ saving: false });
    });
  }
});

function splitRegion(regionText) {
  if (!regionText) return [];
  return String(regionText).split(/\s+/).filter(Boolean).slice(0, 3);
}
