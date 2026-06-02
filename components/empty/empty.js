Component({
  properties: {
    title: String,
    desc: String
  },
  observers: {
    title(value) {
      this.setData({ displayTitle: value || '暂无数据' });
    }
  },
  data: {
    displayTitle: '暂无数据'
  }
});
