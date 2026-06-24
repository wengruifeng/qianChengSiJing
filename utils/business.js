function getAvailableStock(product) {
  if (!product) return 0;
  return Math.max(0, (product.stock || 0) - (product.lockedStock || 0));
}

function deprecatedLocalBusiness() {
  throw new Error('本地 business 业务写入已废弃，请改用 cloud-first 服务层');
}

module.exports = {
  addToCart: deprecatedLocalBusiness,
  createAudit: deprecatedLocalBusiness,
  findProduct: deprecatedLocalBusiness,
  getAvailableStock,
  getCartItems: deprecatedLocalBusiness,
  updateCartQuantity: deprecatedLocalBusiness,
  visibleProducts: deprecatedLocalBusiness,
  writeOperation: deprecatedLocalBusiness
};
