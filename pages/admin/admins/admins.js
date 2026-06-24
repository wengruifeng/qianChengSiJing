const { getCurrentUser, isRootAdmin } = require('../../../utils/auth');
const { addAdmin, deleteAdmin, fetchAdmins, updateAdmin } = require('../../../utils/admin-service');

Page({
  data: {
    role: 'admin',
    roleName: '管理员',
    addButtonText: '新增管理员',
    phone: '',
    name: '',
    remark: '',
    editingId: '',
    editingProtected: false,
    showEditor: false,
    admins: [],
    loading: false,
    submitting: false
  },

  onLoad(options) {
    const role = options.role === 'super_admin' ? 'super_admin' : 'admin';
    const roleName = role === 'super_admin' ? '超级管理员' : '管理员';
    wx.setNavigationBarTitle({ title: `${roleName}管理` });
    this.setData({ role, roleName, addButtonText: `新增${roleName}` });
  },

  onShow() {
    this.refresh();
  },

  onPhone(event) {
    this.setData({ phone: event.detail.value });
  },

  onName(event) {
    this.setData({ name: event.detail.value });
  },

  onRemark(event) {
    this.setData({ remark: event.detail.value });
  },

  refresh() {
    const user = getCurrentUser();
    if (!isRootAdmin(user)) {
      this.setData({ admins: [] });
      wx.showToast({ title: '仅特殊超级管理员可查看', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    fetchAdmins(this.data.role).then((admins) => {
      this.setData({ admins });
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '管理员列表加载失败',
        icon: 'none'
      });
      this.setData({ admins: [] });
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  submit() {
    const user = getCurrentUser();
    if (!isRootAdmin(user)) {
      wx.showToast({ title: '仅特殊超级管理员可操作', icon: 'none' });
      return;
    }
    const phone = this.data.phone.trim();
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    const payload = {
      id: this.data.editingId,
      phone,
      role: this.data.role,
      name: this.data.name.trim(),
      remark: this.data.remark.trim()
    };
    const task = this.data.editingId ? updateAdmin(payload) : addAdmin(payload);
    task.then(() => {
      wx.showToast({ title: this.data.editingId ? '已保存' : '已添加' });
      this.closeEditor();
      this.refresh();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '添加管理员失败',
        icon: 'none'
      });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  },

  edit(event) {
    const admin = this.data.admins.find((item) => item.id === event.currentTarget.dataset.id);
    if (!admin) return;
    this.setData({
      editingId: admin.id,
      editingProtected: admin.protected === true,
      showEditor: true,
      phone: admin.phone || '',
      name: admin.name || '',
      remark: admin.remark || ''
    });
  },

  openCreate() {
    this.setData({
      editingId: '',
      editingProtected: false,
      showEditor: true,
      phone: '',
      name: '',
      remark: ''
    });
  },

  cancelEdit() {
    this.closeEditor();
  },

  closeEditor() {
    this.setData({
      editingId: '',
      editingProtected: false,
      showEditor: false,
      phone: '',
      name: '',
      remark: ''
    });
  },

  noop() {},

  remove(event) {
    const id = event.currentTarget.dataset.id;
    const admin = this.data.admins.find((item) => item.id === id);
    if (!admin) return;
    wx.showModal({
      title: `删除${this.data.roleName}`,
      content: `确定删除 ${admin.name || admin.phone}？删除后该手机号将不再显示后台入口，但仍可使用前台。`,
      confirmText: '删除',
      success: (res) => {
        if (!res.confirm) return;
        deleteAdmin({ id, role: this.data.role }).then(() => {
          wx.showToast({ title: '已删除' });
          this.refresh();
        }).catch((error) => {
          wx.showToast({
            title: error && error.message ? error.message : '删除失败',
            icon: 'none'
          });
        });
      }
    });
  }
});
