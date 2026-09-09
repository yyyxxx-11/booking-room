const config = window.BOOKING_CONFIG || {};
const roomName = config.ROOM_NAME || "会议室";
const isCloudConfigured = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);

const elements = {
  roomName: document.querySelector("#room-name"),
  footerRoomName: document.querySelector("#footer-room-name"),
  selectedDateLabel: document.querySelector("#selected-date-label"),
  timezoneNote: document.querySelector("#timezone-note"),
  datePicker: document.querySelector("#date-picker"),
  previousDay: document.querySelector("#previous-day"),
  nextDay: document.querySelector("#next-day"),
  todayButton: document.querySelector("#today-button"),
  refreshButton: document.querySelector("#refresh-button"),
  slotList: document.querySelector("#slot-list"),
  identityButton: document.querySelector("#identity-button"),
  identityLabel: document.querySelector("#identity-label"),
  avatar: document.querySelector("#avatar"),
  identityDialog: document.querySelector("#identity-dialog"),
  identityForm: document.querySelector("#identity-form"),
  displayName: document.querySelector("#display-name"),
  bookingDialog: document.querySelector("#booking-dialog"),
  bookingForm: document.querySelector("#booking-form"),
  bookingSummary: document.querySelector("#booking-summary"),
  bookingSlot: document.querySelector("#booking-slot"),
  bookingPurpose: document.querySelector("#booking-purpose"),
  toast: document.querySelector("#toast")
};

const state = {
  selectedDate: getCalendarToday(),
  userId: null,
  displayName: localStorage.getItem("booking-display-name") || "",
  bookings: [],
  dataSource: null,
  toastTimer: null
};

function getCalendarToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00Z`);
  const today = getCalendarToday();
  const relative = dateString === today ? "今天 · " : dateString === addDays(today, 1) ? "明天 · " : "";
  return relative + new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(date);
}

function slotTimes() {
  return Array.from({ length: 18 }, (_, index) => {
    const totalMinutes = 8 * 60 + 30 + index * 30;
    const hour = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minute = String(totalMinutes % 60).padStart(2, "0");
    return `${hour}:${minute}`;
  });
}

function addMinutes(time, amount) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + amount;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function icon(path) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", "0 0 24 24");
  const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathElement.setAttribute("d", path);
  svg.append(pathElement);
  return svg;
}

function renderHeader() {
  elements.roomName.textContent = roomName;
  elements.footerRoomName.textContent = roomName;
  elements.timezoneNote.textContent = `固定时间 08:30–17:30${isCloudConfigured ? "" : " · 本机演示"}`;
  elements.selectedDateLabel.textContent = formatDate(state.selectedDate);
  elements.datePicker.value = state.selectedDate;
  elements.datePicker.min = getCalendarToday();
  elements.previousDay.disabled = state.selectedDate <= getCalendarToday();
  elements.identityLabel.textContent = state.displayName || "设置姓名";
  elements.avatar.textContent = state.displayName ? Array.from(state.displayName)[0] : "?";
}

function renderSlots() {
  elements.slotList.replaceChildren();
  const bookingByTime = new Map(state.bookings.map((booking) => [booking.start_time.slice(0, 5), booking]));

  slotTimes().forEach((time, index) => {
    const booking = bookingByTime.get(time);
    const row = createElement("div", `slot-row ${booking ? "is-booked" : "is-available"}`);
    row.style.animationDelay = `${Math.min(index * 18, 180)}ms`;

    const timeCell = createElement("div", "slot-time", time);
    const status = createElement("div", "slot-status");
    const statusIcon = createElement("span", "slot-status-icon");
    statusIcon.append(icon(booking ? "M8 12l3 3 5-6" : "M12 5v14M5 12h14"));
    const detail = createElement("div", "slot-detail");
    detail.append(createElement("strong", "", booking ? booking.display_name : "可预约"));
    detail.append(createElement("small", "", booking ? (booking.purpose || "已预约") : `${time}–${addMinutes(time, 30)}`));
    status.append(statusIcon, detail);

    let action;
    if (!booking) {
      action = createElement("button", "reserve-button", "预约");
      action.type = "button";
      action.addEventListener("click", () => openBookingDialog(time));
    } else if (booking.user_id === state.userId) {
      action = createElement("button", "cancel-button", "取消");
      action.type = "button";
      action.addEventListener("click", () => cancelBooking(booking));
    } else {
      action = createElement("span", "booked-label", "不可更改");
    }

    row.append(timeCell, status, action);
    elements.slotList.append(row);
  });
}

function showToast(message, isError = false) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", isError);
  elements.toast.classList.add("visible");
  state.toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2800);
}

function setLoading(isLoading) {
  elements.refreshButton.classList.toggle("loading", isLoading);
  elements.refreshButton.disabled = isLoading;
}

async function refreshBookings() {
  setLoading(true);
  try {
    state.bookings = await state.dataSource.list(state.selectedDate);
    renderSlots();
  } catch (error) {
    elements.slotList.replaceChildren(createElement("div", "error-state", "预约数据读取失败，请稍后刷新。"));
    showToast(error.message || "读取失败", true);
  } finally {
    setLoading(false);
  }
}

function ensureIdentity() {
  if (state.displayName) return true;
  elements.displayName.value = "";
  elements.identityDialog.showModal();
  setTimeout(() => elements.displayName.focus(), 0);
  return false;
}

function openBookingDialog(time) {
  if (!ensureIdentity()) return;
  elements.bookingSlot.value = time;
  elements.bookingPurpose.value = "";
  elements.bookingSummary.textContent = `${formatDate(state.selectedDate)}，${time}–${addMinutes(time, 30)}，预约人为 ${state.displayName}。`;
  elements.bookingDialog.showModal();
}

async function cancelBooking(booking) {
  if (!confirm(`取消 ${booking.start_time.slice(0, 5)} 的预约吗？`)) return;
  try {
    await state.dataSource.remove(booking.id);
    showToast("预约已取消");
    await refreshBookings();
  } catch (error) {
    showToast(error.message || "取消失败", true);
  }
}

function createLocalDataSource() {
  const storageKey = "meeting-room-demo-bookings";
  const userKey = "meeting-room-demo-user";
  let userId = localStorage.getItem(userKey);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(userKey, userId);
  }
  state.userId = userId;

  const read = () => JSON.parse(localStorage.getItem(storageKey) || "[]");
  const write = (bookings) => localStorage.setItem(storageKey, JSON.stringify(bookings));
  return {
    async list(date) {
      return read().filter((booking) => booking.booking_date === date);
    },
    async add(booking) {
      const bookings = read();
      if (bookings.some((item) => item.booking_date === booking.booking_date && item.start_time === booking.start_time)) {
        throw new Error("这个时间刚刚被预约了，请选择其他时间。");
      }
      bookings.push({ ...booking, id: crypto.randomUUID(), user_id: userId });
      write(bookings);
    },
    async remove(id) {
      const booking = read().find((item) => item.id === id);
      if (!booking || booking.user_id !== userId) throw new Error("只能取消自己的预约。");
      write(read().filter((item) => item.id !== id));
    }
  };
}

async function createCloudDataSource() {
  let supabaseModule;
  try {
    supabaseModule = await import("https://esm.sh/@supabase/supabase-js@2");
  } catch {
    supabaseModule = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  }
  const { createClient } = supabaseModule;
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  let { data: { session } } = await client.auth.getSession();
  if (!session) {
    const result = await client.auth.signInAnonymously();
    if (result.error) throw result.error;
    session = result.data.session;
  }
  state.userId = session.user.id;

  client.channel("booking-updates")
    .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => refreshBookings())
    .subscribe();

  return {
    async list(date) {
      const { data, error } = await client.from("bookings").select("id, booking_date, start_time, display_name, purpose, user_id").eq("booking_date", date).order("start_time");
      if (error) throw error;
      return data;
    },
    async add(booking) {
      const { error } = await client.from("bookings").insert({ ...booking, user_id: state.userId });
      if (error?.code === "23505") throw new Error("这个时间刚刚被预约了，请选择其他时间。");
      if (error) throw error;
    },
    async remove(id) {
      const { error, count } = await client.from("bookings").delete({ count: "exact" }).eq("id", id).eq("user_id", state.userId);
      if (error) throw error;
      if (count === 0) throw new Error("只能取消自己的预约。");
    }
  };
}

async function initialize() {
  renderHeader();
  try {
    state.dataSource = isCloudConfigured ? await createCloudDataSource() : createLocalDataSource();
    await refreshBookings();
  } catch (error) {
    elements.slotList.replaceChildren(createElement("div", "error-state", "无法连接预约服务，请检查配置后刷新。"));
    showToast(error.message || "初始化失败", true);
  }
}

elements.previousDay.addEventListener("click", async () => {
  state.selectedDate = addDays(state.selectedDate, -1);
  renderHeader();
  await refreshBookings();
});
elements.nextDay.addEventListener("click", async () => {
  state.selectedDate = addDays(state.selectedDate, 1);
  renderHeader();
  await refreshBookings();
});
elements.todayButton.addEventListener("click", async () => {
  state.selectedDate = getCalendarToday();
  renderHeader();
  await refreshBookings();
});
elements.datePicker.addEventListener("change", async (event) => {
  if (!event.target.value) return;
  state.selectedDate = event.target.value;
  renderHeader();
  await refreshBookings();
});
elements.refreshButton.addEventListener("click", refreshBookings);
elements.identityButton.addEventListener("click", () => {
  elements.displayName.value = state.displayName;
  elements.identityDialog.showModal();
});
elements.identityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.displayName.value.trim();
  if (!name) return;
  state.displayName = name;
  localStorage.setItem("booking-display-name", name);
  renderHeader();
  elements.identityDialog.close();
  showToast("姓名已保存");
});
elements.bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = elements.bookingForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    const time = elements.bookingSlot.value;
    await state.dataSource.add({
      booking_date: state.selectedDate,
      start_time: `${time}:00`,
      end_time: `${addMinutes(time, 30)}:00`,
      display_name: state.displayName,
      purpose: elements.bookingPurpose.value.trim() || null
    });
    elements.bookingDialog.close();
    showToast("预约成功");
    await refreshBookings();
  } catch (error) {
    showToast(error.message || "预约失败", true);
    await refreshBookings();
  } finally {
    submitButton.disabled = false;
  }
});
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});
document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

initialize();
