const { getStore } = require('../../../utils/store');
const { createAudit } = require('../../../utils/business');

const emptyForm = {
  name: '',
  barcode: '',
  code: '',
  simple: '',
  categoryId: 'cat_1',
  mainImage: '',
  detailImages: [],
  spec: '',
  unit: '件',
  price: '',
  stock: '',
  lockedStock: 0,
  warningStock: 0,
  tags: [],
  sort: 99,
  saleStatus: 'on',
  deleteStatus: 'normal',
  description: ''
};

Page({
  data: {
    id: '',
    before: null,
    form: emptyForm,
    tagText: ''
  },

  onLoad(options) {
    const id = options.id || '';
    const before = id ? getStore().products.find((item) => item.id === id) : null;
    const form = before ? { ...before } : { ...emptyForm };
    this.setData({ id, before, form, tagText: (form.tags || []).join(',') });
  },

  onInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value });
  },

  onTags(event) {
    const tagText = event.detail.value;
    this.setData({ tagText, 'form.tags': tagText.split(',').map((item) => item.trim()).filter(Boolean) });
  },

  onSale(event) {
    this.setData({ 'form.saleStatus': event.detail.value ? 'on' : 'off' });
  },

  submit() {
    const form = {
      ...this.data.form,
      price: Number(this.data.form.price),
      stock: Number(this.data.form.stock),
      warningStock: Number(this.data.form.warningStock || 0)
    };
    if (!form.name || !form.price || form.stock < 0) {
      wx.showToast({ title: '请填写名称、价格、库存', icon: 'none' });
      return;
    }
    createAudit(this.data.id ? 'product_update' : 'product_create', 'products', this.data.id, this.data.before, form, `${this.data.id ? '修改' : '新增'}商品：${form.name}`);
    wx.showToast({ title: '已提交审核' });
    setTimeout(() => wx.navigateBack(), 500);
  }
});
