const state = {
  studentId: null,
  records: []
};

const loginForm = document.querySelector("#loginForm");
const recordForm = document.querySelector("#recordForm");
const loginSection = document.querySelector("#loginSection");
const dashboard = document.querySelector("#dashboard");
const logoutButton = document.querySelector("#logoutButton");
const storageStatus = document.querySelector("#storageStatus");

const isSupabaseConfigured = () =>
  window.SUPABASE_CONFIG?.url &&
  window.SUPABASE_CONFIG?.anonKey &&
  window.SUPABASE_CONFIG.url !== "https://YOUR_PROJECT.supabase.co";

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function supabaseRequest(path, options = {}) {
  const { url, anonKey } = window.SUPABASE_CONFIG;
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "데이터베이스 요청에 실패했습니다.");
  }
  if (response.status === 204) return null;
  return response.json();
}

function localKey(studentId) {
  return `typing-record-${studentId}`;
}

function readLocalStudent(studentId) {
  return JSON.parse(localStorage.getItem(localKey(studentId)) || "null");
}

function writeLocalStudent(studentId, passwordHash, records) {
  localStorage.setItem(localKey(studentId), JSON.stringify({
    studentId,
    passwordHash,
    records
  }));
}

async function authenticateStudent(studentId, password) {
  const passwordHash = await sha256(password);

  if (!isSupabaseConfigured()) {
    const existing = readLocalStudent(studentId);
    if (!existing) {
      writeLocalStudent(studentId, passwordHash, []);
      return [];
    }
    if (existing.passwordHash !== passwordHash) {
      throw new Error("비밀번호가 학번과 일치하지 않습니다.");
    }
    return existing.records || [];
  }

  storageStatus.classList.add("connected");
  storageStatus.innerHTML = '<span class="status-dot"></span> Supabase 연결됨';

  const students = await supabaseRequest(
    `students?student_id=eq.${encodeURIComponent(studentId)}&select=student_id,password_hash`
  );

  if (students.length === 0) {
    await supabaseRequest("students", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId, password_hash: passwordHash })
    });
  } else if (students[0].password_hash !== passwordHash) {
    throw new Error("비밀번호가 학번과 일치하지 않습니다.");
  }

  return supabaseRequest(
    `typing_records?student_id=eq.${encodeURIComponent(studentId)}&select=korean_score,english_score,recorded_at&order=recorded_at.asc`
  );
}

async function saveRecord(koreanScore, englishScore) {
  const recordedAt = new Date();
  const date = `${recordedAt.getFullYear()}-${String(recordedAt.getMonth() + 1).padStart(2, "0")}-${String(recordedAt.getDate()).padStart(2, "0")}`;
  const record = {
    korean_score: koreanScore,
    english_score: englishScore,
    recorded_at: date
  };

  if (!isSupabaseConfigured()) {
    const existing = readLocalStudent(state.studentId);
    existing.records = [
      ...(existing.records || []).filter((item) => item.recorded_at !== date),
      record
    ].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
    writeLocalStudent(state.studentId, existing.passwordHash, existing.records);
    return existing.records;
  }

  await supabaseRequest(
    `typing_records?on_conflict=student_id,recorded_at`,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        student_id: state.studentId,
        korean_score: koreanScore,
        english_score: englishScore,
        recorded_at: date
      })
    }
  );

  return supabaseRequest(
    `typing_records?student_id=eq.${encodeURIComponent(state.studentId)}&select=korean_score,english_score,recorded_at&order=recorded_at.asc`
  );
}

function normalizeRecords(records) {
  return records.map((record) => ({
    korean: Number(record.korean_score),
    english: Number(record.english_score),
    date: record.recorded_at
  }));
}

function renderDashboard(records) {
  state.records = normalizeRecords(records);
  dashboard.hidden = false;
  loginSection.hidden = true;
  logoutButton.hidden = false;

  document.querySelector("#todayLabel").textContent =
    new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date());

  const koreanBest = state.records.reduce((best, item) => Math.max(best, item.korean), 0);
  const englishBest = state.records.reduce((best, item) => Math.max(best, item.english), 0);
  document.querySelector("#koreanBest").textContent = koreanBest.toLocaleString("ko-KR");
  document.querySelector("#englishBest").textContent = englishBest.toLocaleString("ko-KR");
  renderChart();
}

function shortDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

function renderChart() {
  const svg = document.querySelector("#chart");
  const emptyChart = document.querySelector("#emptyChart");
  const records = state.records;
  emptyChart.hidden = records.length > 0;
  svg.innerHTML = "";
  if (!records.length) return;

  const width = svg.clientWidth || 800;
  const height = svg.clientHeight || 280;
  const margin = { top: 18, right: 18, bottom: 36, left: 46 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(
    100,
    ...records.map((item) => Math.max(item.korean, item.english))
  );
  const roundedMax = Math.ceil(maxValue / 100) * 100;

  const ns = "http://www.w3.org/2000/svg";
  const add = (tag, attributes, text) => {
    const element = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (text != null) element.textContent = text;
    svg.appendChild(element);
    return element;
  };

  const x = (index) =>
    records.length === 1
      ? margin.left + innerWidth / 2
      : margin.left + (index * innerWidth) / (records.length - 1);
  const y = (value) => margin.top + innerHeight - (value / roundedMax) * innerHeight;

  for (let index = 0; index <= 4; index++) {
    const value = (roundedMax / 4) * index;
    const lineY = y(value);
    add("line", { x1: margin.left, y1: lineY, x2: width - margin.right, y2: lineY, class: "grid-line" });
    add("text", { x: margin.left - 12, y: lineY + 4, "text-anchor": "end", class: "axis-label" }, Math.round(value).toLocaleString("ko-KR"));
  }

  records.forEach((record, index) => {
    add("text", {
      x: x(index),
      y: height - 8,
      "text-anchor": "middle",
      class: "axis-label"
    }, shortDate(record.date));
  });

  const makePath = (field, className) =>
    records.map((record, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(record[field])}`).join(" ");

  if (records.length) {
    add("path", { d: makePath("korean", "korean-path"), class: "korean-path" });
    add("path", { d: makePath("english", "english-path"), class: "english-path" });
    records.forEach((record, index) => {
      add("circle", { cx: x(index), cy: y(record.korean), r: 5, class: "korean-dot" });
      add("circle", { cx: x(index), cy: y(record.english), r: 5, class: "english-dot" });
    });
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.querySelector("#loginMessage");
  const studentId = document.querySelector("#studentId").value.trim();
  const password = document.querySelector("#password").value;
  message.className = "form-message";

  if (!/^\d{4}$/.test(studentId) || !/^\d{4}$/.test(password)) {
    message.textContent = "학번과 비밀번호는 숫자 4자리로 입력해 주세요.";
    return;
  }

  try {
    const records = await authenticateStudent(studentId, password);
    state.studentId = studentId;
    renderDashboard(records);
  } catch (error) {
    message.textContent = error.message;
  }
});

recordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.querySelector("#recordMessage");
  const koreanScore = Number(document.querySelector("#koreanScore").value);
  const englishScore = Number(document.querySelector("#englishScore").value);
  message.className = "form-message";

  if (!Number.isFinite(koreanScore) || !Number.isFinite(englishScore) ||
      koreanScore < 0 || englishScore < 0) {
    message.textContent = "0 이상의 타자 기록을 입력해 주세요.";
    return;
  }

  try {
    const records = await saveRecord(koreanScore, englishScore);
    renderDashboard(records);
    recordForm.reset();
    message.className = "form-message success";
    message.textContent = "오늘의 기록이 저장되었습니다.";
  } catch (error) {
    message.textContent = error.message;
  }
});

logoutButton.addEventListener("click", () => {
  state.studentId = null;
  state.records = [];
  dashboard.hidden = true;
  loginSection.hidden = false;
  logoutButton.hidden = true;
  loginForm.reset();
  document.querySelector("#loginMessage").textContent = "";
});

window.addEventListener("resize", () => {
  if (!dashboard.hidden) renderChart();
});
