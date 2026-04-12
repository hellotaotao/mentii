# Mentii Refinement To-Do

项目走通之后的完善清单。按类别组织，每条包含优先级、位置、估时，挑好了再实现。

优先级：🔴 真 bug / 体验硬伤　🟡 明显短板　🟢 nice-to-have

---

## 已完成（2026-04-12）

- ✅ **A6**：SlideList 已改为单一 "+ Add slide" + 下拉题型菜单
- ✅ **A7**：`/host` 已有落地页（HostDashboard）
- ✅ **A8**：主持人已支持「My rooms」列表（打开 / 删除）
- ✅ **B1**：`/host/new` 不再每次自动创建，改为回到 `/host`，并在 dashboard 手动创建
- ✅ **新增（命名统一）**：Host 侧核心概念已从 session 收敛为 room，并支持创建前命名、进入房间后改名；Room ID 作为不变标识
- ✅ **A1**：SessionCodeBar 已移除 `menti.com` 硬编码，改为当前站点 host
- ✅ **A2**：大屏与观众端已接入 `questions` 变更订阅，主持人改题可实时同步
- ✅ **A3**：Quiz 手机端已支持倒计时与超时锁定（Time's up）
- ✅ **A4 + F1**：HostConsole 中央 preview 已改为复用真实大屏渲染组件，替代假数据预览
- ✅ **B2**：JoinPage 已在提交前校验 room code，并提供人话错误提示（不存在/已结束）
- ✅ **C1（第一阶段）**：Host 侧页面已切换浅色视觉，与大屏深色形成角色分层
- ✅ **C6**：SessionCodeBar 已改为右上角浮动小卡片（可折叠）
- ✅ **C7（第一阶段）**：HostConsole 三栏布局已重排（左栏收窄，中栏放大，右栏固定）
- ✅ **E2**：结果 signal 已做 debounce，降低 burst fetch 风暴
- ✅ **B7**：大屏 controls 已改为鼠标任意移动即显示（2s 自动淡出）
- ✅ **D4**：autosave 在 unmount 时 flush pending question，防止最后一次编辑丢失
- ✅ **B5**：Host header 增加 Live/Draft 状态灯 + 在线人数（接入 presence 订阅）
- ✅ **B6**：Share 改为弹层（大 QR + session code + Copy join link 按钮）
- ✅ **B8**：大屏 draft 状态增加 waiting room 开场页（QR + code + 在线人数 + 等待提示）

---

## 未完成清单（按优先级）

下面只保留未完成项，已按优先级从高到低排序。

### P1（高优先，建议下一轮）

1. **A5（3-4h）**：拆分 HostConsole 超大文件
	- 位置：[src/routes/HostConsole.tsx](src/routes/HostConsole.tsx)
	- 目标：按题型编辑器 / 会话状态 / 保存策略拆分，降低后续维护成本。

2. **D3（30min）**：抽出 `updateConfig` helper，减少重复 narrowing 代码
	- 位置：[src/routes/HostConsole.tsx](src/routes/HostConsole.tsx#L830)

3. **D2（2h）**：统一三端 session merge 逻辑（host / audience / big-screen）
	- 位置：[src/routes/HostConsole.tsx](src/routes/HostConsole.tsx)、[src/routes/VotePage.tsx](src/routes/VotePage.tsx)、[src/routes/BigScreen.tsx](src/routes/BigScreen.tsx)

4. **E1（2h）**：加速率限制（先前端节流，再考虑数据库限流）
	- 目标：避免 word cloud/open ended 被恶意刷爆。

5. **F2（3-4h）**：补关键 E2E（结束态、切题、重连）
	- 位置：[tests/e2e/acceptance.e2e.ts](tests/e2e/acceptance.e2e.ts)

### P2（中优先，体验与质量提升）

6. **B3（2h）**：MultipleChoice 投后加迷你结果反馈
7. **B4（1h）**：感谢页支持”再提交一次”或按题型允许追加
8. **B9（3h）**：结果导出（CSV）
9. **C1（第二阶段）**：观众端视觉自适应细化
10. **C7（第二阶段）**：三栏交互细化（缩略图、属性面板可用性）
11. **D1（1-2h）**：统一 MultipleChoice options 的 SQL/TS 表示
12. **E3（2h）**：草稿会话清理任务（Edge Function + cron）

### P3（低优先，锦上添花）

13. **C2（1h）**：字体层次升级
14. **C3（1h）**：减少过度 uppercase 小标签
15. **C4（1h）**：圆角层级体系化
16. **C5（3-4h）**：补必要动效
17. **C8（1h）**：品牌 logo / favicon
18. **C9（2h）**：空状态插画/动画
19. **D5（1h）**：减少多层三元表达式
20. **D6（1h）**：路由级 ErrorBoundary
21. **D7（30min）**：统一 vote 提交 API 形状
22. **E4（1h）**：接入错误追踪
23. **E5（1h）**：部署脚本接入 CI

---

## 下一个执行建议

如果你要我直接开干，建议先做这 3 个：

1. **A5**（3-4h）— 拆分 HostConsole
2. **D3**（30min）— updateConfig helper
3. **E1**（2h）— 前端速率限制
