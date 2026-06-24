const { getCurrentUser, isAdmin, refreshCurrentUser } = require('../../../utils/auth');
const { createCategoryAudit, fetchAdminCategories } = require('../../../utils/category-service');

const emptyForm = {
  name: '',
  sort: 99
};

Page({
  data: {
    categories: [],
    form: { ...emptyForm },
    editing: null,
    showEditor: false,
    loading: false,
    submitting: false
  },

  onShow() {
    const cachedUser = getCurrentUser();
    if (!isAdmin(cachedUser)) {
      wx.showToast({ title: '无后台权限', icon: 'none' });
      wx.navigateBack();
      return;
    }
    refreshCurrentUser().then((user) => {
      if (!isAdmin(user)) {
        wx.showToast({ title: '后台权限已失效', icon: 'none' });
        wx.navigateBack();
        return;
      }
      this.refresh();
    }).catch(() => {
      wx.showToast({ title: '权限校验失败', icon: 'none' });
      wx.navigateBack();
    });
  },

  ensureAdmin() {
    const user = getCurrentUser();
    if (!isAdmin(user)) {
      wx.showToast({ title: '无后台权限', icon: 'none' });
      return false;
    }
    return true;
  },

  refresh() {
    this.setData({ loading: true });
    fetchAdminCategories().then((categories) => {
      this.setData({ categories });
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '分类加载失败',
        icon: 'none'
      });
      this.setData({ categories: [] });
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  onName(event) {
    this.setData({ 'form.name': event.detail.value });
  },

  onSort(event) {
    this.setData({ 'form.sort': event.detail.value });
  },

  edit(event) {
    const category = this.data.categories.find((item) => item.id === event.currentTarget.dataset.id);
    if (!category) return;
    this.setData({
      editing: category,
      showEditor: true,
      form: {
        name: category.name || '',
        sort: category.sort || 99
      }
    });
  },

  openCreate() {
    this.setData({
      editing: null,
      showEditor: true,
      form: { ...emptyForm }
    });
  },

  cancelEdit() {
    this.setData({ editing: null, showEditor: false, form: { ...emptyForm } });
  },

  noop() {},

  submit() {
    if (this.data.submitting) return;
    if (!this.ensureAdmin()) return;
    const name = this.data.form.name.trim();
    const sort = Number(this.data.form.sort);
    if (!name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' });
      return;
    }
    if (!Number.isFinite(sort)) {
      wx.showToast({ title: '请输入正确排序', icon: 'none' });
      return;
    }

    const editing = this.data.editing;
    const afterData = {
      ...(editing || {}),
      name,
      sort,
      status: (editing && editing.status) || 'enabled',
      deleteStatus: 'normal'
    };
    this.setData({ submitting: true });
    createCategoryAudit({
      type: editing ? 'category_update' : 'category_create',
      targetId: editing ? editing.id : '',
      beforeData: editing || null,
      afterData,
      summary: `${editing ? '修改分类' : '新增分类'}：${name}`
    }).then(() => {
      wx.showToast({ title: '已提交审核' });
      this.cancelEdit();
      this.refresh();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '提交审核失败',
        icon: 'none'
      });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  },

  requestDelete(event) {
    if (!this.ensureAdmin()) return;
    const category = this.data.categories.find((item) => item.id === event.currentTarget.dataset.id);
    if (!category) return;
    wx.showModal({
      title: '删除分类',
      content: `确定提交删除“${category.name}”吗？分类下有商品时不能删除。`,
      confirmText: '提交',
      success: (res) => {
        if (!res.confirm) return;
        createCategoryAudit({
          type: 'category_delete',
          targetId: category.id,
          beforeData: category,
          afterData: {
            ...category,
            deleteStatus: 'deleted'
          },
          summary: `删除分类：${category.name}`
        }).then(() => {
          wx.showToast({ title: '已提交审核' });
          this.refresh();
        }).catch((error) => {
          wx.showToast({
            title: error && error.message ? error.message : '提交删除失败',
            icon: 'none'
          });
        });
      }
    });
  }
});
