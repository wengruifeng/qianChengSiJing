const { getAvailableStock } = require('./business');

function enrichProduct(item) {
  const availableStock = getAvailableStock(item);
  return {
    ...item,
    availableStock,
    isSoldOut: availableStock <= 0,
    isLowStock: availableStock > 0 && availableStock <= (item.warningStock || 0)
  };
}

function selectProducts(products, preferredIds, predicate) {
  const byId = Object.fromEntries(products.map((item) => [item.id, item]));
  const selected = [];
  (preferredIds || []).forEach((id) => {
    if (byId[id]) selected.push(byId[id]);
  });
  if (selected.length >= 4) return selected.slice(0, 4);
  products.forEach((item) => {
    if (selected.find((current) => current.id === item.id)) return;
    if (!predicate(item)) return;
    selected.push(item);
  });
  if (selected.length >= 4) return selected.slice(0, 4);
  products.forEach((item) => {
    if (selected.find((current) => current.id === item.id)) return;
    selected.push(item);
  });
  return selected.slice(0, 4);
}

module.exports = {
  enrichProduct,
  selectProducts
};
