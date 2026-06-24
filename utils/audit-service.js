const { cloudFirst } = require('./cloud');
const { getStore, updateStore, nextId, nowText, clone } = require('./store');
const { getCurrentUser, isSuperAdmin } = require('./auth');
const { fetchAdminCategories } = require('./category-service');

const statusMap = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
const fieldLabelMap = {
  name: '商品名称',
  spec: '规格说明',
  unit: '单位',
  description: '商品描述',
  price: '销售价',
  stock: '库存',
  warningStock: '预警库存',
  saleStatus: '上下架',
  categoryId: '分类',
  storeName: '店铺名称',
  businessStatus: '经营状态',
  industryScope: '行业范围',
  operationMode: '经营方式',
  bannerTitle: '首页主标题',
  notice: '滚动公告',
  servicePhone: '联系电话',
  logoImage: '店铺Logo',
  heroImage: '首页主图',
  topicImage: '专题横幅',
  mainImage: '商品主图',
  detailImages: '详情图片',
  tags: '标签'
};

const sensitiveKeySet = new Set([
  'price',
  'stock',
  'warningStock',
  'saleStatus',
  'categoryId',
  'servicePhone'
]);

const imageLogicalKeyMap = {
  logoImageFileId: 'logoImage',
  heroImageFileId: 'heroImage',
  topicImageFileId: 'topicImage',
  mainImageFileId: 'mainImage',
  detailImageFileIds: 'detailImages'
};

const imageFieldSet = new Set([
  'logoImage',
  'heroImage',
  'topicImage',
  'mainImage',
  'detailImages'
]);

const longTextFieldSet = new Set([
  'notice',
  'description'
]);

const typeMap = {
  product_create: '新增商品',
  product_update: '修改商品',
  product_delete: '删除商品',
  home_content_update: '首页内容',
  category_create: '新增分类',
  category_update: '修改分类',
  category_delete: '删除分类'
};

function normalizeAuditKey(key) {
  return imageLogicalKeyMap[key] || key;
}

function normalizeAuditValue(key, value) {
  const logicalKey = normalizeAuditKey(key);
  if (imageFieldSet.has(logicalKey)) {
    if (!value) return [];
    return Array.isArray(value) ? value.filter(Boolean) : [value];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return value;
}

function isSameValue(before, after) {
  return JSON.stringify(before) === JSON.stringify(after);
}

function formatTextValue(value) {
  if (Array.isArray(value)) return value.join('、');
  if (value === '' || value === undefined || value === null) return '空';
  return `${value}`;
}

function formatDisplayValue(key, value, context = {}) {
  if (key === 'categoryId') {
    if (!value) return '空';
    return (context.categoryMap && context.categoryMap[value]) || `未知分类（${value}）`;
  }
  if (key === 'saleStatus') {
    const map = { on: '上架', off: '下架' };
    return map[value] || formatTextValue(value);
  }
  if (key === 'deleteStatus') {
    const map = { normal: '正常', deleted: '已删除' };
    return map[value] || formatTextValue(value);
  }
  if (key === 'status') {
    const map = { enabled: '启用', disabled: '停用' };
    return map[value] || formatTextValue(value);
  }
  return formatTextValue(value);
}

function buildDiffItems(beforeData = {}, afterData = {}, context = {}) {
  const rawKeys = new Set([
    ...Object.keys(beforeData || {}),
    ...Object.keys(afterData || {})
  ]);

  const groupedKeys = [];
  rawKeys.forEach((key) => {
    if (key === '_id' || key === '_openid' || key === 'updatedAt' || key === 'createdAt' || key === 'updatedBy') return;
    const logicalKey = normalizeAuditKey(key);
    if (!groupedKeys.includes(logicalKey)) groupedKeys.push(logicalKey);
  });

  return groupedKeys.reduce((list, key) => {
    const before = normalizeAuditValue(key, beforeData[key] !== undefined ? beforeData[key] : beforeData[Object.keys(imageLogicalKeyMap).find((alias) => imageLogicalKeyMap[alias] === key)]);
    const after = normalizeAuditValue(key, afterData[key] !== undefined ? afterData[key] : afterData[Object.keys(imageLogicalKeyMap).find((alias) => imageLogicalKeyMap[alias] === key)]);
    if (isSameValue(before, after)) return list;

    const item = {
      key,
      label: fieldLabelMap[key] || key,
      sensitive: sensitiveKeySet.has(key)
    };

    if (imageFieldSet.has(key)) {
      item.kind = 'image';
      item.beforeImages = before;
      item.afterImages = after;
    } else if (longTextFieldSet.has(key)) {
      item.kind = 'longText';
      item.beforeText = formatDisplayValue(key, before, context);
      item.afterText = formatDisplayValue(key, after, context);
    } else {
      item.kind = 'text';
      item.beforeText = formatDisplayValue(key, before, context);
      item.afterText = formatDisplayValue(key, after, context);
    }

    list.push(item);
    return list;
  }, []);
}

function enrichAudit(item, context = {}) {
  const diffItems = buildDiffItems(item.beforeData || {}, item.afterData || {}, context);
  return {
    ...item,
    diffItems,
    changedCount: diffItems.length,
    sensitiveChangedCount: diffItems.filter((diff) => diff.sensitive).length,
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

function enrichAudits(audits) {
  return fetchAdminCategories().then((categories) => {
    const categoryMap = {};
    categories.forEach((item) => {
      categoryMap[item.id] = item.name;
    });
    return audits.map((audit) => enrichAudit(audit, { categoryMap }));
  }).catch(() => audits.map(enrichAudit));
}

function fetchAudits() {
  return fetchAuditsPage({ status: 'all', page: 1, pageSize: 50 }).then((result) => result.items);
}

function fetchAuditsPage({ status = 'all', page = 1, pageSize = 20 } = {}) {
  return cloudFirst('listAudits', { status, page, pageSize }, () => {
    const allAudits = getStore().auditLogs
      .filter((item) => status === 'all' || item.status === status)
      .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
    const start = (page - 1) * pageSize;
    const items = allAudits.slice(start, start + pageSize);
    return {
      items,
      page,
      pageSize,
      total: allAudits.length,
      hasMore: start + items.length < allAudits.length
    };
  }).then((result) => {
    const pageResult = Array.isArray(result)
      ? {
          items: result,
          page,
          pageSize,
          total: result.length,
          hasMore: false
        }
      : result;
    return enrichAudits(pageResult.items || []).then((items) => ({
      ...pageResult,
      items
    }));
  });
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
  fetchAuditsPage,
  reviewAudit
};
