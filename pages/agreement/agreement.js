Page({
  openUserAgreement() {
    wx.navigateTo({
      url: '/pages/agreement-detail/agreement-detail?type=user'
    });
  },

  openPrivacyAgreement() {
    wx.navigateTo({
      url: '/pages/agreement-detail/agreement-detail?type=privacy'
    });
  }
});
