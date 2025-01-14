# 轻量级浏览器

一个基于Electron开发的轻量级浏览器应用，提供简洁的界面和实用的浏览功能。

## 功能特点

- 📑 多标签页浏览
- 🔍 内置搜索功能
- 🎯 简洁现代的用户界面
- 🚀 快速响应的浏览体验
- 💻 跨平台支持（Windows）
- 🌐 支持常用浏览器功能（前进、后退、刷新等）

## 技术栈

- Electron v28.0.0
- Node.js
- HTML/CSS/JavaScript

## 安装说明

### 开发环境配置

1. 克隆项目到本地：
```bash
git clone [项目地址]
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm start
```

### 构建应用

构建Windows安装包：
```bash
npm run build
```

## 使用方法

1. 启动应用后，可以通过界面顶部的标签栏管理多个标签页
2. 使用地址栏输入URL或搜索关键词
3. 支持常用的浏览器快捷键和操作

## 项目结构

```
├── main.js          # 主进程文件
├── preload.js       # 预加载脚本
├── index.html       # 主页面
├── tabs.html        # 标签页管理界面
├── convert-icon.js  # 图标转换工具
└── package.json     # 项目配置文件
```

## 许可证

ISC License

## 作者

[刘柱] 
