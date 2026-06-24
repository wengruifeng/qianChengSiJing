const { getCurrentUser, isAdmin, isRootAdmin, refreshCurrentUser } = require('../../../utils/auth');
const { fetchAdminOrders } = require('../../../utils/order-service');
const { fetchCustomers } = require('../../../utils/customer-service');
const { fetchAdminProducts } = require('../../../utils/catalog-service');
const { fetchAudits } = require('../../../utils/audit-service');

Page({
  data: {
    todayAmount: '0.00',
    pendingOrders: 0,
    pendingAudits: 0,
    todayOrderCount: 0,
    approvedCustomerCount: 0,
    warningProductCount: 0,
    isRootAdmin: false,
    quickTasks: []
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
      this.loadDashboard(user);
    }).catch(() => {
      wx.showToast({ title: '权限校验失败', icon: 'none' });
      wx.navigateBack();
    });
  },

  loadDashboard(user) {
    Promise.allSettled([
      fetchAdminOrders(),
      fetchCustomers(),
      fetchAdminProducts(),
      fetchAudits()
    ]).then(([ordersResult, customersResult, productsResult, auditsResult]) => {
      const orders = ordersResult.status === 'fulfilled' ? ordersResult.value : [];
      const customers = customersResult.status === 'fulfilled' ? customersResult.value : [];
      const products = productsResult.status === 'fulfilled' ? productsResult.value : [];
      const audits = auditsResult.status === 'fulfilled' ? auditsResult.value : [];
      const today = nowDateText();
      const todayOrders = orders.filter((item) => (item.createdAt || '').slice(0, 10) === today && item.status !== 'cancelled');
      const warningProducts = products.filter((item) => item.warning);
      const errors = [
        ordersResult.status === 'rejected' ? `订单：${extractErrorMessage(ordersResult.reason)}` : '',
        customersResult.status === 'rejected' ? `客户：${extractErrorMessage(customersResult.reason)}` : '',
        productsResult.status === 'rejected' ? `商品：${extractErrorMessage(productsResult.reason)}` : '',
        auditsResult.status === 'rejected' ? `审核：${extractErrorMessage(auditsResult.reason)}` : ''
      ].filter(Boolean);

      this.setData({
        isRootAdmin: isRootAdmin(user),
        todayAmount: orders.reduce((sum, item) => item.status !== 'cancelled' ? sum + Number(item.amount || 0) : sum, 0).toFixed(2),
        pendingOrders: orders.filter((item) => item.status === 'pending').length,
        pendingAudits: audits.filter((item) => item.status === 'pending').length,
        todayOrderCount: todayOrders.length,
        approvedCustomerCount: customers.filter((item) => item.customerStatus === 'approved').length,
        warningProductCount: warningProducts.length,
        quickTasks: [
          { label: '待确认订单', value: orders.filter((item) => item.status === 'pending').length, url: '/pages/admin/orders/orders' },
          { label: '待审核变更', value: audits.filter((item) => item.status === 'pending').length, url: '/pages/admin/audits/audits' },
          { label: '库存预警商品', value: warningProducts.length, url: '/pages/admin/products/products' }
        ]
      });

      if (errors.length) {
        wx.showToast({
          title: errors[0].slice(0, 20),
          icon: 'none'
        });
      }
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

function extractErrorMessage(error) {
  if (!error) return '加载失败';
  if (error.message) return error.message;
  return '加载失败';
}
