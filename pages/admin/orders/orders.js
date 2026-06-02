const { getStore, updateStore, nowText, nextId } = require('../../../utils/store');

const statusMap = {
  pending: '待确认',
  confirmed: '已确认',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消'
};

const settlementMap = {
  pending: '待结算',
  settled: '已结算'
};

Page({
  data: {
    keyword: '',
    status: 'all',
    statusLabel: '全部状态',
    statusOptions: [
      { label: '全部状态', value: 'all' },
      { label: '待确认', value: 'pending' },
      { label: '已确认', value: 'confirmed' },
      { label: '配送中', value: 'delivering' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' }
    ],
    nextStatuses: [
      { label: '待确认', value: 'pending' },
      { label: '已确认', value: 'confirmed' },
      { label: '配送中', value: 'delivering' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' }
    ],
    orders: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const keyword = this.data.keyword.toLowerCase();
    const orders = getStore().orders.filter((order) => {
      const goodsText = order.items.map((item) => item.productName).join(' ');
      const text = `${order.customerName}${order.customerPhone}${goodsText}`.toLowerCase();
      return (this.data.status === 'all' || order.status === this.data.status) && (!keyword || text.includes(keyword));
    }).map((order) => ({
      ...order,
      statusText: statusMap[order.status],
      statusClass: `status-${order.status}`,
      settlementText: settlementMap[order.settlementStatus] || '待结算',
      settlementClass: `settlement-${order.settlementStatus || 'pending'}`,
      goodsText: order.items.map((item) => `${item.productName}×${item.quantity}`).join('，'),
      totalQty: order.items.reduce((sum, item) => sum + item.quantity, 0),
      addressText: `${order.addressSnapshot.region} ${order.addressSnapshot.detail}`,
      remarkText: order.remark || '无备注'
    }));
    this.setData({ orders });
  },

  onKeyword(event) {
    this.setData({ keyword: event.detail.value }, this.refresh);
  },

  onStatus(event) {
    const option = this.data.statusOptions[event.detail.value];
    this.setData({ status: option.value, statusLabel: option.label }, this.refresh);
  },

  changeOrderStatus(event) {
    const id = event.currentTarget.dataset.id;
    const nextStatus = this.data.nextStatuses[event.detail.value].value;
    updateStore((store) => {
      const order = store.orders.find((item) => item.id === id);
      if (!order) return;
      const oldStatus = order.status;
      if (oldStatus !== 'confirmed' && nextStatus === 'confirmed') {
        order.items.forEach((item) => {
          const product = store.products.find((productItem) => productItem.id === item.productId);
          if (product) {
            product.lockedStock = Math.max(0, product.lockedStock - item.quantity);
            product.stock = Math.max(0, product.stock - item.quantity);
          }
        });
      }
      if (nextStatus === 'cancelled') {
        order.items.forEach((item) => {
          const product = store.products.find((productItem) => productItem.id === item.productId);
          if (product) product.lockedStock = Math.max(0, product.lockedStock - item.quantity);
        });
      }
      order.status = nextStatus;
      if (nextStatus === 'completed') order.completedAt = nowText();
      store.operationLogs.unshift({
        id: nextId('op'),
        operatorId: '',
        operatorName: '后台',
        type: 'order_status',
        target: order.orderNo,
        summary: `订单状态改为${statusMap[nextStatus]}`,
        createdAt: nowText()
      });
    });
    this.refresh();
  }
});
