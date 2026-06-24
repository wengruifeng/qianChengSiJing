const { getCurrentUser, isAdmin, isSuperAdmin, refreshCurrentUser } = require('../../../utils/auth');
const { fetchAuditsPage, reviewAudit } = require('../../../utils/audit-service');

const PAGE_SIZE = 20;

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
    filteredAudits: [],
    expandedIds: [],
    loading: false,
    loadingMore: false,
    errorText: '',
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    hasMore: false
  },

  onShow() {
    refreshCurrentUser().then((user) => {
      if (!isAdmin(user)) {
        wx.showToast({ title: '后台权限已失效', icon: 'none' });
        wx.navigateBack();
        return;
      }
      this.refresh();
    }).catch(() => {
      this.setData({
        audits: [],
        filteredAudits: [],
        expandedIds: [],
        errorText: '权限校验失败，请重新登录后再试'
      });
    });
  },

  refresh() {
    this.loadPage(1, true);
  },

  loadPage(page, replace) {
    if (this.data.loading || this.data.loadingMore) return;
    this.setData({
      loading: replace,
      loadingMore: !replace,
      errorText: replace ? '' : this.data.errorText
    });
    fetchAuditsPage({
      status: this.data.active,
      page,
      pageSize: this.data.pageSize
    }).then((result) => {
      const audits = replace ? result.items : this.data.audits.concat(result.items);
      const expandedIds = audits
        .filter((item) => item.status === 'pending' && item.diffItems && item.diffItems.length > 0)
        .map((item) => item.id);
      this.setData({
        audits,
        expandedIds,
        page: result.page,
        total: result.total,
        hasMore: result.hasMore
      }, this.filter);
    }).catch((error) => {
      const nextData = {
        errorText: extractErrorMessage(error)
      };
      if (replace) {
        nextData.audits = [];
        nextData.filteredAudits = [];
        nextData.expandedIds = [];
        nextData.page = 1;
        nextData.total = 0;
        nextData.hasMore = false;
      }
      this.setData(nextData);
      wx.showToast({
        title: extractErrorMessage(error).slice(0, 20),
        icon: 'none'
      });
    }).finally(() => {
      this.setData({ loading: false, loadingMore: false });
    });
  },

  changeTab(event) {
    this.setData({
      active: event.currentTarget.dataset.value,
      audits: [],
      filteredAudits: [],
      expandedIds: [],
      page: 1,
      total: 0,
      hasMore: false
    }, this.refresh);
  },

  filter() {
    this.setData({
      filteredAudits: this.data.audits.map((item) => ({
        ...item,
        expanded: this.data.expandedIds.includes(item.id)
      }))
    });
  },

  toggleExpand(event) {
    const id = event.currentTarget.dataset.id;
    const expandedIds = this.data.expandedIds.slice();
    const index = expandedIds.indexOf(id);
    if (index >= 0) {
      expandedIds.splice(index, 1);
    } else {
      expandedIds.push(id);
    }
    this.setData({ expandedIds }, this.filter);
  },

  loadMore() {
    if (!this.data.hasMore) return;
    this.loadPage(this.data.page + 1, false);
  },

  approve(event) {
    const reviewer = getCurrentUser();
    if (!isSuperAdmin(reviewer)) {
      wx.showToast({ title: '仅超级管理员可审核', icon: 'none' });
      return;
    }
    reviewAudit({ id: event.currentTarget.dataset.id, action: 'approve' }).then(() => {
      wx.showToast({ title: '已通过' });
      this.setData({ expandedIds: [] });
      this.refresh();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '审核失败',
        icon: 'none'
      });
    });
  },

  reject(event) {
    const reviewer = getCurrentUser();
    if (!isSuperAdmin(reviewer)) {
      wx.showToast({ title: '仅超级管理员可审核', icon: 'none' });
      return;
    }
    reviewAudit({ id: event.currentTarget.dataset.id, action: 'reject', rejectReason: '后台拒绝' }).then(() => {
      wx.showToast({ title: '已拒绝' });
      this.setData({ expandedIds: [] });
      this.refresh();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '审核失败',
        icon: 'none'
      });
    });
  }
});

function extractErrorMessage(error) {
  if (!error) return '审核记录加载失败';
  if (error.message) return error.message;
  return '审核记录加载失败';
}
