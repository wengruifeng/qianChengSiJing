function uniqueList(list) {
  const seen = new Set();
  return (list || []).filter((item) => {
    if (!item || seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function getAvailableStock(product) {
  if (!product) return 0;
  return Math.max(0, (product.stock || 0) - (product.lockedStock || 0));
}

function normalizeProductImages(item) {
  const detailImages = uniqueList([
    ...((Array.isArray(item.detailImages) ? item.detailImages : [])),
    ...((Array.isArray(item.detailImageFileIds) ? item.detailImageFileIds : []))
  ]);

  const mainImage = item.mainImage || item.mainImageFileId || detailImages[0] || '';

  return {
    mainImage,
    detailImages,
    imageList: uniqueList([mainImage, ...detailImages])
  };
}

function enrichProduct(item) {
  const availableStock = getAvailableStock(item);
  const normalizedImages = normalizeProductImages(item);
  return {
    ...item,
    ...normalizedImages,
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
  normalizeProductImages,
  selectProducts
};
