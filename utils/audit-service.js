const { callCloud, canUseCloud } = require('./cloud');
const { runtime } = require('./config');
const { getStore, updateStore, nextId, nowText, clone } = require('./store');
const { getCurrentUser, isSuperAdmin } = require('./auth');

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

function cloudFirst(action, payload, fallback) {
  if (runtime.mode === 'cloud-first' && canUseCloud()) {
    return callCloud(action, payload).then((res) => {
      if (res.ok) return res.data;
      if (runtime.fallbackToMock) return fallback();
      throw new Error(res.message || `${action} failed`);
    }).catch((error) => {
      if (runtime.fallbackToMock) return fallback();
      throw error;
    });
  }
  return Promise.resolve(fallback());
}

function enrichAudit(item) {
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
}

function createAuditMock({ type, targetCollection, targetId, beforeData, afterData, summary }) {
  const user = getCurrentUser();
  let audit = null;
  updateStore((store) => {
    audit = {
      id: nextId('audit'),
      type,
      targetCollection,
      targetId,
      submitterId: user ? user.id : '',
      submitterName: user ? user.nickName : '系统',
      submittedAt: nowText(),
      status: 'pending',
      reviewerId: '',
      reviewerName: '',
      reviewedAt: '',
      beforeData: beforeData ? clone(beforeData) : null,
      afterData: afterData ? clone(afterData) : null,
      summary,
      rejectReason: ''
    };
    store.auditLogs.unshift(audit);
  });
  return enrichAudit(audit);
}

function createAudit(payload) {
  return cloudFirst('createAudit', payload, () => createAuditMock(payload));
}

function fetchAudits() {
  return cloudFirst('listAudits', {}, () => {
    return getStore().auditLogs.map(enrichAudit);
  }).then((audits) => audits.map(enrichAudit));
}

function reviewAuditMock({ id, action, rejectReason }) {
  const reviewer = getCurrentUser();
  if (!isSuperAdmin(reviewer)) {
    throw new Error('仅超级管理员可审核');
  }
  updateStore((store) => {
    const audit = store.auditLogs.find((item) => item.id === id);
    if (!audit || audit.status !== 'pending') return;
    if (action === 'approve') {
      if (audit.targetCollection === 'products') {
        if (audit.type === 'product_create') {
          store.products.unshift({ id: nextId('p'), ...audit.afterData });
        } else {
          const index = store.products.findIndex((item) => item.id === audit.targetId);
          if (index >= 0) store.products[index] = { ...store.products[index], ...audit.afterData };
        }
      }
      if (audit.targetCollection === 'home_contents' || audit.targetCollection === 'homeContent') {
        store.homeContent = { ...store.homeContent, ...audit.afterData };
      }
      audit.status = 'approved';
    } else {
      audit.status = 'rejected';
      audit.rejectReason = rejectReason || '后台拒绝';
    }
    audit.reviewerId = reviewer.id;
    audit.reviewerName = reviewer.nickName;
    audit.reviewedAt = nowText();
  });
  const audit = getStore().auditLogs.find((item) => item.id === id);
  return enrichAudit(audit);
}

function reviewAudit(payload) {
  return cloudFirst('reviewAudit', payload, () => reviewAuditMock(payload)).then((audit) => enrichAudit(audit));
}

module.exports = {
  createAudit,
  fetchAudits,
  reviewAudit
};
