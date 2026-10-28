# 接手文档（HANDOFF）

> 给下一台设备上的自己/协作者。状态截至 **2026-10-28 23:5x**。
> 读这份就知道：仓库在哪、装好后是什么状态、哪些事做完了、哪些还没做完、下一步点哪里。

---

## 1. 仓库与远端

| 项 | 值 |
| --- | --- |
| 本地路径 | `D:\Extends\DSHProj\Demo\dsh-workbuddy-xdpool` |
| 远端 | `https://github.com/Libaoyun/DSH-Workbuddy-Purge` |
| 分支 | `main` |
| 结构 | 根包 `dsh-workbuddy-xdpool`（模型池）+ `packages/dsh-purge`（破甲） |

旧的两个上游仓库仍在本地，**不要删**，是回滚点：

- `D:\Extends\antigravityProj\Pojia\dsh-workbuddy-xdpool`（1.8.3）
- `D:\Extends\antigravityProj\Pojia\dsh-purge`（1.1.71）

## 2. 装到 DSH 的关键事实（踩过的坑）

1. **两个包各带自己的 `cordis.patch.yml`，不能合并成一份。**
   DSH 校验 patch 条目的 `name` 必须与目标条目**完全同名**；写成 `dsh-workbuddy-xdpool/purge`
   会被判 `name mismatch` 并跳过（实测报错：`patch: name mismatch for "dsh-purge"`）。
   所以 purge 必须作为可解析的包名 `dsh-purge` 存在。

2. **需要两处链接 × 两个包 = 4 条 junction。**

   ```
   ~/.dsh/plugins/dsh-workbuddy-xdpool                        -> <repo>
   ~/.dsh/plugins/dsh-purge                                   -> <repo>\packages\dsh-purge
   ~/.dsh/profiles/desktop/node_modules/dsh-workbuddy-xdpool   -> <repo>
   ~/.dsh/profiles/desktop/node_modules/dsh-purge              -> <repo>\packages\dsh-purge
   ```

3. **改完必须完全退出 DSH 再开。** 插件在 host 进程启动时一次性加载，热改文件不生效。

4. **本机 pnpm 装不齐依赖，`tsdown` 跑不起来。**
   `pnpm install` 会失败在 `@deepseek-ai/dsh-invariants` / `dsh-session` 的版本上（registry 上
   没有 `>=0.1.5 <0.2.0-0` 的版本）。
   → 所以 `lib/*.js` 是**手工同步**的：改 `src` 之后，必须把等价改动**手动落进 `lib/index.js`
   与 `lib/client.js`**，否则 DSH 加载的还是旧的。

## 3. 已完成

| 事项 | 说明 |
| --- | --- |
| 11128 渠道验证修复 | 两级触发点：`developer` 角色 + 指令内容被过滤。三级自愈，见 `docs/incident-11128.md` |
| 合并成单仓库 | purge 整体进 `packages/dsh-purge`，源码未改，LICENSE/署名保留 |
| QUICKSTART.md | 首次使用五步 |
| NOTICE.md | 归属与许可（含 purge 作者声明照录） |
| docs/incident-11128.md | 故障复盘（证据表 + 复现命令） |
| probe/ | 取证脚本，`probe/README.md` 说明哪些需要自己生成数据 |
| README 重写 | 明确写成「两个子系统」，补上 purge 破甲一节 |

## 4. 未完成 / 待办

### 4.1 卡片样式（进行中，可继续优化）

`src/client/styles.ts` 已重写为 token 驱动的新视觉语言，**功能与 class 名一个没动**：
分段控件、状态点光晕、选中态左侧色条、总计数字强化、`prefers-reduced-motion` 支持。

**已知不足（浅色主题）**：DSH 亮色下 `--dsw-alias-bg-layer-2` 本身就是纯白，
卡片 `color-mix(layer2, label 7%)` 只到约 3% 灰，卡片与页面几乎同色，层次不明显。
深色主题下层次正常。

已试过并确认**无效**的写法：`color-mix(A 100%, B 6%)` —— 会归一化成 3% 混合。
正确写法是 `color-mix(in oklab, A, B 7%)`（已采用）。

**下一步建议**：给亮色主题单独一组更深的灰阶（例如卡片 `color-mix(layer2, label 12%)`），
用 `@media (prefers-color-scheme:light)` 覆盖。DSH 的主题确实跟随系统
（`dsh-client-ui-theme` 里用的就是 `prefers-color-scheme`）。

### 4.2 GitHub contributors 显示两个人

`https://github.com/Libaoyun/DSH-Workbuddy-Purge/graphs/contributors` 会列出
**XDTrees/aosi526** 和 **Libaoyun** 两个人，因为历史里保留了 85 个上游提交
（68 个 `aosi526`、17 个 `XDAGZ`、1 个 `Libaoyun`）。

**要只剩一个 contributor，必须重写历史**，把 86 个提交压成一个由 `Libaoyun` 提交的初始提交，
然后 force push：

```powershell
cd <repo>
# 1) 备份（已建过 backup-before-squash 分支，可复用或重建）
git branch backup-before-squash

# 2) 压成一个提交（保留工作树，重置历史）
git checkout --orphan clean-main
git add -A
git -c user.name="Libaoyun" -c user.email="你的邮箱" commit -m "init: DSH Workbuddy × Purge"

# 3) 替换 main 并强推
git branch -D main
git branch -m main
git push -f origin main
```

注意：
- force push 后远端历史不可恢复，本地 `backup-before-squash` 分支是唯一退路，确认没问题再删。
- 压成一个提交会丢失上游 1.8.3 / 1.1.71 的逐条变更记录。若想保留可读历史，代价是 contributors 仍显示上游作者——二者不可兼得。
- GitHub 的 contributor 缓存需要几分钟到几小时才刷新。

### 4.3 其它

- `lib/index.d.ts` 未随源码更新（`tsdown` 跑不了），类型层面可能与 `src` 有偏差；运行不受影响。
- `packages/dsh-purge` 内的 `PNPM` 相关产物未动，其自带 `.github/workflows` 也未改。
- 合并后**未在干净环境验证过一遍安装流程**（只在本机验证过）。QUICKSTART 的第 2–3 步建议在新设备上按文档走一遍，有偏差就回来修文档。

## 5. 验证清单（改完必跑）

```powershell
# 语法
node --check lib/index.js
node --check lib/client.js

# 池子活着（正式实例默认 19387）
Invoke-RestMethod http://127.0.0.1:19387/plugins/dsh-workbuddy-xdpool/status | Select accounts,region,shim

# 端到端：真 shim + 真上游（源码侧）
node probe/shim-e2e.mjs
node probe/inband-e2e.mjs   # 需先按 probe/README.md 生成 probe/data/failing-request.json
```

## 6. 危险操作提醒

- **不要用 `Get-Process | Where-Object {...} | Stop-Process` 这种宽条件杀进程**，
  本机同时跑着正式实例（用户正在用）和测试实例，宽条件会误杀。
  只按明确 PID 停：`Stop-Process -Id <pid>`。
- 测试用隔离 profile（复制 `profiles/desktop` 后改 `node_modules` 链接），**不要直接在正式 profile 上试**。
- 用 `Set-Content -Encoding UTF8` 写给 DSH 的 `package.json` 会带 BOM，DSH 的
  `JSON.parse` 会直接报错。写这类文件用：

  ```powershell
  [System.IO.File]::WriteAllText($p, $json, (New-Object System.Text.UTF8Encoding($false)))
  ```
