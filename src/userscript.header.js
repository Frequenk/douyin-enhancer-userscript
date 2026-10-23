// ==UserScript==
// @name 网页抖音体验增强
// @namespace Violentmonkey Scripts
// @match https://www.douyin.com/?*
// @match *://*.douyin.com/*
// @match *://*.iesdouyin.com/*
// @exclude *://lf-zt.douyin.com*
// @grant none
// @version 5.2
// @changelog 修复新版直播播放器最高清切换，确认画质生效后关闭自动切换；新增直播净化，可记忆弹幕开关、送礼信息、福袋及屏蔽礼物特效的进入默认值，初始化静默应用，不影响后续手动操作；
// @description 自动跳过直播、智能屏蔽关键字（自动不感兴趣）、跳过广告、最高分辨率、直播净化、分辨率筛选、AI智能筛选（支持智谱/Ollama）、极速模式、数据统计面板（数量/时长/热力图）
// @author Frequenk
// @license GPL-3.0 License
// @run-at document-start
// @downloadURL https://update.greasyfork.org/scripts/539942/%E7%BD%91%E9%A1%B5%E6%8A%96%E9%9F%B3%E4%BD%93%E9%AA%8C%E5%A2%9E%E5%BC%BA.user.js
// @updateURL https://update.greasyfork.org/scripts/539942/%E7%BD%91%E9%A1%B5%E6%8A%96%E9%9F%B3%E4%BD%93%E9%AA%8C%E5%A2%9E%E5%BC%BA.meta.js
// ==/UserScript==
