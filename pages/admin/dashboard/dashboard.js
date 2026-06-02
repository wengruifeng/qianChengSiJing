const { getStore } = require('../../../utils/store');
const { getCurrentUser, isAdmin } = require('../../../utils/auth');

Page({
  data: {
    todayAmount: '0.00',
    pendingOrders: 0,
    pendingAudits: 0,
    todayOrderCount: 0,
    approvedCustomerCount: 0,
    warningProductCount: 0,
    quickTasks: []
  },

  onShow() {
    const user = getCurrentUser();
    if (!isAdmin(user)) {
      wx.showToast({ title: '无后台权限', icon: 'none' });
      wx.navigateBack();
      return;
    }
    const store = getStore();
    const today = nowDateText();
    const todayOrders = store.orders.filter((item) => (item.createdAt || '').slice(0, 10) === today && item.status !== 'cancelled');
    const warningProducts = store.products.filter((item) => item.deleteStatus !== 'deleted' && (item.stock - item.lockedStock) <= item.warningStock);
    this.setData({
      todayAmount: store.orders.reduce((sum, item) => item.status !== 'cancelled' ? sum + item.amount : sum, 0).toFixed(2),
      pendingOrders: store.orders.filter((item) => item.status === 'pending').length,
      pendingAudits: store.auditLogs.filter((item) => item.status === 'pending').length,
      todayOrderCount: todayOrders.length,
      approvedCustomerCount: store.users.filter((item) => item.customerStatus === 'approved').length,
      warningProductCount: warningProducts.length,
      quickTasks: [
        { label: '待确认订单', value: store.orders.filter((item) => item.status === 'pending').length, url: '/pages/admin/orders/orders' },
        { label: '待审核变更', value: store.auditLogs.filter((item) => item.status === 'pending').length, url: '/pages/admin/audits/audits' },
        { label: '库存预警商品', value: warningProducts.length, url: '/pages/admin/products/products' }
      ]
    });
  },

  go(event) {
    wx.navigateTo({ url: event.currentTarget.dataset.url });
  }
});

function nowDateText() {
  const date = new Date();
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
