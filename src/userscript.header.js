// ==UserScript==
// @name 网页抖音体验增强
// @namespace Violentmonkey Scripts
// @match https://www.douyin.com/?*
// @match *://*.douyin.com/*
// @match *://*.iesdouyin.com/*
// @exclude *://lf-zt.douyin.com*
// @grant none
// @version 6.0
// @changelog 新增数据缓存目录，支持保存设置和历史统计。每日统计按会话独立写入并自动汇总，适用于多个窗口或设备同时使用。新增同步冲突提示，移除关键词和统计的导入导出入口。
// @description 自动跳过直播、内容屏蔽（关键字/作者声明/平台提示，可自动不感兴趣）、跳过广告、最高分辨率、直播净化、分辨率筛选、AI智能筛选（支持智谱/Ollama）、极速模式、每日统计及本地目录同步
// @author Frequenk
// @license GPL-3.0 License
// @run-at document-start
// @downloadURL https://update.greasyfork.org/scripts/539942/%E7%BD%91%E9%A1%B5%E6%8A%96%E9%9F%B3%E4%BD%93%E9%AA%8C%E5%A2%9E%E5%BC%BA.user.js
// @updateURL https://update.greasyfork.org/scripts/539942/%E7%BD%91%E9%A1%B5%E6%8A%96%E9%9F%B3%E4%BD%93%E9%AA%8C%E5%A2%9E%E5%BC%BA.meta.js
// ==/UserScript==
