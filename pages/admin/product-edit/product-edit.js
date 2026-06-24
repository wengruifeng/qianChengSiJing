const { createAudit } = require('../../../utils/audit-service');
const { fetchProductById } = require('../../../utils/catalog-service');
const { fetchAdminCategories } = require('../../../utils/category-service');
const { chooseAndUploadMultiple, chooseAndUploadSingle } = require('../../../utils/cloud-storage');
const { getCurrentUser, isAdmin, refreshCurrentUser } = require('../../../utils/auth');

const LAST_CATEGORY_KEY = 'qcsj_last_product_category_id';

const emptyForm = {
  name: '',
  barcode: '',
  code: '',
  simple: '',
  categoryId: '',
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
    tagText: '',
    uploadingMain: false,
    uploadingDetail: false,
    submitting: false,
    categories: [],
    filteredCategories: [],
    categoryName: '',
    categoryKeyword: '',
    showCategoryPicker: false
  },

  onLoad(options) {
    const id = options.id || '';
    this.setData({ id });
    refreshCurrentUser().then((user) => {
      if (!isAdmin(user)) {
        wx.showToast({ title: '后台权限已失效', icon: 'none' });
        wx.navigateBack();
        return;
      }
      this.loadCategories();
      if (!id) {
        const lastCategoryId = wx.getStorageSync(LAST_CATEGORY_KEY) || emptyForm.categoryId;
        this.setData({ id, before: null, form: { ...emptyForm, categoryId: lastCategoryId }, tagText: '' }, this.syncCategoryName);
        return;
      }
      fetchProductById(id).then((before) => {
        const form = before ? { ...before } : { ...emptyForm };
        this.setData({ id, before, form, tagText: (form.tags || []).join(',') }, this.syncCategoryName);
      }).catch(() => {
        this.setData({ id, before: null, form: { ...emptyForm }, tagText: '' });
        wx.showToast({ title: '商品数据加载失败', icon: 'none' });
      });
    }).catch(() => {
      wx.showToast({ title: '权限校验失败', icon: 'none' });
      wx.navigateBack();
    });
  },

  onInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value });
  },

  loadCategories() {
    fetchAdminCategories().then((categories) => {
      const nextCategoryId = this.data.form.categoryId || wx.getStorageSync(LAST_CATEGORY_KEY) || (categories[0] && categories[0].id) || '';
      this.setData({
        categories,
        filteredCategories: categories,
        'form.categoryId': nextCategoryId
      }, this.syncCategoryName);
    }).catch(() => {
      this.setData({ categories: [], filteredCategories: [] });
    });
  },

  syncCategoryName() {
    const category = this.data.categories.find((item) => item.id === this.data.form.categoryId);
    this.setData({ categoryName: category ? category.name : '' });
  },

  openCategoryPicker() {
    this.setData({
      showCategoryPicker: true,
      categoryKeyword: '',
      filteredCategories: this.data.categories
    });
  },

  closeCategoryPicker() {
    this.setData({ showCategoryPicker: false });
  },

  noop() {},

  onCategoryKeyword(event) {
    const keyword = event.detail.value.trim().toLowerCase();
    this.setData({
      categoryKeyword: event.detail.value,
      filteredCategories: this.data.categories.filter((item) => `${item.name || ''}`.toLowerCase().includes(keyword))
    });
  },

  chooseCategory(event) {
    const id = event.currentTarget.dataset.id;
    const category = this.data.categories.find((item) => item.id === id);
    if (!category) return;
    wx.setStorageSync(LAST_CATEGORY_KEY, id);
    this.setData({
      'form.categoryId': id,
      categoryName: category.name,
      showCategoryPicker: false
    });
  },

  onTags(event) {
    const tagText = event.detail.value;
    this.setData({ tagText, 'form.tags': tagText.split(',').map((item) => item.trim()).filter(Boolean) });
  },

  onSale(event) {
    this.setData({ 'form.saleStatus': event.detail.value ? 'on' : 'off' });
  },

  async uploadMainImage() {
    this.setData({ uploadingMain: true });
    try {
      const uploaded = await chooseAndUploadSingle('productMain', this.data.id || 'draft');
      this.setData({
        'form.mainImage': uploaded.fileID,
        'form.mainImageFileId': uploaded.fileID
      });
      wx.showToast({ title: '主图上传成功', icon: 'success' });
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '主图上传失败',
        icon: 'none'
      });
    } finally {
      this.setData({ uploadingMain: false });
    }
  },

  async uploadDetailImages() {
    this.setData({ uploadingDetail: true });
    try {
      const uploadedList = await chooseAndUploadMultiple('productDetail', this.data.id || 'draft', 9);
      const detailImages = (this.data.form.detailImages || []).concat(uploadedList.map((item) => item.fileID));
      this.setData({
        'form.detailImages': detailImages,
        'form.detailImageFileIds': detailImages
      });
      wx.showToast({ title: '详情图上传成功', icon: 'success' });
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '详情图上传失败',
        icon: 'none'
      });
    } finally {
      this.setData({ uploadingDetail: false });
    }
  },

  removeDetailImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const nextImages = (this.data.form.detailImages || []).filter((_, currentIndex) => currentIndex !== index);
    this.setData({
      'form.detailImages': nextImages,
      'form.detailImageFileIds': nextImages
    });
  },

  submit() {
    if (this.data.submitting) return;
    if (!isAdmin(getCurrentUser())) {
      wx.showToast({ title: '无后台权限', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '提交中', mask: true });
    if (this.data.uploadingMain || this.data.uploadingDetail) {
      wx.hideLoading();
      wx.showToast({ title: '请等待图片上传完成', icon: 'none' });
      return;
    }
    const form = {
      ...this.data.form,
      price: Number(this.data.form.price),
      stock: Number(this.data.form.stock),
      warningStock: Number(this.data.form.warningStock || 0)
    };
    if (!form.name || !form.categoryId || !form.price || form.stock < 0) {
      wx.hideLoading();
      wx.showToast({ title: '请填写名称、分类、价格、库存', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    createAudit({
      type: this.data.id ? 'product_update' : 'product_create',
      targetCollection: 'products',
      targetId: this.data.id,
      beforeData: this.data.before,
      afterData: form,
      summary: `${this.data.id ? '修改' : '新增'}商品：${form.name}`
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '已提交审核' });
      setTimeout(() => wx.navigateBack(), 500);
    }).catch((error) => {
      wx.hideLoading();
      wx.showToast({
        title: error && error.message ? error.message : '提交审核失败',
        icon: 'none'
      });
    }).finally(() => {
      wx.hideLoading();
      this.setData({ submitting: false });
    });
  }
});
