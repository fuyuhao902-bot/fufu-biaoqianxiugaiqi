from __future__ import annotations

import copy
import io
import json
import html
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd
import streamlit as st
import streamlit.components.v1 as components


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "streamlit_data"
USERS_PATH = DATA_DIR / "users.json"
PROFILES_PATH = DATA_DIR / "profiles.json"

DEFAULT_SAMPLE = """1376344-【经营店铺】【AI+原生画面】【ai真人】多地点玩+经营花店
1376336-【模拟经营】【AI+原生画面】玩游戏+服装店
1376328-【公测动画】【AI动画田园】微信+苹果屋田园生活展示
1376322-【公测】【原生解说】【AI第一人称】真人+解说1
1376318-【装修diy】【UE】奶油风小屋改造展示"""

DEFAULT_PROFILE = {
    "id": "profile-default",
    "name": "童话师-默认规则",
    "placeholderTag": "待修改",
    "ueFallbackTag": "UE+待修改",
    "keepUnknownLevel3": True,
    "level1Options": [
        "经营店铺",
        "经营生活",
        "经营循环",
        "时装",
        "花种花",
        "情绪",
        "装修综合",
        "装修DIY",
        "综合解说",
        "预约AI真人口播",
    ],
    "level1Patterns": [],
    "level2Options": ["AI动画", "AI画面", "AI+原生画面"],
    "level2Patterns": ["UE+"],
    "level3Options": [
        "AI真人亲身玩过",
        "AI真人经典剧情",
        "AI真人",
        "AI第一人称",
        "AI片头",
        "AIvlog",
        "田园",
        "双人",
        "微信开头",
        "待修改",
    ],
    "level3Patterns": ["AI真人+"],
    "aliasRules": [
        "店铺经营 => 经营店铺",
        "模拟经营 => 经营店铺",
        "综合装修 => 装修综合",
        "装修户型 => 装修综合",
        "装修diy => 装修DIY",
        "花情绪 => 情绪",
        "公测动画 => 经营生活",
        "公测 => 经营生活",
        "预约AI真人 => 预约AI真人口播",
        "AI真人预约口播 => 预约AI真人口播",
        "原生画面 => AI+原生画面",
        "原生解说 => AI+原生画面",
    ],
}

DEFAULT_USERS = [
    {
        "id": "user-admin-001",
        "username": "admin",
        "password": "Tonghua2026!",
        "display_name": "童话师",
        "role": "admin",
    }
]


@dataclass
class CorrectedItem:
    prefix: str
    original: str
    corrected: str
    change_summary: str
    original_tags: list[str]
    corrected_tags: list[str]


def ensure_storage() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not USERS_PATH.exists():
        USERS_PATH.write_text(json.dumps(DEFAULT_USERS, ensure_ascii=False, indent=2), encoding="utf-8")
    if not PROFILES_PATH.exists():
        payload = {"profiles": [DEFAULT_PROFILE], "active_profile_id": DEFAULT_PROFILE["id"]}
        PROFILES_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def load_users() -> list[dict[str, Any]]:
    ensure_storage()
    return json.loads(USERS_PATH.read_text(encoding="utf-8"))


def save_users(users: list[dict[str, Any]]) -> None:
    USERS_PATH.write_text(json.dumps(users, ensure_ascii=False, indent=2), encoding="utf-8")


def load_profiles_payload() -> dict[str, Any]:
    ensure_storage()
    return json.loads(PROFILES_PATH.read_text(encoding="utf-8"))


def save_profiles_payload(payload: dict[str, Any]) -> None:
    PROFILES_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def init_session_state() -> None:
    if "source_input" not in st.session_state:
        st.session_state.source_input = DEFAULT_SAMPLE
    if "current_user_id" not in st.session_state:
        st.session_state.current_user_id = None
    if "results" not in st.session_state:
        st.session_state.results = []
    if "active_page" not in st.session_state:
        st.session_state.active_page = "标签修改器"


def current_user(users: list[dict[str, Any]]) -> dict[str, Any] | None:
    current_user_id = st.session_state.get("current_user_id")
    return next((user for user in users if user["id"] == current_user_id), None)


def parse_multiline(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def parse_alias_rules(lines: list[str]) -> dict[str, str]:
    alias_map: dict[str, str] = {}
    for line in lines:
        if "=>" not in line:
            continue
        source, target = [part.strip() for part in line.split("=>", 1)]
        if source and target:
            alias_map[source] = target
    return alias_map


def sanitize_tag(tag: str) -> str:
    return re.sub(r"\s+", "", tag).strip()


def parse_line(line: str) -> dict[str, Any]:
    trimmed = line.strip()
    first_tag_index = trimmed.find("【")
    prefix = trimmed[:first_tag_index] if first_tag_index >= 0 else ""
    tag_area = trimmed[first_tag_index:] if first_tag_index >= 0 else trimmed
    tags = [sanitize_tag(match.group(1)) for match in re.finditer(r"【([^】]+)】", trimmed)]
    body = re.sub(r"【[^】]+】", "", tag_area).strip()
    return {"prefix": prefix, "tags": tags, "body": body}


def is_pattern_matched(tag: str, patterns: list[str]) -> bool:
    if not tag:
        return False
    for pattern in patterns:
        if not pattern:
            continue
        if tag == pattern:
            return True
        if pattern.endswith("+"):
            prefix = pattern[:-1]
            if tag.startswith(prefix) and len(tag) > len(prefix):
                return True
        elif tag.startswith(pattern):
            return True
    return False


def is_allowed_tag(tag: str, allowed: list[str], patterns: list[str]) -> bool:
    return bool(tag) and (tag in allowed or is_pattern_matched(tag, patterns))


def extract_carry_tag(tag: str, prefix: str) -> str:
    if not tag or not tag.startswith(prefix):
        return ""
    return tag[len(prefix) :].strip()


def normalize_level2_tag(tag: str) -> str:
    if tag in {"原生画面", "原生解说"}:
        return "AI+原生画面"
    return tag


def resolve_level1(original_tag: str, profile: dict[str, Any]) -> str:
    if is_allowed_tag(original_tag, profile["level1Options"], profile["level1Patterns"]):
        return original_tag
    return profile["placeholderTag"]


def resolve_level2(original_tag: str, other_tags: list[str], profile: dict[str, Any]) -> tuple[str, str, str]:
    placeholder = profile["placeholderTag"]
    ue_fallback = profile["ueFallbackTag"]
    if original_tag in {"UE", "UE画面"}:
        return ue_fallback, "", original_tag
    if is_allowed_tag(original_tag, profile["level2Options"], profile["level2Patterns"]):
        return normalize_level2_tag(original_tag), "", original_tag

    animation_carry = extract_carry_tag(original_tag, "AI动画")
    if animation_carry:
        return "AI动画", animation_carry, original_tag

    image_carry = extract_carry_tag(original_tag, "AI画面")
    if image_carry:
        return "AI画面", image_carry, original_tag

    misplaced_fixed = next(
        (tag for tag in other_tags if is_allowed_tag(tag, profile["level2Options"], profile["level2Patterns"])),
        None,
    )
    if misplaced_fixed:
        return normalize_level2_tag(misplaced_fixed), "", misplaced_fixed

    misplaced_animation = next((tag for tag in other_tags if extract_carry_tag(tag, "AI动画")), None)
    if misplaced_animation:
        return "AI动画", extract_carry_tag(misplaced_animation, "AI动画"), misplaced_animation

    misplaced_image = next((tag for tag in other_tags if extract_carry_tag(tag, "AI画面")), None)
    if misplaced_image:
        return "AI画面", extract_carry_tag(misplaced_image, "AI画面"), misplaced_image

    reusable_custom = next((tag for tag in other_tags if is_pattern_matched(tag, profile["level2Patterns"])), None)
    if reusable_custom:
        return reusable_custom, "", reusable_custom

    return placeholder, "", ""


def resolve_level3(
    original_tag: str,
    other_tags: list[str],
    profile: dict[str, Any],
    carry_tag: str,
    reserved_level2_tag: str,
) -> str:
    if is_allowed_tag(original_tag, profile["level3Options"], profile["level3Patterns"]):
        return original_tag

    blacklist = set(profile["level1Options"]) | set(profile["level2Options"]) | {
        "公测",
        "公测动画",
        "模拟经营",
        "店铺经营",
        "预约",
        "预约动画",
        "预约装修",
        "动画",
    }

    exact_preserved = next(
        (
            tag
            for tag in other_tags
            if tag
            and tag not in blacklist
            and tag != reserved_level2_tag
            and not tag.startswith("UE")
            and is_allowed_tag(tag, profile["level3Options"], profile["level3Patterns"])
        ),
        None,
    )
    if exact_preserved:
        return exact_preserved
    if carry_tag:
        return carry_tag
    if profile["keepUnknownLevel3"] and original_tag and original_tag not in blacklist and original_tag != reserved_level2_tag:
        return original_tag

    loose_tag = next(
        (
            tag
            for index, tag in enumerate(other_tags)
            if index >= 2
            and tag
            and tag not in blacklist
            and tag != reserved_level2_tag
            and not tag.startswith("UE")
        ),
        None,
    )
    return loose_tag or profile["placeholderTag"]


def correct_line(raw_line: str, profile: dict[str, Any]) -> CorrectedItem:
    parsed = parse_line(raw_line)
    alias_map = parse_alias_rules(profile["aliasRules"])
    normalized_tags = [alias_map.get(tag, tag) for tag in parsed["tags"]]

    level1 = resolve_level1(normalized_tags[0] if len(normalized_tags) > 0 else "", profile)
    level2, carry_tag, source_level2 = resolve_level2(
        normalized_tags[1] if len(normalized_tags) > 1 else "",
        normalized_tags,
        profile,
    )
    level3 = resolve_level3(
        normalized_tags[2] if len(normalized_tags) > 2 else "",
        normalized_tags,
        profile,
        carry_tag,
        source_level2,
    )

    corrected_tags = [level1, level2, level3]
    corrected = f"{parsed['prefix']}{''.join(f'【{tag}】' for tag in corrected_tags)}{parsed['body']}".strip()

    changes = []
    for idx in range(3):
        before = parsed["tags"][idx] if idx < len(parsed["tags"]) else "缺失"
        after = corrected_tags[idx]
        if before != after:
            changes.append(f"第{idx + 1}标签: {before} -> {after}")

    return CorrectedItem(
        prefix=parsed["prefix"].rstrip("-"),
        original=raw_line,
        corrected=corrected,
        change_summary="；".join(changes) if changes else "未改动",
        original_tags=parsed["tags"],
        corrected_tags=corrected_tags,
    )


def build_results(source_input: str, profile: dict[str, Any]) -> list[CorrectedItem]:
    lines = parse_multiline(source_input)
    return [correct_line(line, profile) for line in lines]


def results_dataframe(results: list[CorrectedItem]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "ID/前缀": item.prefix or "-",
                "原名": item.original,
                "现名": item.corrected,
                "改了什么": item.change_summary,
            }
            for item in results
        ]
    )


def render_highlighted_line(raw_line: str, corrected_tags: list[str]) -> str:
    parsed = parse_line(raw_line)
    original_tags = parsed["tags"]
    tag_markup = []
    for idx in range(3):
        before = original_tags[idx] if idx < len(original_tags) else "缺失"
        after = corrected_tags[idx] if idx < len(corrected_tags) else "缺失"
        css_class = "diff-red" if before != after else "diff-normal"
        tag_markup.append(f'<span class="{css_class}">【{html.escape(before)}】</span>')
    return f"{html.escape(parsed['prefix'])}{''.join(tag_markup)}{html.escape(parsed['body'])}"


def render_highlighted_corrected_line(item: CorrectedItem) -> str:
    parsed = parse_line(item.corrected)
    tag_markup = []
    for idx in range(3):
        before = item.original_tags[idx] if idx < len(item.original_tags) else "缺失"
        after = item.corrected_tags[idx] if idx < len(item.corrected_tags) else "缺失"
        css_class = "diff-red" if before != after else "diff-normal"
        tag_markup.append(f'<span class="{css_class}">【{html.escape(after)}】</span>')
    return f"{html.escape(parsed['prefix'])}{''.join(tag_markup)}{html.escape(parsed['body'])}"


def render_results_table(results: list[CorrectedItem]) -> None:
    rows = []
    for item in results:
        rows.append(
            f"""
            <tr>
              <td>{html.escape(item.prefix or "-")}</td>
              <td>{render_highlighted_line(item.original, item.corrected_tags)}</td>
              <td>{render_highlighted_corrected_line(item)}</td>
              <td>{html.escape(item.change_summary)}</td>
            </tr>
            """
        )
    row_count = max(len(rows), 1)
    table_html = f"""
    <style>
      body {{
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: transparent;
      }}
      .result-table {{
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
        background: rgba(255,255,255,0.88);
        border-radius: 16px;
        overflow: hidden;
      }}
      .result-table th, .result-table td {{
        border: 1px solid rgba(231, 191, 200, 0.42);
        padding: 12px;
        vertical-align: top;
        text-align: left;
        line-height: 1.65;
      }}
      .result-table th {{
        background: rgba(255, 241, 245, 0.95);
      }}
      .diff-red {{
        color: #c53b2f;
        font-weight: 700;
      }}
      .diff-normal {{
        color: #262127;
      }}
    </style>
    <table class="result-table">
      <thead>
        <tr>
          <th>ID/前缀</th>
          <th>原名</th>
          <th>现名</th>
          <th>改了什么</th>
        </tr>
      </thead>
      <tbody>
        {''.join(rows)}
      </tbody>
    </table>
    """
    components.html(table_html, height=min(900, 120 + row_count * 72), scrolling=True)


def export_excel_bytes(results: list[CorrectedItem]) -> bytes:
    df = results_dataframe(results)
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="改名对照")
    buffer.seek(0)
    return buffer.read()


def render_login(users: list[dict[str, Any]]) -> None:
    with st.form("login_form", clear_on_submit=False):
        st.subheader("登录进入")
        username = st.text_input("账号")
        password = st.text_input("密码", type="password")
        submitted = st.form_submit_button("登录")
        if submitted:
            matched = next(
                (user for user in users if user["username"] == username.strip() and user["password"] == password),
                None,
            )
            if not matched:
                st.error("账号或密码错误。")
            else:
                st.session_state.current_user_id = matched["id"]
                st.rerun()


def render_sidebar(user: dict[str, Any], profiles_payload: dict[str, Any]) -> None:
    st.sidebar.title("标签修改器")
    st.sidebar.caption(f"当前用户：{user['display_name']} · {'管理员' if user['role'] == 'admin' else '普通成员'}")
    page = st.sidebar.radio("页面", ["标签修改器", "规则管理", "人员管理"], index=["标签修改器", "规则管理", "人员管理"].index(st.session_state.active_page))
    st.session_state.active_page = page
    active_profile = next(
        (profile for profile in profiles_payload["profiles"] if profile["id"] == profiles_payload["active_profile_id"]),
        profiles_payload["profiles"][0],
    )
    st.sidebar.info(f"当前规则：{active_profile['name']}")
    if st.sidebar.button("退出登录", use_container_width=True):
        st.session_state.current_user_id = None
        st.rerun()


def render_workspace(profiles_payload: dict[str, Any]) -> None:
    st.title("标签修改器")
    st.caption("批量导入旧命名，直接得到纠正结果、改动说明和 Excel 导出。")

    profiles = profiles_payload["profiles"]
    profile_names = [profile["name"] for profile in profiles]
    active_index = next(
        (index for index, profile in enumerate(profiles) if profile["id"] == profiles_payload["active_profile_id"]),
        0,
    )

    col_rule, col_btn = st.columns([3, 1])
    with col_rule:
        selected_name = st.selectbox("当前规则", profile_names, index=active_index, key="workspace_profile_name")
    with col_btn:
        st.write("")
        if st.button("切换规则", use_container_width=True):
            selected = next(profile for profile in profiles if profile["name"] == selected_name)
            profiles_payload["active_profile_id"] = selected["id"]
            save_profiles_payload(profiles_payload)
            st.success(f"已切换到规则：{selected['name']}")
            st.rerun()

    uploaded_file = st.file_uploader("导入 txt / csv", type=["txt", "csv"])
    if uploaded_file is not None:
        st.session_state.source_input = uploaded_file.read().decode("utf-8")

    col_action_1, col_action_2 = st.columns(2)
    with col_action_1:
        if st.button("载入示例", use_container_width=True):
            st.session_state.source_input = DEFAULT_SAMPLE
            st.rerun()
    with col_action_2:
        run_clicked = st.button("生成纠正版", use_container_width=True, type="primary")

    st.session_state.source_input = st.text_area("旧命名输入区", value=st.session_state.source_input, height=260)

    active_profile = next(profile for profile in profiles if profile["id"] == profiles_payload["active_profile_id"])
    if run_clicked or st.session_state.results:
        results = build_results(st.session_state.source_input, active_profile)
        st.session_state.results = results
    else:
        results = []

    if not st.session_state.results:
        return

    results = st.session_state.results
    changed_count = sum(1 for item in results if item.change_summary != "未改动")
    metric_1, metric_2, metric_3 = st.columns(3)
    metric_1.metric("输入条数", len(results))
    metric_2.metric("已改动", changed_count)
    metric_3.metric("当前规则", active_profile["name"])

    corrected_text = "\n".join(item.corrected for item in results)
    st.text_area("纠正后清单", value=corrected_text, height=260)

    export_bytes = export_excel_bytes(results)
    st.download_button(
        "下载 Excel",
        data=export_bytes,
        file_name="改名对照.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True,
    )

    st.subheader("改名对照")
    render_results_table(results)


def render_rules_page(profiles_payload: dict[str, Any]) -> None:
    st.title("规则管理")
    st.caption("这里负责保存、切换、更新标签规则。")

    profiles = profiles_payload["profiles"]
    selected_profile = next(
        (profile for profile in profiles if profile["id"] == profiles_payload["active_profile_id"]),
        profiles[0],
    )

    selected_name = st.selectbox("选择规则", [profile["name"] for profile in profiles], index=[profile["name"] for profile in profiles].index(selected_profile["name"]))
    selected_profile = next(profile for profile in profiles if profile["name"] == selected_name)

    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("设为当前规则", use_container_width=True):
            profiles_payload["active_profile_id"] = selected_profile["id"]
            save_profiles_payload(profiles_payload)
            st.success("当前规则已切换。")
            st.rerun()
    with col2:
        if st.button("复制为新规则", use_container_width=True):
            copied = copy.deepcopy(selected_profile)
            copied["id"] = f"profile-{uuid.uuid4().hex[:8]}"
            copied["name"] = f"{selected_profile['name']}-副本"
            profiles.append(copied)
            save_profiles_payload(profiles_payload)
            st.success("已复制为新规则。")
            st.rerun()
    with col3:
        if st.button("删除当前选中规则", use_container_width=True, disabled=len(profiles) == 1):
            profiles[:] = [profile for profile in profiles if profile["id"] != selected_profile["id"]]
            if profiles_payload["active_profile_id"] == selected_profile["id"]:
                profiles_payload["active_profile_id"] = profiles[0]["id"]
            save_profiles_payload(profiles_payload)
            st.success("规则已删除。")
            st.rerun()

    with st.form("rule_editor_form"):
        name = st.text_input("规则名称", value=selected_profile["name"])
        placeholder = st.text_input("未命中占位词", value=selected_profile["placeholderTag"])
        ue_fallback = st.text_input("UE兜底标签", value=selected_profile["ueFallbackTag"])
        keep_unknown = st.checkbox("第三级未命中时尽量保留原标签", value=selected_profile["keepUnknownLevel3"])

        col_a, col_b, col_c = st.columns(3)
        with col_a:
            level1_options = st.text_area("一级标签允许列表", value="\n".join(selected_profile["level1Options"]), height=220)
            level1_patterns = st.text_area("一级标签自拟格式", value="\n".join(selected_profile["level1Patterns"]), height=120)
        with col_b:
            level2_options = st.text_area("二级标签允许列表", value="\n".join(selected_profile["level2Options"]), height=220)
            level2_patterns = st.text_area("二级标签自拟格式", value="\n".join(selected_profile["level2Patterns"]), height=120)
        with col_c:
            level3_options = st.text_area("三级标签允许列表", value="\n".join(selected_profile["level3Options"]), height=220)
            level3_patterns = st.text_area("三级标签自拟格式", value="\n".join(selected_profile["level3Patterns"]), height=120)

        alias_rules = st.text_area("别名 / 错别字纠正", value="\n".join(selected_profile["aliasRules"]), height=180)
        submitted = st.form_submit_button("保存规则", use_container_width=True, type="primary")

        if submitted:
            selected_profile.update(
                {
                    "name": name.strip() or "未命名规则",
                    "placeholderTag": placeholder.strip() or "待修改",
                    "ueFallbackTag": ue_fallback.strip() or "UE+待修改",
                    "keepUnknownLevel3": keep_unknown,
                    "level1Options": parse_multiline(level1_options),
                    "level1Patterns": parse_multiline(level1_patterns),
                    "level2Options": parse_multiline(level2_options),
                    "level2Patterns": parse_multiline(level2_patterns),
                    "level3Options": parse_multiline(level3_options),
                    "level3Patterns": parse_multiline(level3_patterns),
                    "aliasRules": parse_multiline(alias_rules),
                }
            )
            save_profiles_payload(profiles_payload)
            st.success("规则已保存。")
            st.rerun()


def render_users_page(users: list[dict[str, Any]], user: dict[str, Any]) -> None:
    st.title("人员管理")
    st.caption("管理员可以新增人员和分配管理员权限。")

    if user["role"] != "admin":
        st.warning("当前账号不是管理员，只能查看人员列表。")
    else:
        with st.form("create_user_form"):
            col1, col2, col3 = st.columns(3)
            with col1:
                display_name = st.text_input("人员姓名")
            with col2:
                username = st.text_input("登录账号")
            with col3:
                password = st.text_input("登录密码")
            is_admin = st.checkbox("设为管理员")
            submitted = st.form_submit_button("新增人员", use_container_width=True, type="primary")
            if submitted:
                if not display_name.strip() or not username.strip() or not password.strip():
                    st.error("请完整填写姓名、账号和密码。")
                elif any(existing["username"] == username.strip() for existing in users):
                    st.error("该账号已存在。")
                else:
                    users.append(
                        {
                            "id": f"user-{uuid.uuid4().hex[:8]}",
                            "username": username.strip(),
                            "password": password.strip(),
                            "display_name": display_name.strip(),
                            "role": "admin" if is_admin else "member",
                        }
                    )
                    save_users(users)
                    st.success("人员已新增。")
                    st.rerun()

    st.subheader("人员列表")
    for row in users:
        col_info, col_action = st.columns([5, 1])
        with col_info:
            st.markdown(f"**{row['display_name']}**  \n`{row['username']}` · {'管理员' if row['role'] == 'admin' else '普通成员'}")
        with col_action:
            if user["role"] == "admin" and row["id"] != user["id"]:
                if st.button("删除", key=f"delete-{row['id']}"):
                    users[:] = [item for item in users if item["id"] != row["id"]]
                    save_users(users)
                    st.rerun()


def main() -> None:
    st.set_page_config(page_title="标签修改器", layout="wide")
    init_session_state()
    ensure_storage()
    users = load_users()
    profiles_payload = load_profiles_payload()
    user = current_user(users)

    st.markdown(
        """
        <style>
        .stApp { background: linear-gradient(180deg, #fffdfd 0%, #fff7f8 44%, #fff5f5 100%); }
        .block-container { padding-top: 2rem; padding-bottom: 2rem; }
        </style>
        """,
        unsafe_allow_html=True,
    )

    if not user:
        render_login(users)
        st.info("请使用已分配的管理员或成员账号登录。")
        return

    render_sidebar(user, profiles_payload)

    if st.session_state.active_page == "标签修改器":
        render_workspace(profiles_payload)
    elif st.session_state.active_page == "规则管理":
        render_rules_page(profiles_payload)
    else:
        render_users_page(users, user)


if __name__ == "__main__":
    main()
