const { getStore } = require('../../../utils/store');
const { createAudit } = require('../../../utils/audit-service');
const { fetchHomeContent } = require('../../../utils/catalog-service');

Page({
  data: {
    form: {}
  },

  onLoad() {
    fetchHomeContent().then((homeContent) => {
      this.setData({ form: { ...homeContent } });
    }).catch(() => {
      this.setData({ form: { ...getStore().homeContent } });
    });
  },

  onInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value });
  },

  submit() {
    createAudit({
      type: 'home_content_update',
      targetCollection: 'home_contents',
      targetId: 'home_content',
      beforeData: getStore().homeContent,
      afterData: this.data.form,
      summary: '修改首页内容'
    }).then(() => {
      wx.showToast({ title: '已提交审核' });
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '提交审核失败',
        icon: 'none'
      });
    });
  }
});
