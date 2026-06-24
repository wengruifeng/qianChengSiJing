const { cloudFirst } = require('./cloud');
const { getStore } = require('./store');
const { enrichProduct } = require('./content');

function fetchCategories() {
  return cloudFirst('listCategories', {}, () => {
    return getStore().categories
      .filter((item) => item.status === 'enabled')
      .sort((a, b) => a.sort - b.sort);
  });
}

function fetchVisibleProducts() {
  return cloudFirst('listProducts', {}, () => {
    return getStore().products
      .filter((item) => item.saleStatus === 'on' && item.deleteStatus !== 'deleted')
      .sort((a, b) => a.sort - b.sort);
  }).then((products) => products.map(enrichProduct));
}

function fetchAdminProducts() {
  return cloudFirst('listAdminProducts', {}, () => {
    return getStore().products
      .filter((item) => item.deleteStatus !== 'deleted')
      .sort((a, b) => a.sort - b.sort);
  }).then((products) => products.map(enrichProduct));
}

function fetchProductById(id) {
  return cloudFirst('getProduct', { id }, () => {
    return getStore().products.find((item) => item.id === id) || null;
  }).then((product) => product ? enrichProduct(product) : null);
}

function fetchHomeContent() {
  return cloudFirst('getHomeContent', {}, () => {
    return getStore().homeContent || {};
  });
}

module.exports = {
  fetchAdminProducts,
  fetchCategories,
  fetchHomeContent,
  fetchProductById,
  fetchVisibleProducts
};
