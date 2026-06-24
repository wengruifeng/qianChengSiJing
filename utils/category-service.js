const { callCloud } = require('./cloud');

function normalizeCategory(item) {
  if (!item) return null;
  const category = { ...item };
  delete category._id;
  delete category._openid;
  return category;
}

function fetchAdminCategories() {
  return callCloud('listCategoriesForAdmin').then((res) => {
    if (!res.ok) throw new Error(res.message || '分类列表加载失败');
    return (res.data || []).map(normalizeCategory);
  });
}

function createCategoryAudit(payload) {
  return callCloud('createCategoryAudit', payload).then((res) => {
    if (!res.ok) throw new Error(res.message || '提交分类审核失败');
    return res.data;
  });
}

module.exports = {
  createCategoryAudit,
  fetchAdminCategories
};
