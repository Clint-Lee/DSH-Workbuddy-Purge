#!/usr/bin/env bash
# DSH WorkBuddy XD Pool — Linux/macOS one-click installer.
# Run from the extracted plugin directory (the directory containing this file).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE="$DSH_HOME/profiles/desktop"
PLUGINS="$DSH_HOME/plugins"
NODE_MODULES="$PROFILE/node_modules"
PACKAGE_JSON="$PROFILE/package.json"
PATCH_YML="$PROFILE/cordis.patch.yml"

info() { printf '\033[1;33m>> %s\033[0m\n' "$*"; }
ok()   { printf '   \033[1;32m[OK]\033[0m %s\n' "$*"; }
warn() { printf '   \033[1;33m[!]\033[0m %s\n' "$*"; }
err()  { printf '   \033[1;31m[X]\033[0m %s\n' "$*"; }

if ! command -v python3 >/dev/null 2>&1; then
  err "需要 python3 来校验 profile 配置"
  exit 1
fi

for required in "$ROOT/lib/client.js" "$ROOT/lib/index.js" "$ROOT/packages/dsh-purge/client.js"; do
  if [[ ! -f "$required" ]]; then
    err "插件包不完整：$required"
    err "请完整解压安装包后重新运行。"
    exit 1
  fi
done
ok "插件包完整（$ROOT）"

if [[ ! -d "$PROFILE" ]]; then
  err "未检测到 desktop profile：$PROFILE"
  err "请先安装并至少成功启动一次 DeepSeek Harness。"
  exit 1
fi
ok "已检测到 DSH 配置目录"

mkdir -p "$PLUGINS" "$NODE_MODULES"

link_dir() {
  local link="$1" target="$2"
  if [[ -L "$link" ]]; then
    rm -f "$link"
  elif [[ -e "$link" ]]; then
    local backup="${link}.bak-$(date +%Y%m%d-%H%M%S)"
    mv "$link" "$backup"
    warn "已存在同名目录，已备份为 $(basename "$backup")"
  fi
  ln -s "$target" "$link"
  ok "$(basename "$link") -> $target"
}

info "1/3 建立插件链接"
link_dir "$PLUGINS/dsh-workbuddy-xdpool" "$ROOT"
link_dir "$PLUGINS/dsh-purge" "$ROOT/packages/dsh-purge"
link_dir "$NODE_MODULES/dsh-workbuddy-xdpool" "$ROOT"
link_dir "$NODE_MODULES/dsh-purge" "$ROOT/packages/dsh-purge"

info "2/3 注册到 DSH profile"
if [[ -f "$PACKAGE_JSON" ]]; then
  cp "$PACKAGE_JSON" "$PACKAGE_JSON.bak-$(date +%Y%m%d-%H%M%S)"
  ok "已备份原配置"
fi

python3 - "$PACKAGE_JSON" <<'PY'
import json, os, sys
path = sys.argv[1]
obj = {}
if os.path.isfile(path):
    try:
        with open(path, 'r', encoding='utf-8-sig') as f:
            text = f.read().strip()
        obj = json.loads(text) if text else {}
    except Exception:
        obj = {}
if not isinstance(obj, dict):
    obj = {}
obj.setdefault('name', 'dsh-profile-desktop')
obj['private'] = True
deps = obj.get('dependencies') or {}
if not isinstance(deps, dict):
    deps = {}
deps['dsh-workbuddy-xdpool'] = 'file:../../plugins/dsh-workbuddy-xdpool'
deps['dsh-purge'] = 'file:../../plugins/dsh-purge'
obj['dependencies'] = deps
dsh = obj.get('dsh') or {}
if not isinstance(dsh, dict):
    dsh = {}
profile = dsh.get('profile') or {}
if not isinstance(profile, dict):
    profile = {}
bundles = list(profile.get('bundles') or [])
result = []
for name in ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-workbuddy-xdpool']:
    if name not in result:
        result.append(name)
for name in bundles:
    name = str(name)
    if name and name != 'dsh-purge' and name not in result:
        result.append(name)
profile['bundles'] = result
dsh['profile'] = profile
obj['dsh'] = dsh
with open(path, 'w', encoding='utf-8', newline='\n') as f:
    json.dump(obj, f, ensure_ascii=False, indent=2)
    f.write('\n')
PY

python3 - "$PACKAGE_JSON" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, 'rb') as f:
    assert f.read(3) != b'\xef\xbb\xbf', 'profile package.json 带 BOM'
with open(path, 'r', encoding='utf-8') as f:
    obj = json.load(f)
bundles = obj['dsh']['profile']['bundles']
assert 'dsh-workbuddy-xdpool' in bundles
assert 'dsh-purge' not in bundles
print('bundles=' + str(len(bundles)))
PY
ok "配置已写入并校验通过（无 BOM）"

# Remove only the historical standalone dsh-purge Loader child under an insert
# block. The merged bundle now inserts those rows itself; duplicate Loader
# sources for the same packageName make dsh-client-modules fail reconciliation.
if [[ -f "$PATCH_YML" ]]; then
  python3 - "$PATCH_YML" <<'PY'
import re, sys
path = sys.argv[1]
with open(path, 'r', encoding='utf-8-sig', newline='') as f:
    text = f.read()
lines = text.splitlines()
marked = [False] * len(lines)
removed = 0
for i, line in enumerate(lines):
    if not re.match(r'^-\s*insert\s*:\s*$', line):
        continue
    block_end = len(lines) - 1
    for j in range(i + 1, len(lines)):
        if lines[j].strip() == '':
            continue
        if re.match(r'^\s', lines[j]):
            continue
        block_end = j - 1
        break
    child_starts = [j for j in range(i + 1, block_end + 1) if re.match(r'^\s+-\s', lines[j])]
    block_removed = False
    for c, start in enumerate(child_starts):
        end = child_starts[c + 1] - 1 if c + 1 < len(child_starts) else block_end
        sub = '\n'.join(lines[start:end + 1])
        if re.search(r'(?m)^\s*(?:-\s+)?id:\s*dsh-purge\s*$', sub) and \
           re.search(r'(?m)^\s*(?:-\s+)?name:\s*dsh-purge\s*$', sub):
            for k in range(start, end + 1):
                marked[k] = True
            removed += 1
            block_removed = True
    if block_removed:
        remaining = [j for j in range(i + 1, block_end + 1)
                     if not marked[j] and re.match(r'^\s+-\s', lines[j])]
        if not remaining:
            marked[i] = True
if removed:
    nl = '\r\n' if '\r\n' in text else '\n'
    out = [line for i, line in enumerate(lines) if not marked[i]]
    with open(path + '.bak-linux-install', 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    body = nl.join(out)
    if text.endswith(('\n', '\r')):
        body += nl
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(body)
print('removed=' + str(removed))
PY
fi

info "3/3 检查 DSH 是否正在运行"
if command -v pgrep >/dev/null 2>&1 && pgrep -f 'DeepSeek.*Harness|dsh web|dsh desktop' >/dev/null 2>&1; then
  warn "检测到 DSH 相关进程；请完全退出后重新打开。"
else
  ok "DSH 未在运行，可以直接打开"
fi

printf '\n\033[1;32m==========================================================\033[0m\n'
printf '\033[1;32m   安装完成！\033[0m\n'
printf '\033[1;32m==========================================================\033[0m\n\n'
printf '接下来：\n'
printf '  1. 完全退出 DSH 后重新打开（含托盘/后台进程）\n'
printf '  2. 确保 WorkBuddy 桌面端已登录至少一个账号\n'
printf '  3. DSH 设置 → WorkBuddy 积分池\n'
printf '  4. 对话界面选择 WorkBuddy 模型\n\n'
printf '注意：解压目录不要删除或移动，安装链接指向这里。\n'
