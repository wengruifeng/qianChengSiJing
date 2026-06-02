const { getStore } = require('../../../utils/store');

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
    const store = getStore();
    const sold = {};
    store.orders.forEach((order) => {
      if (order.status === 'cancelled') return;
      order.items.forEach((item) => {
        sold[item.productName] = (sold[item.productName] || 0) + item.quantity;
      });
    });
    this.setData({
      amount: store.orders.reduce((sum, item) => item.status !== 'cancelled' ? sum + item.amount : sum, 0).toFixed(2),
      orderCount: store.orders.length,
      customerCount: store.users.filter((item) => item.customerStatus === 'approved').length,
      productCount: store.products.filter((item) => item.deleteStatus !== 'deleted').length,
      pendingSettlementAmount: store.orders
        .filter((item) => item.settlementStatus === 'pending' && item.status !== 'cancelled')
        .reduce((sum, item) => sum + item.amount, 0)
        .toFixed(2),
      settledAmount: store.orders
        .filter((item) => item.settlementStatus === 'settled' && item.status !== 'cancelled')
        .reduce((sum, item) => sum + item.amount, 0)
        .toFixed(2),
      hotProducts: Object.keys(sold).map((name) => ({ name, qty: sold[name] })).sort((a, b) => b.qty - a.qty).slice(0, 10),
      warnings: store.products
        .map((item) => ({ ...item, availableStock: item.stock - item.lockedStock }))
        .filter((item) => item.availableStock <= item.warningStock),
      topCustomers: buildTopCustomers(store.orders)
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
