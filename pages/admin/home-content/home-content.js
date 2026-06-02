const { getStore } = require('../../../utils/store');
const { createAudit } = require('../../../utils/business');

Page({
  data: {
    form: {}
  },

  onLoad() {
    this.setData({ form: { ...getStore().homeContent } });
  },

  onInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value });
  },

  submit() {
    createAudit('home_content_update', 'homeContent', 'home', getStore().homeContent, this.data.form, '修改首页内容');
    wx.showToast({ title: '已提交审核' });
  }
});
