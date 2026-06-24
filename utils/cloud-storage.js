const { canUseCloud } = require('./cloud');

const SCOPE_PATHS = {
  logo: 'branding/logo',
  hero: 'home/hero',
  topic: 'home/topic',
  productMain: 'products/main',
  productDetail: 'products/detail'
};

function extFromPath(filePath = '') {
  const match = String(filePath).match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : '.jpg';
}

function buildCloudPath(scope, localPath, entityId = '') {
  const folder = SCOPE_PATHS[scope] || 'temp';
  const ext = extFromPath(localPath);
  const safeId = entityId || 'draft';
  return `${folder}/${safeId}-${Date.now()}${ext}`;
}

function ensureCloudReady() {
  if (!canUseCloud() || !wx.cloud || !wx.cloud.uploadFile) {
    throw new Error('当前环境未启用云存储');
  }
}

function chooseImages(count = 1) {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = (res.tempFiles || []).map((item) => item.tempFilePath).filter(Boolean);
        resolve(files);
      },
      fail: reject
    });
  });
}

function uploadSingle(scope, localPath, entityId = '') {
  ensureCloudReady();
  const cloudPath = buildCloudPath(scope, localPath, entityId);
  return wx.cloud.uploadFile({
    cloudPath,
    filePath: localPath
  }).then((res) => ({
    fileID: res.fileID,
    cloudPath,
    localPath
  }));
}

async function chooseAndUploadSingle(scope, entityId = '') {
  const files = await chooseImages(1);
  if (!files.length) {
    throw new Error('未选择图片');
  }
  return uploadSingle(scope, files[0], entityId);
}

async function chooseAndUploadMultiple(scope, entityId = '', count = 9) {
  const files = await chooseImages(count);
  if (!files.length) {
    throw new Error('未选择图片');
  }
  const results = [];
  for (const file of files) {
    const uploaded = await uploadSingle(scope, file, entityId);
    results.push(uploaded);
  }
  return results;
}

module.exports = {
  chooseAndUploadMultiple,
  chooseAndUploadSingle
};
