# 开发思路

[小程序wxml语法参考](https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/)

## 功能定义

用于解析微信小程序生态内特殊的 wxml 语法，为后续扩展和优化做准备

### API 设计

暴露一个 parser 函数，接收字符串和配置，返回 WxNode，见 TS 代码

```ts
function parser(wxml: string, option: parserOption): WxNode[];
```

配置项 option 可以随时扩展，先聚焦在返回的 AST 结构体，参考 vue-html-parser、html2parser 和@wxmini/wxml-parser 的定义

```ts
interface WxmlNode {
  type: 'element' | 'text' | 'comment';
  tagName?: string;
  isSelfClosing?: boolean; // 是否自闭合标签
  attributes?: { [x: string]: string | boolean };
  childNodes?: WxmlNode[];
  textContent?: string;
}

```

### parser主要逻辑梳理

#### pipeline-标记化（Tokenize）

将代码标记化，用到各种正则来识别，现有的html解析已经有很成熟的正则，我们应该站在巨人的肩膀上😁

和babel解析js相比，类xml这种语法的特点是标签化，因此标记化之后，如何处理标签闭合，如何判断标签是否闭合、标签之间的父子关系？这些需要特别关注

1. 利用「栈」先进先出的原理，每次识别到Node的「开启标签」都入栈一个Node，匹配到Node的「闭合标签」，说明此标签/组件闭合了，可以出栈
2. 判断是否自闭合标签，是否非法闭合（类似html-lint里的功能）

#### pipeline-节点处理

1. 文本和注释节点可以简单处理，放到textContent属性中就行
2. 标签节点需要处理节点的attr，是否自闭合标签等

#### combiner-组装器-生成WxmlNode树

在pipeline处理过程中，会不断给combiner推送节点（文本、注释、开标签、闭标签）标签处理的过程中。
组合器按顺序处理节点，由于节点是按顺序处理和推送的，因此当前开标签节点、文本/注释节点是上一个未闭合标签的子节点。
