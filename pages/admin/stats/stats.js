const { fetchAdminOrders } = require('../../../utils/order-service');
const { fetchCustomers } = require('../../../utils/customer-service');
const { fetchAdminProducts } = require('../../../utils/catalog-service');

Page({
  data: {
    amount: '0.00',
    orderCount: 0,
    customerCount: 0,
    productCount: 0,
    hotProducts: [],
    warnings: [],
    pendingSettlementAmount: '0.00',
    settledAmount: '0.00',
    topCustomers: []
  },

  onShow() {
    Promise.allSettled([
      fetchAdminOrders(),
      fetchCustomers(),
      fetchAdminProducts()
    ]).then(([ordersResult, customersResult, productsResult]) => {
      const orders = ordersResult.status === 'fulfilled' ? ordersResult.value : [];
      const customers = customersResult.status === 'fulfilled' ? customersResult.value : [];
      const products = productsResult.status === 'fulfilled' ? productsResult.value : [];
      const sold = {};
      orders.forEach((order) => {
        if (order.status === 'cancelled') return;
        (order.items || []).forEach((item) => {
          sold[item.productName] = (sold[item.productName] || 0) + Number(item.quantity || 0);
        });
      });
      this.setData({
        amount: orders.reduce((sum, item) => item.status !== 'cancelled' ? sum + Number(item.amount || 0) : sum, 0).toFixed(2),
        orderCount: orders.length,
        customerCount: customers.filter((item) => item.customerStatus === 'approved').length,
        productCount: products.length,
        pendingSettlementAmount: orders
          .filter((item) => item.settlementStatus === 'pending' && item.status !== 'cancelled')
          .reduce((sum, item) => sum + Number(item.amount || 0), 0)
          .toFixed(2),
        settledAmount: orders
          .filter((item) => item.settlementStatus === 'settled' && item.status !== 'cancelled')
          .reduce((sum, item) => sum + Number(item.amount || 0), 0)
          .toFixed(2),
        hotProducts: Object.keys(sold).map((name) => ({ name, qty: sold[name] })).sort((a, b) => b.qty - a.qty).slice(0, 10),
        warnings: products.filter((item) => item.warning),
        topCustomers: buildTopCustomers(orders)
      });

      const errors = [
        ordersResult.status === 'rejected' ? `订单：${extractErrorMessage(ordersResult.reason)}` : '',
        customersResult.status === 'rejected' ? `客户：${extractErrorMessage(customersResult.reason)}` : '',
        productsResult.status === 'rejected' ? `商品：${extractErrorMessage(productsResult.reason)}` : ''
      ].filter(Boolean);

      if (errors.length) {
        wx.showToast({
          title: errors[0].slice(0, 20),
          icon: 'none'
        });
      }
    });
  }
});

function buildTopCustomers(orders) {
  const amountMap = {};
  orders.forEach((order) => {
    if (order.status === 'cancelled') return;
    amountMap[order.customerName] = (amountMap[order.customerName] || 0) + order.amount;
  });
  return Object.keys(amountMap)
    .map((name) => ({ name, amount: amountMap[name].toFixed(2) }))
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 10);
}

function extractErrorMessage(error) {
  if (!error) return '加载失败';
  if (error.message) return error.message;
  return '加载失败';
}
