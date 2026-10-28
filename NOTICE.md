# 归属与许可 / Attribution

本仓库是**两个 MIT 项目的合并分发**，不是从零新写的项目。原始版权与作者如下，合并时均保留：

## 1. WorkBuddy 模型池（根目录）

- 来源：`XDTrees/dsh-workbuddy-xdpool`
- 许可：MIT（见根 [LICENSE](LICENSE)）
- 叠加改动（本仓库）：`role:"developer"` 角色归一、网关白名单体重建、`11128` 三级自愈与
  in-band 指令下沉。详见 [docs/incident-11128.md](docs/incident-11128.md)。

其中上游端 wire behavior 的实测结论参考了：

- `corrinehu/dsh-workbuddy-connect`（MIT, Copyright (c) 2026 Corrine Hu）
- `dingminhua/dsh-connect-workbuddy`（MIT, Copyright (c) 2026 LaoDing）

## 2. dsh-purge（`packages/dsh-purge/`）

- 来源：`YuJunZhiXue/dsh-purge`
- 许可：MIT（见 [packages/dsh-purge/LICENSE](packages/dsh-purge/LICENSE)）
- 版权：Copyright (c) 2026 小杨
- **本仓库未修改其源码**，仅整体并入 `packages/dsh-purge/` 并保持其自身 `cordis.patch.yml` 独立生效。

### 作者声明（照录，务必遵守）

- 项目免费、非盈利；**售卖课程、插件、token 或转售即刻失去授权**。
- 使用者承担全部责任；按 MIT「as-is」提供，无完整性/安全性担保。
- 用于非法攻击或恶意活动者，其开源授权即刻终止。

如果要做二次开发，请先阅读 [packages/dsh-purge/README.md](packages/dsh-purge/README.md)
中的署名要求部分。

## 3. 合并方式说明

两个包各自携带自己的 `cordis.patch.yml`，DSH 加载时互不覆盖对方条目：

| 条目 | 由谁注册 |
| --- | --- |
| `llm-workbuddy-xdpool`（provider `workbuddy-xdpool`） | 根 `cordis.patch.yml` |
| `dsh-purge`、`dsh-purge-redteam*` | `packages/dsh-purge/cordis.patch.yml` |

之所以不把 purge 的条目合并进根 patch：DSH 校验 patch 条目的 `name` 必须与目标条目完全同名，
`dsh-workbuddy-xdpool/purge` 这类子路径名会被判 `name mismatch` 并跳过（实测）。
