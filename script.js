const STORAGE_KEY = "tag-modifier-profiles-v2";
const ACTIVE_PROFILE_KEY = "tag-modifier-active-profile-v2";
const SOURCE_INPUT_KEY = "tag-modifier-source-input-v2";
const USERS_KEY = "tag-modifier-users-v1";
const SESSION_KEY = "tag-modifier-session-v1";

const defaultSample = `1376344-【经营店铺】【AI+原生画面】【ai真人】多地点玩+经营花店
1376336-【模拟经营】【AI+原生画面】玩游戏+服装店
1376328-【公测动画】【AI动画田园】微信+苹果屋田园生活展示
1376322-【公测】【原生解说】【AI第一人称】真人+解说1
1376318-【装修diy】【UE】奶油风小屋改造展示`;

const defaultProfile = {
  id: createId(),
  name: "童话师-默认规则",
  placeholderTag: "待修改",
  ueFallbackTag: "UE+待修改",
  keepUnknownLevel3: true,
  level1Options: [
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
  level1Patterns: [],
  level2Options: ["AI动画", "AI画面", "AI+原生画面"],
  level2Patterns: ["UE+"],
  level3Options: [
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
  level3Patterns: ["AI真人+"],
  aliasRules: [
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
};

const defaultUsers = [
  {
    id: "user-admin-001",
    username: "admin",
    password: "Tonghua2026!",
    displayName: "童话师",
    role: "admin",
  },
];

const els = {
  loginScreen: document.getElementById("loginScreen"),
  loginForm: document.getElementById("loginForm"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  loginHint: document.getElementById("loginHint"),
  navPageButtons: [...document.querySelectorAll("[data-page]")],
  pageTriggerButtons: [...document.querySelectorAll("[data-page-trigger]")],
  pageViews: [...document.querySelectorAll(".page-view")],
  profileSelect: document.getElementById("profileSelect"),
  loadProfileBtn: document.getElementById("loadProfileBtn"),
  deleteProfileBtn: document.getElementById("deleteProfileBtn"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  updateProfileBtn: document.getElementById("updateProfileBtn"),
  resetProfileBtn: document.getElementById("resetProfileBtn"),
  loadSampleBtn: document.getElementById("loadSampleBtn"),
  runCorrectionBtn: document.getElementById("runCorrectionBtn"),
  copyOutputBtn: document.getElementById("copyOutputBtn"),
  copyReportBtn: document.getElementById("copyReportBtn"),
  textFileInput: document.getElementById("textFileInput"),
  profileName: document.getElementById("profileName"),
  workspaceProfileSelect: document.getElementById("workspaceProfileSelect"),
  workspaceLoadProfileBtn: document.getElementById("workspaceLoadProfileBtn"),
  currentUserName: document.getElementById("currentUserName"),
  currentUserRole: document.getElementById("currentUserRole"),
  logoutBtn: document.getElementById("logoutBtn"),
  exportExcelBtn: document.getElementById("exportExcelBtn"),
  userManagerBadge: document.getElementById("userManagerBadge"),
  userForm: document.getElementById("userForm"),
  newUserDisplayName: document.getElementById("newUserDisplayName"),
  newUsername: document.getElementById("newUsername"),
  newUserPassword: document.getElementById("newUserPassword"),
  newUserIsAdmin: document.getElementById("newUserIsAdmin"),
  userList: document.getElementById("userList"),
  placeholderTag: document.getElementById("placeholderTag"),
  ueFallbackTag: document.getElementById("ueFallbackTag"),
  keepUnknownLevel3: document.getElementById("keepUnknownLevel3"),
  level1Options: document.getElementById("level1Options"),
  level1Patterns: document.getElementById("level1Patterns"),
  level2Options: document.getElementById("level2Options"),
  level2Patterns: document.getElementById("level2Patterns"),
  level3Options: document.getElementById("level3Options"),
  level3Patterns: document.getElementById("level3Patterns"),
  aliasRules: document.getElementById("aliasRules"),
  sourceInput: document.getElementById("sourceInput"),
  correctedOutput: document.getElementById("correctedOutput"),
  resultsBody: document.getElementById("resultsBody"),
  totalCount: document.getElementById("totalCount"),
  changedCount: document.getElementById("changedCount"),
  activeRuleNameSecondary: document.getElementById("activeRuleNameSecondary"),
  scrollButtons: [...document.querySelectorAll("[data-scroll-target]")],
};

let profiles = loadProfiles();
let activeProfileId = loadActiveProfileId(profiles);
let users = loadUsers();
let currentUser = loadSessionUser(users);
let latestResults = [];
let currentPage = "workspace";

renderProfileSelect();
fillForm(getActiveProfile());
restoreSourceInput();
bindEvents();
runCorrection();
syncAuthUI();
renderUsers();
setPage(currentPage);

function bindEvents() {
  els.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    attemptLogin();
  });

  els.navPageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPage(button.dataset.page);
    });
  });

  els.pageTriggerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPage(button.dataset.pageTrigger);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  els.scrollButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.scrollTarget);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  els.loadProfileBtn.addEventListener("click", () => {
    const profile = getSelectedProfile();
    activateProfile(profile.id);
  });

  els.workspaceLoadProfileBtn.addEventListener("click", () => {
    activateProfile(els.workspaceProfileSelect.value);
  });

  els.deleteProfileBtn.addEventListener("click", () => {
    if (profiles.length === 1) {
      window.alert("至少保留一个规则。");
      return;
    }
    const currentId = els.profileSelect.value;
    profiles = profiles.filter((profile) => profile.id !== currentId);
    activeProfileId = profiles[0].id;
    persistProfiles();
    saveActiveProfileId(activeProfileId);
    renderProfileSelect();
    fillForm(getActiveProfile());
    runCorrection();
  });

  els.saveProfileBtn.addEventListener("click", () => {
    const draft = collectFormProfile();
    draft.id = createId();
    profiles.push(draft);
    persistProfiles();
    activateProfile(draft.id, draft);
  });

  els.updateProfileBtn.addEventListener("click", () => {
    const draft = collectFormProfile();
    const selectedId = els.profileSelect.value;
    const index = profiles.findIndex((profile) => profile.id === selectedId);
    if (index === -1) {
      return;
    }
    draft.id = selectedId;
    profiles[index] = draft;
    persistProfiles();
    activateProfile(selectedId, draft);
  });

  els.resetProfileBtn.addEventListener("click", () => {
    fillForm(structuredClone(defaultProfile));
  });

  els.loadSampleBtn.addEventListener("click", () => {
    els.sourceInput.value = defaultSample;
    persistSourceInput();
    runCorrection();
  });

  els.runCorrectionBtn.addEventListener("click", runCorrection);
  els.sourceInput.addEventListener("input", persistSourceInput);

  els.textFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    els.sourceInput.value = text;
    persistSourceInput();
    runCorrection();
    event.target.value = "";
  });

  els.copyOutputBtn.addEventListener("click", async () => {
    await copyText(els.correctedOutput.value, "纠正后清单已复制");
  });

  els.copyReportBtn.addEventListener("click", async () => {
    const report = latestResults
      .map((item) =>
        [
          `ID/前缀：${item.prefix || "-"}`,
          `原名：${item.original}`,
          `现名：${item.corrected}`,
          `改了什么：${item.changeSummary}`,
        ].join("\n")
      )
      .join("\n\n");
    await copyText(report, "完整对照已复制");
  });

  els.exportExcelBtn.addEventListener("click", exportResultsAsExcel);

  els.logoutBtn.addEventListener("click", () => {
    currentUser = null;
    clearSessionUser();
    syncAuthUI();
    setPage("workspace");
  });

  els.userForm.addEventListener("submit", (event) => {
    event.preventDefault();
    createUser();
  });
}

function setPage(page) {
  currentPage = page || "workspace";
  els.navPageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.page === currentPage);
  });
  els.pageViews.forEach((view) => {
    view.classList.toggle("is-active", view.id === `page-${currentPage}`);
  });
}

function activateProfile(profileId, profileOverride) {
  activeProfileId = profileId;
  saveActiveProfileId(activeProfileId);
  renderProfileSelect();
  const profile = profileOverride || getActiveProfile();
  fillForm(profile);
  runCorrection();
}

function runCorrection() {
  if (!currentUser) {
    return;
  }
  const profile = collectFormProfile();
  const lines = normalizeMultiline(els.sourceInput.value);
  latestResults = lines.map((line) => correctLine(line, profile));
  renderResults(latestResults, profile);
}

function correctLine(rawLine, profile) {
  const parsed = parseLine(rawLine);
  const aliasMap = parseAliasMap(profile.aliasRules);
  const level1Allowed = parseOptionList(profile.level1Options);
  const level2Allowed = parseOptionList(profile.level2Options);
  const level3Allowed = parseOptionList(profile.level3Options);
  const level1Patterns = parsePatternList(profile.level1Patterns);
  const level2Patterns = parsePatternList(profile.level2Patterns);
  const level3Patterns = parsePatternList(profile.level3Patterns);
  const normalizedTags = parsed.tags.map((tag) => normalizeAlias(tag, aliasMap));
  const placeholder = profile.placeholderTag || "待修改";
  const ueFallback = profile.ueFallbackTag || "UE+待修改";

  const level1 = resolveLevel1({
    originalTag: normalizedTags[0] || "",
    level1Allowed,
    level1Patterns,
    placeholder,
  });

  const level2State = resolveLevel2({
    originalTag: normalizedTags[1] || "",
    otherTags: normalizedTags,
    level2Allowed,
    level2Patterns,
    placeholder,
    ueFallback,
  });

  const level3 = resolveLevel3({
    originalTag: normalizedTags[2] || "",
    otherTags: normalizedTags,
    level3Allowed,
    level3Patterns,
    placeholder,
    carryTag: level2State.carryTag,
    reservedLevel2Tag: level2State.sourceTag,
    keepUnknown: Boolean(profile.keepUnknownLevel3),
    blacklist: new Set([
      ...level1Allowed,
      ...level2Allowed,
      "公测",
      "公测动画",
      "模拟经营",
      "店铺经营",
      "预约",
      "预约动画",
      "预约装修",
      "动画",
    ]),
  });

  const correctedTags = [level1, level2State.value, level3];
  const corrected = `${parsed.prefix}${correctedTags.map((tag) => `【${tag}】`).join("")}${parsed.body}`.trim();
  const changes = describeChanges(parsed.tags, correctedTags);

  return {
    prefix: parsed.prefix.replace(/-$/, "") || "",
    original: rawLine,
    corrected,
    originalParsed: parsed,
    correctedParsed: { prefix: parsed.prefix, tags: correctedTags, body: parsed.body },
    changedTagIndexes: [0, 1, 2].filter((index) => (parsed.tags[index] || "") !== (correctedTags[index] || "")),
    changeSummary: changes.length ? changes.join("；") : "未改动",
  };
}

function resolveLevel1({ originalTag, level1Allowed, level1Patterns, placeholder }) {
  return isAllowedTag(originalTag, level1Allowed, level1Patterns) ? originalTag : placeholder;
}

function resolveLevel2({ originalTag, otherTags, level2Allowed, level2Patterns, placeholder, ueFallback }) {
  if (originalTag === "UE" || originalTag === "UE画面") {
    return { value: ueFallback, carryTag: "", sourceTag: originalTag };
  }
  if (isAllowedTag(originalTag, level2Allowed, level2Patterns)) {
    return { value: normalizeLevel2Tag(originalTag), carryTag: "", sourceTag: originalTag };
  }

  const animationCarry = extractCarryTag(originalTag, "AI动画");
  if (animationCarry) {
    return { value: "AI动画", carryTag: animationCarry, sourceTag: originalTag };
  }
  const imageCarry = extractCarryTag(originalTag, "AI画面");
  if (imageCarry) {
    return { value: "AI画面", carryTag: imageCarry, sourceTag: originalTag };
  }

  const misplacedFixedTag = otherTags.find((tag) => isAllowedTag(tag, level2Allowed, level2Patterns));
  if (misplacedFixedTag) {
    return { value: normalizeLevel2Tag(misplacedFixedTag), carryTag: "", sourceTag: misplacedFixedTag };
  }

  const misplacedAnimationTag = otherTags.find((tag) => extractCarryTag(tag, "AI动画"));
  if (misplacedAnimationTag) {
    return { value: "AI动画", carryTag: extractCarryTag(misplacedAnimationTag, "AI动画"), sourceTag: misplacedAnimationTag };
  }

  const misplacedImageTag = otherTags.find((tag) => extractCarryTag(tag, "AI画面"));
  if (misplacedImageTag) {
    return { value: "AI画面", carryTag: extractCarryTag(misplacedImageTag, "AI画面"), sourceTag: misplacedImageTag };
  }

  const reusableCustomTag = otherTags.find((tag) => isPatternMatched(tag, level2Patterns));
  if (reusableCustomTag) {
    return { value: reusableCustomTag, carryTag: "", sourceTag: reusableCustomTag };
  }

  return { value: placeholder, carryTag: "", sourceTag: "" };
}

function resolveLevel3({
  originalTag,
  otherTags,
  level3Allowed,
  level3Patterns,
  placeholder,
  carryTag,
  reservedLevel2Tag,
  keepUnknown,
  blacklist,
}) {
  if (isAllowedTag(originalTag, level3Allowed, level3Patterns)) {
    return originalTag;
  }

  const exactPreserved = otherTags.find((tag) => {
    if (!tag || blacklist.has(tag) || tag === reservedLevel2Tag || /^UE/i.test(tag)) {
      return false;
    }
    return isAllowedTag(tag, level3Allowed, level3Patterns);
  });
  if (exactPreserved) {
    return exactPreserved;
  }
  if (carryTag) {
    return carryTag;
  }
  if (keepUnknown && originalTag && !blacklist.has(originalTag) && originalTag !== reservedLevel2Tag) {
    return originalTag;
  }

  const looseTag = otherTags.find((tag, index) => {
    if (!tag || index < 2 || blacklist.has(tag) || tag === reservedLevel2Tag || /^UE/i.test(tag)) {
      return false;
    }
    return true;
  });
  return looseTag || placeholder;
}

function renderResults(results, profile) {
  els.totalCount.textContent = String(results.length);
  els.changedCount.textContent = String(results.filter((item) => item.changeSummary !== "未改动").length);
  els.activeRuleNameSecondary.textContent = profile.name || "未命名规则";
  els.workspaceProfileSelect.value = profile.id || activeProfileId;
  els.correctedOutput.value = results.map((item) => item.corrected).join("\n");

  if (!results.length) {
    els.resultsBody.innerHTML = `<tr><td colspan="4" class="empty-cell">还没有结果，先导入一批旧命名。</td></tr>`;
    return;
  }

  els.resultsBody.innerHTML = results
    .map(
      (item) => `
        <tr>
          <td class="mono">${escapeHtml(item.prefix || "-")}</td>
          <td class="mono">${renderLineMarkup(item.originalParsed, item.changedTagIndexes)}</td>
          <td class="mono">${renderLineMarkup(item.correctedParsed, item.changedTagIndexes)}</td>
          <td>${escapeHtml(item.changeSummary)}</td>
        </tr>
      `
    )
    .join("");
}

function attemptLogin() {
  const username = els.loginUsername.value.trim();
  const password = els.loginPassword.value;
  const matched = users.find((user) => user.username === username && user.password === password);
  if (!matched) {
    els.loginHint.textContent = "账号或密码错误，请重新输入。";
    els.loginHint.classList.add("error");
    return;
  }
  currentUser = matched;
  saveSessionUser(matched.id);
  els.loginPassword.value = "";
  els.loginHint.textContent = "登录成功。";
  els.loginHint.classList.remove("error");
  syncAuthUI();
  runCorrection();
}

function syncAuthUI() {
  const loggedIn = Boolean(currentUser);
  document.body.classList.toggle("auth-locked", !loggedIn);
  els.loginScreen.classList.toggle("is-visible", !loggedIn);

  if (!loggedIn) {
    els.currentUserName.textContent = "未登录";
    els.currentUserRole.textContent = "请先使用账密登录";
    els.userManagerBadge.textContent = "仅管理员";
    els.userForm.style.display = "none";
    return;
  }

  els.currentUserName.textContent = currentUser.displayName;
  els.currentUserRole.textContent = currentUser.role === "admin" ? "管理员" : "普通成员";
  els.userManagerBadge.textContent = currentUser.role === "admin" ? "管理员" : "只读人员管理";
  els.userForm.style.display = currentUser.role === "admin" ? "block" : "none";
}

function createUser() {
  if (!currentUser || currentUser.role !== "admin") {
    window.alert("只有管理员可以新增人员。");
    return;
  }

  const displayName = els.newUserDisplayName.value.trim();
  const username = els.newUsername.value.trim();
  const password = els.newUserPassword.value.trim();
  const role = els.newUserIsAdmin.checked ? "admin" : "member";

  if (!displayName || !username || !password) {
    window.alert("请完整填写人员姓名、账号和密码。");
    return;
  }

  if (users.some((user) => user.username === username)) {
    window.alert("该账号已存在，请更换账号。");
    return;
  }

  users.push({
    id: createId(),
    username,
    password,
    displayName,
    role,
  });
  persistUsers();
  renderUsers();
  els.userForm.reset();
}

function renderUsers() {
  if (!els.userList) {
    return;
  }

  els.userList.innerHTML = users
    .map((user) => {
      const canDelete = currentUser && currentUser.role === "admin" && user.id !== currentUser.id;
      return `
        <article class="user-item">
          <div>
            <strong>${escapeHtml(user.displayName)}</strong>
            <span>${escapeHtml(user.username)} · ${user.role === "admin" ? "管理员" : "普通成员"}</span>
          </div>
          ${
            canDelete
              ? `<button class="secondary-button small-button" type="button" data-delete-user="${escapeHtml(user.id)}">删除</button>`
              : `<span class="mini-badge">${user.role === "admin" ? "管理员" : "成员"}</span>`
          }
        </article>
      `;
    })
    .join("");

  els.userList.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteUser(button.dataset.deleteUser);
    });
  });
}

function deleteUser(userId) {
  if (!currentUser || currentUser.role !== "admin") {
    return;
  }
  users = users.filter((user) => user.id !== userId);
  persistUsers();
  renderUsers();
}

function exportResultsAsExcel() {
  if (!latestResults.length) {
    window.alert("当前没有可导出的结果。");
    return;
  }

  const rows = [
    ["ID/前缀", "原名", "现名", "改了什么"],
    ...latestResults.map((item) => [item.prefix || "-", item.original, item.corrected, item.changeSummary]),
  ];

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          ${rows
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
            )
            .join("")}
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `改名对照_${formatDateForFile(new Date())}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderProfileSelect() {
  const optionsMarkup = profiles
    .map((profile) => {
      const selected = profile.id === activeProfileId ? "selected" : "";
      return `<option value="${escapeHtml(profile.id)}" ${selected}>${escapeHtml(profile.name)}</option>`;
    })
    .join("");
  els.profileSelect.innerHTML = optionsMarkup;
  els.workspaceProfileSelect.innerHTML = optionsMarkup;
}

function fillForm(profile) {
  els.profileName.value = profile.name || "";
  els.placeholderTag.value = profile.placeholderTag || "待修改";
  els.ueFallbackTag.value = profile.ueFallbackTag || "UE+待修改";
  els.keepUnknownLevel3.checked = Boolean(profile.keepUnknownLevel3);
  els.level1Options.value = toMultiline(profile.level1Options);
  els.level1Patterns.value = toMultiline(profile.level1Patterns);
  els.level2Options.value = toMultiline(profile.level2Options);
  els.level2Patterns.value = toMultiline(profile.level2Patterns);
  els.level3Options.value = toMultiline(profile.level3Options);
  els.level3Patterns.value = toMultiline(profile.level3Patterns);
  els.aliasRules.value = toMultiline(profile.aliasRules);
  els.activeRuleNameSecondary.textContent = profile.name || "未命名规则";
  els.workspaceProfileSelect.value = profile.id || activeProfileId;
}

function collectFormProfile() {
  return {
    name: els.profileName.value.trim() || "未命名规则",
    placeholderTag: els.placeholderTag.value.trim() || "待修改",
    ueFallbackTag: els.ueFallbackTag.value.trim() || "UE+待修改",
    keepUnknownLevel3: els.keepUnknownLevel3.checked,
    level1Options: normalizeMultiline(els.level1Options.value),
    level1Patterns: normalizeMultiline(els.level1Patterns.value),
    level2Options: normalizeMultiline(els.level2Options.value),
    level2Patterns: normalizeMultiline(els.level2Patterns.value),
    level3Options: normalizeMultiline(els.level3Options.value),
    level3Patterns: normalizeMultiline(els.level3Patterns.value),
    aliasRules: normalizeMultiline(els.aliasRules.value),
  };
}

function getActiveProfile() {
  return profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
}

function getSelectedProfile() {
  const selectedId = els.profileSelect.value;
  return profiles.find((profile) => profile.id === selectedId) || getActiveProfile();
}

function loadProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(saved) && saved.length) {
      return saved;
    }
  } catch (error) {
    console.warn("读取规则失败，已回退默认规则", error);
  }
  return [structuredClone(defaultProfile)];
}

function loadUsers() {
  try {
    const saved = JSON.parse(localStorage.getItem(USERS_KEY) || "null");
    if (Array.isArray(saved) && saved.length) {
      return saved;
    }
  } catch (error) {
    console.warn("读取用户失败，已回退默认管理员", error);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  return structuredClone(defaultUsers);
}

function persistUsers() {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadSessionUser(savedUsers) {
  const userId = localStorage.getItem(SESSION_KEY);
  return savedUsers.find((user) => user.id === userId) || null;
}

function saveSessionUser(userId) {
  localStorage.setItem(SESSION_KEY, userId);
}

function clearSessionUser() {
  localStorage.removeItem(SESSION_KEY);
}

function loadActiveProfileId(savedProfiles) {
  const savedId = localStorage.getItem(ACTIVE_PROFILE_KEY);
  if (savedId && savedProfiles.some((profile) => profile.id === savedId)) {
    return savedId;
  }
  return savedProfiles[0].id;
}

function persistProfiles() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function saveActiveProfileId(id) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

function persistSourceInput() {
  localStorage.setItem(SOURCE_INPUT_KEY, els.sourceInput.value);
}

function restoreSourceInput() {
  els.sourceInput.value = localStorage.getItem(SOURCE_INPUT_KEY) || defaultSample;
}

function parseLine(line) {
  const trimmed = line.trim();
  const firstTagIndex = trimmed.indexOf("【");
  const prefix = firstTagIndex >= 0 ? trimmed.slice(0, firstTagIndex) : "";
  const tagArea = firstTagIndex >= 0 ? trimmed.slice(firstTagIndex) : trimmed;
  return {
    prefix,
    tags: [...trimmed.matchAll(/【([^】]+)】/g)].map((match) => sanitizeTag(match[1])),
    body: tagArea.replace(/【[^】]+】/g, "").trim(),
  };
}

function sanitizeTag(tag) {
  return tag.replace(/\s+/g, "").trim();
}

function parseOptionList(lines) {
  return lines.map((line) => sanitizeTag(line)).filter(Boolean);
}

function parsePatternList(lines) {
  return lines.map((line) => sanitizeTag(line)).filter(Boolean);
}

function parseAliasMap(lines) {
  return lines.reduce((map, line) => {
    const [source, target] = line.split("=>").map((part) => part && part.trim());
    if (source && target) {
      map[source] = target;
    }
    return map;
  }, {});
}

function normalizeAlias(tag, aliasMap) {
  return aliasMap[tag] || tag;
}

function isAllowedTag(tag, allowed, patterns) {
  return Boolean(tag) && (allowed.includes(tag) || isPatternMatched(tag, patterns));
}

function isPatternMatched(tag, patterns) {
  if (!tag) {
    return false;
  }
  return patterns.some((pattern) => {
    if (!pattern) {
      return false;
    }
    if (tag === pattern) {
      return true;
    }
    if (pattern.endsWith("+")) {
      const prefix = pattern.slice(0, -1);
      return tag.startsWith(prefix) && tag.length > prefix.length;
    }
    return tag.startsWith(pattern);
  });
}

function extractCarryTag(tag, prefix) {
  if (!tag || !tag.startsWith(prefix)) {
    return "";
  }
  const rest = tag.slice(prefix.length).trim();
  return rest || "";
}

function normalizeLevel2Tag(tag) {
  if (tag === "原生画面" || tag === "原生解说") {
    return "AI+原生画面";
  }
  return tag;
}

function describeChanges(originalTags, newTags) {
  const changes = [];
  for (let index = 0; index < 3; index += 1) {
    const before = originalTags[index] || "缺失";
    const after = newTags[index] || "缺失";
    if (before !== after) {
      changes.push(`第${index + 1}标签: ${before} -> ${after}`);
    }
  }
  return changes;
}

function renderLineMarkup(parsed, changedTagIndexes) {
  const prefix = escapeHtml(parsed.prefix || "");
  const tagsMarkup = [0, 1, 2]
    .map((index) => {
      const tag = parsed.tags[index] || "缺失";
      const cls = changedTagIndexes.includes(index) ? "diff-red" : "";
      return `<span class="${cls}">【${escapeHtml(tag)}】</span>`;
    })
    .join("");
  return `${prefix}${tagsMarkup}${escapeHtml(parsed.body || "")}`;
}

function normalizeMultiline(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function toMultiline(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

async function copyText(text, successMessage) {
  if (!text.trim()) {
    window.alert("当前没有可复制的内容。");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    window.alert(successMessage);
  } catch (error) {
    console.error(error);
    window.alert("复制失败，请手动复制。");
  }
}

function formatDateForFile(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}_${hour}${minute}`;
}

function createId() {
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
