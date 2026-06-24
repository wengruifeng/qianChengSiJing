const { canUseCloud } = require('../../../utils/cloud');
const { getCurrentUser, isSuperAdmin } = require('../../../utils/auth');
const { createAudit } = require('../../../utils/audit-service');
const { fetchHomeContent } = require('../../../utils/catalog-service');
const { chooseAndUploadSingle } = require('../../../utils/cloud-storage');
const { runtime } = require('../../../utils/config');

Page({
  data: {
    isSuperAdmin: false,
    form: {},
    beforeData: null,
    uploadingKey: '',
    submitting: false,
    initialized: false,
    dirty: false,
    seeding: false,
    resetting: false,
    showDevTools: !runtime.reviewMode
  },

  allowLeaveOnce: false,

  onLoad() {
    this.loadSettings();
  },

  onShow() {
    const user = getCurrentUser();
    this.setData({
      isSuperAdmin: isSuperAdmin(user),
      showDevTools: !runtime.reviewMode
    });
  },

  loadSettings() {
    fetchHomeContent().then((homeContent) => {
      const form = {
        storeName: homeContent.storeName || '前呈似景智链',
        businessStatus: homeContent.businessStatus || '营业中',
        industryScope: homeContent.industryScope || '食品饮料',
        operationMode: homeContent.operationMode || '批发',
        bannerTitle: homeContent.bannerTitle || '专注火锅串串食材',
        notice: homeContent.notice || '',
        servicePhone: homeContent.servicePhone || '13243592231',
        logoImage: homeContent.logoImage || homeContent.logoImageFileId || '',
        logoImageFileId: homeContent.logoImageFileId || homeContent.logoImage || '',
        heroImage: homeContent.heroImage || homeContent.heroImageFileId || '',
        heroImageFileId: homeContent.heroImageFileId || homeContent.heroImage || '',
        topicImage: homeContent.topicImage || homeContent.topicImageFileId || '',
        topicImageFileId: homeContent.topicImageFileId || homeContent.topicImage || ''
      };
      this.setData({
        form,
        beforeData: homeContent || null,
        initialized: true,
        dirty: false
      });
    }).catch(() => {
      this.setData({
        form: {},
        beforeData: null,
        initialized: true,
        dirty: false
      });
      wx.showToast({ title: '店铺设置加载失败', icon: 'none' });
    });
  },

  onInput(event) {
    this.setData({
      [`form.${event.currentTarget.dataset.key}`]: event.detail.value,
      dirty: true
    });
  },

  async uploadImage(event) {
    const key = event.currentTarget.dataset.key;
    const scope = event.currentTarget.dataset.scope;
    const fieldMap = {
      logo: ['logoImage', 'logoImageFileId'],
      hero: ['heroImage', 'heroImageFileId'],
      topic: ['topicImage', 'topicImageFileId']
    };
    const [imageKey, fileIdKey] = fieldMap[key] || [];
    if (!imageKey || !fileIdKey) return;

    this.setData({ uploadingKey: key });
    try {
      const uploaded = await chooseAndUploadSingle(scope, key);
      this.setData({
        [`form.${imageKey}`]: uploaded.fileID,
        [`form.${fileIdKey}`]: uploaded.fileID,
        dirty: true
      });
      wx.showToast({ title: '上传成功', icon: 'success' });
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '上传失败',
        icon: 'none'
      });
    } finally {
      this.setData({ uploadingKey: '' });
    }
  },

  submitSettings() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    createAudit({
      type: 'home_content_update',
      targetCollection: 'home_contents',
      targetId: 'home_content',
      beforeData: this.data.beforeData,
      afterData: this.data.form,
      summary: '修改店铺设置'
    }).then(() => {
      this.setData({ dirty: false });
      wx.showToast({ title: '已提交审核' });
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '提交审核失败',
        icon: 'none'
      });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  },

  onBackPress() {
    if (!this.data.dirty || this.allowLeaveOnce) {
      return false;
    }
    wx.showModal({
      title: '放弃修改？',
      content: '当前店铺设置还有未提交的修改，离开后这些内容不会保留。',
      success: (res) => {
        if (!res.confirm) return;
        this.allowLeaveOnce = true;
        wx.navigateBack({
          fail: () => {
            wx.switchTab({
              url: '/pages/me/me'
            });
          }
        });
      }
    });
    return true;
  },

  runSeedDemo() {
    if (!this.data.isSuperAdmin) {
      wx.showToast({ title: '仅超级管理员可初始化', icon: 'none' });
      return;
    }
    if (!canUseCloud()) {
      wx.showToast({ title: '当前云环境不可用', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '初始化演示数据',
      content: '将创建缺失集合，并向空集合写入演示数据。默认不带图片路径，已存在数据的集合会自动跳过，是否继续？',
      success: (modalRes) => {
        if (!modalRes.confirm) return;
        this.executeSeedDemo();
      }
    });
  },

  executeSeedDemo() {
    this.setData({ seeding: true });
    wx.cloud.callFunction({
      name: 'bootstrap',
      data: {
        seedDemo: true
      }
    }).then((res) => {
      const result = res.result || {};
      const collections = Array.isArray(result.collections) ? result.collections : [];
      const seed = Array.isArray(result.seed) ? result.seed : [];
      const createdCollections = collections.filter((item) => item.created).length;
      const insertedRows = seed.reduce((sum, item) => sum + Number(item.inserted || 0), 0);
      const skippedCollections = seed.filter((item) => item.skipped).length;

      wx.showModal({
        title: '初始化完成',
        content: [
          `新建集合：${createdCollections} 个`,
          `写入演示数据：${insertedRows} 条`,
          `跳过非空集合：${skippedCollections} 个`,
          '本次默认未写入项目本地图片路径'
        ].join('\n'),
        showCancel: false
      });
    }).catch((error) => {
      wx.showModal({
        title: '初始化失败',
        content: error && error.message ? error.message : 'bootstrap 调用失败，请确认云函数已上传部署。',
        showCancel: false
      });
    }).finally(() => {
      this.setData({ seeding: false });
    });
  },

  runResetDemo() {
    if (!this.data.isSuperAdmin) {
      wx.showToast({ title: '仅超级管理员可重置', icon: 'none' });
      return;
    }
    if (!canUseCloud()) {
      wx.showToast({ title: '当前云环境不可用', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '清理演示图片路径',
      content: '将把数据库里演示数据使用的项目本地图片路径清空，不会删除订单、客户等业务数据。是否继续？',
      success: (modalRes) => {
        if (!modalRes.confirm) return;
        this.executeResetDemo();
      }
    });
  },

  executeResetDemo() {
    this.setData({ resetting: true });
    wx.cloud.callFunction({
      name: 'bootstrap',
      data: {
        sanitizeBundledImages: true
      }
    }).then((res) => {
      const result = res.result || {};
      const sanitized = Array.isArray(result.sanitized) ? result.sanitized : [];
      const updatedRows = sanitized.reduce((sum, item) => sum + Number(item.updated || 0), 0);

      wx.showModal({
        title: '清理完成',
        content: [
          `清理图片字段：${updatedRows} 条`,
          'products / home_contents / order_items 中的本地图片路径已被置空'
        ].join('\n'),
        showCancel: false
      });
    }).catch((error) => {
      wx.showModal({
        title: '重置失败',
        content: error && error.message ? error.message : 'bootstrap 调用失败，请确认云函数已上传部署。',
        showCancel: false
      });
    }).finally(() => {
      this.setData({ resetting: false });
    });
  }
});

