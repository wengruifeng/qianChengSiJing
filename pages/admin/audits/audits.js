const { getStore, updateStore, nextId, nowText } = require('../../../utils/store');
const { getCurrentUser, isSuperAdmin } = require('../../../utils/auth');

const statusMap = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
const sensitiveFields = [
  { key: 'price', label: '销售价' },
  { key: 'stock', label: '库存' },
  { key: 'warningStock', label: '预警库存' },
  { key: 'saleStatus', label: '上下架' },
  { key: 'categoryId', label: '分类' }
];

const typeMap = {
  product_create: '新增商品',
  product_update: '修改商品',
  product_delete: '删除商品',
  home_content_update: '首页内容'
};

Page({
  data: {
    tabs: [
      { label: '全部', value: 'all' },
      { label: '待审核', value: 'pending' },
      { label: '已通过', value: 'approved' },
      { label: '已拒绝', value: 'rejected' }
    ],
    active: 'all',
    audits: [],
    filteredAudits: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const audits = getStore().auditLogs.map((item) => {
      const diffText = [];
      if (item.beforeData && item.afterData) {
        sensitiveFields.forEach((field) => {
          if (item.beforeData[field.key] !== item.afterData[field.key]) {
            diffText.push({ field: field.label, before: item.beforeData[field.key], after: item.afterData[field.key] });
          }
        });
      }
      return {
        ...item,
        diffText,
        statusText: statusMap[item.status],
        typeText: typeMap[item.type] || item.type,
        reviewText: item.reviewedAt ? `${item.reviewerName} · ${item.reviewedAt}` : '待审核'
      };
    });
    this.setData({ audits }, this.filter);
  },

  changeTab(event) {
    this.setData({ active: event.currentTarget.dataset.value }, this.filter);
  },

  filter() {
    this.setData({
      filteredAudits: this.data.active === 'all'
        ? this.data.audits
        : this.data.audits.filter((item) => item.status === this.data.active)
    });
  },

  approve(event) {
    const reviewer = getCurrentUser();
    if (!isSuperAdmin(reviewer)) {
      wx.showToast({ title: '仅超级管理员可审核', icon: 'none' });
      return;
    }
    const id = event.currentTarget.dataset.id;
    updateStore((store) => {
      const audit = store.auditLogs.find((item) => item.id === id);
      if (!audit || audit.status !== 'pending') return;
      if (audit.targetCollection === 'products') {
        if (audit.type === 'product_create') {
          store.products.unshift({ id: nextId('p'), ...audit.afterData });
        } else {
          const index = store.products.findIndex((item) => item.id === audit.targetId);
          if (index >= 0) store.products[index] = { ...store.products[index], ...audit.afterData };
        }
      }
      if (audit.targetCollection === 'homeContent') {
        store.homeContent = { ...store.homeContent, ...audit.afterData };
      }
      audit.status = 'approved';
      audit.reviewerId = reviewer.id;
      audit.reviewerName = reviewer.nickName;
      audit.reviewedAt = nowText();
    });
    wx.showToast({ title: '已通过' });
    this.refresh();
  },

  reject(event) {
    const reviewer = getCurrentUser();
    if (!isSuperAdmin(reviewer)) {
      wx.showToast({ title: '仅超级管理员可审核', icon: 'none' });
      return;
    }
    const id = event.currentTarget.dataset.id;
    updateStore((store) => {
      const audit = store.auditLogs.find((item) => item.id === id);
      if (audit) {
        audit.status = 'rejected';
        audit.reviewerId = reviewer.id;
        audit.reviewerName = reviewer.nickName;
        audit.reviewedAt = nowText();
        audit.rejectReason = '后台拒绝';
      }
    });
    wx.showToast({ title: '已拒绝' });
    this.refresh();
  }
});
