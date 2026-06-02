const { getStore, updateStore, nowText, nextId } = require('../../../utils/store');
const { getCurrentUser } = require('../../../utils/auth');

const settlementOptions = [
  { label: '全部订单', value: 'all' },
  { label: '待结算订单', value: 'pending' },
  { label: '已结算订单', value: 'settled' }
];

const sortOptions = [
  { label: '按时间排序', value: 'date' },
  { label: '按客户排序', value: 'customer' }
];

function formatDate(date) {
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function escapeHtml(value) {
  return `${value || ''}`
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function csvCell(value) {
  return `"${`${value || ''}`.replace(/"/g, '""')}"`;
}

function digitsToUppercase(n) {
  const fraction = ['角', '分'];
  const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const unit = [
    ['元', '万', '亿'],
    ['', '拾', '佰', '仟']
  ];

  let num = Math.abs(Number(n) || 0);
  let result = '';

  fraction.forEach((item, index) => {
    result += (digit[Math.floor(num * 10 * Math.pow(10, index)) % 10] + item).replace(/零./, '');
  });
  result = result || '整';
  num = Math.floor(num);

  for (let i = 0; i < unit[0].length && num > 0; i += 1) {
    let section = '';
    for (let j = 0; j < unit[1].length && num > 0; j += 1) {
      section = digit[num % 10] + unit[1][j] + section;
      num = Math.floor(num / 10);
    }
    result = section.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + result;
  }

  return result
    .replace(/(零.)*零元/, '元')
    .replace(/(零.)+/g, '零')
    .replace(/^整$/, '零元整')
    .replace(/零角零分$/, '整')
    .replace(/零分$/, '')
    .replace(/零角/, '零');
}

function parseOrderDate(order) {
  return (order.createdAt || '').slice(0, 10);
}

Page({
  data: {
    customerOptions: [{ label: '全部客户', value: 'all' }],
    customerIndex: 0,
    settlementOptions,
    settlementIndex: 0,
    sortOptions,
    sortIndex: 0,
    startDate: '',
    endDate: '',
    orderKeyword: '',
    previewOrders: [],
    selectedOrderIds: [],
    summary: {
      orderCount: 0,
      customerCount: 0,
      itemCount: 0,
      amount: '0.00'
    },
    hasPendingInFiltered: false
  },

  onLoad() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    this.setData({
      startDate: formatDate(monthStart),
      endDate: formatDate(now)
    });
  },

  onShow() {
    this.buildCustomerOptions();
    this.refresh();
  },

  buildCustomerOptions() {
    const store = getStore();
    const customers = store.users
      .filter((item) => item.role === 'customer')
      .map((item) => ({
        label: item.company || item.nickName,
        value: item.id
      }));
    this.setData({
      customerOptions: [{ label: '全部客户', value: 'all' }].concat(customers)
    });
  },

  onCustomerChange(event) {
    this.setData({ customerIndex: Number(event.detail.value) }, this.refresh);
  },

  onStartDateChange(event) {
    this.setData({ startDate: event.detail.value }, this.refresh);
  },

  onEndDateChange(event) {
    this.setData({ endDate: event.detail.value }, this.refresh);
  },

  onSettlementChange(event) {
    this.setData({ settlementIndex: Number(event.detail.value) }, this.refresh);
  },

  onSortChange(event) {
    this.setData({ sortIndex: Number(event.detail.value) }, this.refresh);
  },

  onOrderKeyword(event) {
    this.setData({ orderKeyword: event.detail.value }, this.refresh);
  },

  getFilteredOrders() {
    const store = getStore();
    const customerValue = this.data.customerOptions[this.data.customerIndex].value;
    const settlementValue = this.data.settlementOptions[this.data.settlementIndex].value;
    const sortValue = this.data.sortOptions[this.data.sortIndex].value;
    const startDate = this.data.startDate;
    const endDate = this.data.endDate;
    const orderKeyword = this.data.orderKeyword.trim().toLowerCase();

    const orders = store.orders.filter((order) => {
      const orderDate = parseOrderDate(order);
      const customerMatched = customerValue === 'all' || order.userId === customerValue;
      const settlementMatched = settlementValue === 'all' || (order.settlementStatus || 'pending') === settlementValue;
      const dateMatched = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);
      const orderMatched = !orderKeyword || order.orderNo.toLowerCase().includes(orderKeyword);
      return customerMatched && settlementMatched && dateMatched && orderMatched;
    }).map((order) => ({
      ...order,
      settlementStatus: order.settlementStatus || 'pending',
      settlementText: (order.settlementStatus || 'pending') === 'settled' ? '已结算' : '待结算',
      settlementTitle: (order.settlementStatus || 'pending') === 'settled' ? '已结算订单' : '待结算订单',
      createdDate: parseOrderDate(order),
      goodsText: order.items.map((item) => `${item.productName} × ${item.quantity}${item.unit || ''}`).join('；'),
      addressText: `${order.addressSnapshot.contactName} ${order.addressSnapshot.phone} ${order.addressSnapshot.region} ${order.addressSnapshot.detail}`,
      totalQty: order.items.reduce((sum, item) => sum + item.quantity, 0)
    }));

    orders.sort((a, b) => {
      if (sortValue === 'customer') {
        if (a.customerName === b.customerName) return b.createdAt.localeCompare(a.createdAt);
        return a.customerName.localeCompare(b.customerName, 'zh-CN');
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

    return orders;
  },

  refresh() {
    const baseOrders = this.getFilteredOrders();
    const selectedSet = new Set(this.data.selectedOrderIds);
    const validSelectedOrderIds = baseOrders
      .filter((item) => selectedSet.has(item.id))
      .map((item) => item.id);
    const validSelectedSet = new Set(validSelectedOrderIds);
    const previewOrders = baseOrders.map((item) => ({
      ...item,
      selected: validSelectedSet.has(item.id)
    }));
    const customerSet = new Set(previewOrders.map((item) => item.userId));
    const itemCount = previewOrders.reduce((sum, order) => sum + order.totalQty, 0);
    const amount = previewOrders.reduce((sum, order) => sum + order.amount, 0);
    const selectedOrders = previewOrders.filter((item) => item.selected);
    this.setData({
      previewOrders,
      selectedOrderIds: validSelectedOrderIds,
      summary: {
        orderCount: previewOrders.length,
        customerCount: customerSet.size,
        itemCount,
        amount: amount.toFixed(2),
        selectedOrderCount: selectedOrders.length,
        selectedAmount: selectedOrders.reduce((sum, order) => sum + order.amount, 0).toFixed(2)
      },
      hasPendingInFiltered: previewOrders.some((item) => item.settlementStatus === 'pending')
    });
  },

  toggleOrderSelection(event) {
    const id = event.currentTarget.dataset.id;
    const selectedSet = new Set(this.data.selectedOrderIds);
    if (selectedSet.has(id)) {
      selectedSet.delete(id);
    } else {
      selectedSet.add(id);
    }
    this.setData({ selectedOrderIds: Array.from(selectedSet) }, this.refresh);
  },

  selectAllOrders() {
    this.setData({
      selectedOrderIds: this.data.previewOrders.map((item) => item.id)
    }, this.refresh);
  },

  clearSelectedOrders() {
    this.setData({ selectedOrderIds: [] }, this.refresh);
  },

  markOneSettled(event) {
    const id = event.currentTarget.dataset.id;
    this.markSettled((order) => order.id === id, '已将当前订单标记为已结算');
  },

  markFilteredSettled() {
    const orderIds = new Set(this.data.previewOrders.filter((item) => item.settlementStatus === 'pending').map((item) => item.id));
    this.markSettled((order) => orderIds.has(order.id), '已将当前筛选结果中的待结算订单标记为已结算');
  },

  markSettled(predicate, toastTitle) {
    const currentUser = getCurrentUser();
    updateStore((store) => {
      store.orders.forEach((order) => {
        if (predicate(order) && (order.settlementStatus || 'pending') !== 'settled') {
          order.settlementStatus = 'settled';
          store.operationLogs.unshift({
            id: nextId('op'),
            operatorId: currentUser ? currentUser.id : '',
            operatorName: currentUser ? currentUser.nickName : '后台',
            type: 'settlement_status',
            target: order.orderNo,
            summary: '订单标记为已结算',
            createdAt: nowText()
          });
        }
      });
    });
    wx.showToast({ title: toastTitle, icon: 'none' });
    this.refresh();
  },

  exportStatement() {
    const selectedSet = new Set(this.data.selectedOrderIds);
    const orders = this.data.previewOrders.filter((item) => selectedSet.has(item.id));
    if (!orders.length) {
      wx.showToast({ title: '请先选择订单', icon: 'none' });
      return;
    }
    this.exportOrders(orders);
  },

  exportOrders(orders) {
    const customerCount = new Set(orders.map((item) => item.userId)).size;
    const isAllCustomers = customerCount > 1;
    const sortLabel = this.data.sortOptions[this.data.sortIndex].label;
    const settlementTitle = orders.length === 1
      ? orders[0].settlementTitle
      : this.data.settlementOptions[this.data.settlementIndex].value === 'all'
        ? '全部订单'
        : this.data.settlementOptions[this.data.settlementIndex].label;

    const summary = {
      totalQty: orders.reduce((sum, order) => sum + order.totalQty, 0),
      totalAmount: orders.reduce((sum, order) => sum + order.amount, 0)
    };
    summary.totalAmountText = digitsToUppercase(summary.totalAmount);

    const header = isAllCustomers
      ? ['客户门店', '地址', '电话', '挂账日期', '订单编号', '商品名称', '商品单价', '商品数量', '商品金额', '备注说明']
      : ['挂账日期', '订单编号', '商品名称', '商品单价', '商品数量', '商品金额', '备注说明'];

    const rows = orders.map((order) => {
      const base = [
        order.createdDate.replace(/-/g, '/'),
        order.orderNo,
        order.items.map((item) => item.productName).join(' / '),
        order.items.map((item) => item.price.toFixed(2)).join(' / '),
        order.items.map((item) => `${item.quantity}${item.unit || ''}`).join(' / '),
        order.amount.toFixed(2),
        order.remark || ''
      ];
      if (isAllCustomers) {
        return [
          order.customerName,
          `${order.addressSnapshot.region} ${order.addressSnapshot.detail}`,
          order.customerPhone
        ].concat(base);
      }
      return base;
    });

    const totalRow = isAllCustomers
      ? ['', '', '', '', '', `合计总额：${summary.totalAmountText}`, '', `${summary.totalQty}`, summary.totalAmount.toFixed(2), '']
      : ['', '', `合计总额：${summary.totalAmountText}`, '', `${summary.totalQty}`, summary.totalAmount.toFixed(2), ''];

    const customerInfo = !isAllCustomers && orders[0]
      ? {
          name: orders[0].customerName,
          address: `${orders[0].addressSnapshot.region} ${orders[0].addressSnapshot.detail}`,
          phone: orders[0].customerPhone
        }
      : null;

    const title = '前呈似景配送中心';
    const printedAt = nowText();

    const csvLines = [
      [title, settlementTitle],
      [`打印日期：${printedAt}`],
      [`筛选范围：${this.data.startDate} 至 ${this.data.endDate}`],
      [`排序方式：${sortLabel}`],
      header
    ].concat(rows).concat([totalRow]);

    if (customerInfo) {
      csvLines.push([]);
      csvLines.push([`客户门店：${customerInfo.name}`]);
      csvLines.push([`地址：${customerInfo.address}`]);
      csvLines.push([`电话：${customerInfo.phone}`]);
    }

    const csvContent = '\uFEFF' + csvLines.map((line) => line.map(csvCell).join(',')).join('\r\n');
    const htmlRows = rows.map((line) => `<tr>${line.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
    const htmlTotal = `<tr class="total-row">${totalRow.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
    const htmlHeader = header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('');
    const customerBlock = customerInfo ? `
      <div class="customer-info">
        <div>客户门店：${escapeHtml(customerInfo.name)}</div>
        <div>地址：${escapeHtml(customerInfo.address)}</div>
        <div>电话：${escapeHtml(customerInfo.phone)}</div>
      </div>
    ` : '';

    const htmlContent = `
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: "Microsoft YaHei", sans-serif; padding: 28px 40px; color: #111; }
          .top { display: flex; justify-content: center; align-items: flex-end; gap: 18px; margin-bottom: 18px; }
          .title { font-size: 34px; font-weight: 700; }
          .sub-title { font-size: 20px; }
          .meta-wrap { display: flex; justify-content: space-between; margin-bottom: 24px; }
          .meta-left { font-size: 16px; line-height: 1.9; }
          .meta-right { font-size: 16px; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 10px 8px; font-size: 15px; text-align: center; }
          .total-row td { font-weight: 700; }
          .bottom { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; }
          .signature { font-size: 16px; }
          .customer-info { text-align: left; line-height: 1.9; font-size: 16px; min-width: 320px; }
          .note { margin-top: 70px; text-align: center; color: #444; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="top">
          <div class="title">${escapeHtml(title)}</div>
          <div class="sub-title">${escapeHtml(settlementTitle)}</div>
        </div>
        <div class="meta-wrap">
          <div class="meta-left">${escapeHtml(settlementTitle)}</div>
          <div class="meta-right">打印日期：${escapeHtml(printedAt)}</div>
        </div>
        <table>
          <thead><tr>${htmlHeader}</tr></thead>
          <tbody>${htmlRows}${htmlTotal}</tbody>
        </table>
        <div class="bottom">
          <div class="signature">经确认无误后，签字盖章。</div>
          ${customerBlock}
        </div>
        <div class="note">本账单由微信自动化发单工具批量发送，如有问题请联系群内客服。</div>
      </body>
      </html>
    `.trim();

    const fs = wx.getFileSystemManager();
    const userPath = wx.env.USER_DATA_PATH;
    const stamp = Date.now();
    const csvPath = `${userPath}/reconcile_${stamp}.csv`;
    const xlsPath = `${userPath}/reconcile_${stamp}.xls`;

    fs.writeFile({
      filePath: csvPath,
      data: csvContent,
      encoding: 'utf8',
      success: () => {
        fs.writeFile({
          filePath: xlsPath,
          data: htmlContent,
          encoding: 'utf8',
          success: () => {
            wx.openDocument({
              filePath: xlsPath,
              showMenu: true,
              fileType: 'xls',
              fail: () => {
                wx.showModal({
                  title: '导出完成',
                  content: '已生成 Excel 兼容文件和 CSV 文件，可继续按正式模板细化。',
                  showCancel: false
                });
              }
            });
          },
          fail: () => {
            wx.showModal({
              title: '导出完成',
              content: '已生成 CSV 文件；当前环境写入 Excel 兼容文件失败，后续可继续接正式模板。',
              showCancel: false
            });
          }
        });
      },
      fail: () => {
        wx.showToast({ title: '导出失败', icon: 'none' });
      }
    });
  }
});
