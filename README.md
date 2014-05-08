peento
======

基于 [Express](https://npmjs.org/package/express) 框架和
[TinyLiquid](https://npmjs.org/package/tinyliquid) 模板引擎
的应用框架，通过 **peento** 框架可以更方便地编写组件化的Web应用程序。



使用方法
========

```JavaScript
var peento = require('peento');

// 创建应用
var app = peento();

// 载入配置
app.config(require('./config'));

// 载入插件
app.use('xxxx');

// 监听端口
app.listen(80);
```

**详细使用说明请阅读 [Wiki](https://github.com/peento/peento/wiki)**


应用实例
========

+ **[peento-blog](https://github.com/peento/peento-blog) 一个灵活的博客系统**



授权协议
========

**The MIT License**
