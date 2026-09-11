const config = window.BOOKING_CONFIG || {};
const isCloudConfigured = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
const resources = {
  "meeting-room": {
    name: config.ROOM_NAME || "Meeting Room",
    description: "Meeting room · 30-minute slots"
  },
  "exhibition-booth": {
    name: config.BOOTH_NAME || "Exhibition Booth",
    description: "Exhibition booth · 30-minute slots"
  }
};

const elements = {
  roomName: document.querySelector("#room-name"),
  footerRoomName: document.querySelector("#footer-room-name"),
  resourceDescription: document.querySelector("#resource-description"),
  resourceButtons: document.querySelectorAll("[data-resource]"),
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
  authDialog: document.querySelector("#auth-dialog"),
  signedOutPanel: document.querySelector("#signed-out-panel"),
  signedInPanel: document.querySelector("#signed-in-panel"),
  emailForm: document.querySelector("#email-form"),
  emailAddress: document.querySelector("#email-address"),
  emailStatus: document.querySelector("#email-status"),
  accountName: document.querySelector("#account-name"),
  accountEmail: document.querySelector("#account-email"),
  signOutButton: document.querySelector("#sign-out-button"),
  identityDialog: document.querySelector("#identity-dialog"),
  identityForm: document.querySelector("#identity-form"),
  displayName: document.querySelector("#display-name"),
  adminSignInButton: document.querySelector("#admin-signin-button"),
  bookingDialog: document.querySelector("#booking-dialog"),
  bookingForm: document.querySelector("#booking-form"),
  bookingSummary: document.querySelector("#booking-summary"),
  bookingSlot: document.querySelector("#booking-slot"),
  bookingPurpose: document.querySelector("#booking-purpose"),
  bookingAttendees: document.querySelector("#booking-attendees"),
  toast: document.querySelector("#toast")
};

const state = {
  selectedDate: getCalendarToday(),
  selectedResource: localStorage.getItem("booking-resource") in resources
    ? localStorage.getItem("booking-resource")
    : "meeting-room",
  userId: null,
  displayName: localStorage.getItem("booking-display-name") || "",
  isEmailUser: false,
  isAdmin: false,
  email: "",
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
  const relative = dateString === today ? "Today · " : dateString === addDays(today, 1) ? "Tomorrow · " : "";
  return relative + new Intl.DateTimeFormat("en-US", {
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

function maskEmail(email) {
  if (!email) return "Signed in";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${name.length > 2 ? "***" : ""}@${domain}`;
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
  const resource = resources[state.selectedResource];
  elements.roomName.textContent = resource.name;
  elements.footerRoomName.textContent = resource.name;
  elements.resourceDescription.textContent = resource.description;
  document.title = `${resource.name} Booking`;
  elements.resourceButtons.forEach((button) => {
    const isActive = button.dataset.resource === state.selectedResource;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  elements.timezoneNote.textContent = `Room hours 08:30–17:30${isCloudConfigured ? "" : " · Local demo"}`;
  elements.selectedDateLabel.textContent = formatDate(state.selectedDate);
  elements.datePicker.value = state.selectedDate;
  elements.datePicker.min = getCalendarToday();
  elements.previousDay.disabled = state.selectedDate <= getCalendarToday();
  elements.identityLabel.textContent = state.isEmailUser
    ? (state.isAdmin ? state.displayName : maskEmail(state.email))
    : (state.displayName || "Set name");
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
    detail.append(createElement("strong", "", booking ? booking.display_name : "Available"));
    detail.append(createElement("small", "", booking ? "Booked" : `${time}–${addMinutes(time, 30)}`));
    if (booking?.purpose && booking?.attendees) {
      const privateDetails = createElement("div", "booking-private");
      const purpose = createElement("span", "");
      purpose.append(createElement("b", "", "Purpose: "), booking.purpose);
      const attendees = createElement("span", "");
      attendees.append(createElement("b", "", "Attendees: "), booking.attendees);
      privateDetails.append(purpose, attendees);
      detail.append(privateDetails);
    }
    status.append(statusIcon, detail);

    let action;
    if (!booking) {
      action = createElement("button", "reserve-button", "Book");
      action.type = "button";
      action.addEventListener("click", () => openBookingDialog(time));
    } else if (booking.user_id === state.userId) {
      action = createElement("button", "cancel-button", "Cancel");
      action.type = "button";
      action.addEventListener("click", () => cancelBooking(booking));
    } else {
      action = createElement("span", "booked-label", "Unavailable");
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
  const requestedDate = state.selectedDate;
  const requestedResource = state.selectedResource;
  try {
    const bookings = await state.dataSource.list(requestedDate, requestedResource);
    if (requestedDate !== state.selectedDate || requestedResource !== state.selectedResource) return;
    state.bookings = bookings;
    renderSlots();
  } catch (error) {
    elements.slotList.replaceChildren(createElement("div", "error-state", "Could not load bookings. Please refresh and try again."));
    showToast(error.message || "Failed to load bookings", true);
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
  elements.bookingAttendees.value = "";
  elements.bookingSummary.textContent = `${resources[state.selectedResource].name}: ${formatDate(state.selectedDate)}, ${time}–${addMinutes(time, 30)}, booked by ${state.displayName}.`;
  elements.bookingDialog.showModal();
}

async function cancelBooking(booking) {
  if (!confirm(`Cancel the booking at ${booking.start_time.slice(0, 5)}?`)) return;
  try {
    await state.dataSource.remove(booking.id);
    showToast("Booking canceled");
    await refreshBookings();
  } catch (error) {
    showToast(error.message || "Failed to cancel booking", true);
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
    async list(date, resource) {
      return read().filter((booking) => booking.booking_date === date && (booking.resource || "meeting-room") === resource);
    },
    async add(booking) {
      const bookings = read();
      if (bookings.some((item) => (item.resource || "meeting-room") === booking.resource && item.booking_date === booking.booking_date && item.start_time === booking.start_time)) {
        throw new Error("This time slot was just booked. Please choose another time.");
      }
      bookings.push({ ...booking, id: crypto.randomUUID(), user_id: userId });
      write(bookings);
    },
    async remove(id) {
      const booking = read().find((item) => item.id === id);
      if (!booking || booking.user_id !== userId) throw new Error("You can only cancel your own bookings.");
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

  async function applySession(session) {
    state.userId = session.user.id;
    state.email = session.user.email || "";
    state.isEmailUser = Boolean(state.email);
    state.isAdmin = false;
    state.displayName = localStorage.getItem("booking-display-name") || "";

    if (state.isEmailUser) {
      const { data, error } = await client.from("booking_admins").select("display_name").eq("user_id", state.userId).maybeSingle();
      if (error) throw error;
      if (data) {
        state.isAdmin = true;
        state.displayName = data.display_name;
      }
    }
  }

  let { data: { session } } = await client.auth.getSession();
  if (!session) {
    const result = await client.auth.signInAnonymously();
    if (result.error) throw result.error;
    session = result.data.session;
  }
  await applySession(session);

  client.channel("booking-updates")
    .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => refreshBookings())
    .subscribe();

  return {
    async list(date, resource) {
      const { data, error } = await client.from("bookings").select("id, resource, booking_date, start_time, display_name, user_id").eq("booking_date", date).eq("resource", resource).order("start_time");
      if (error) throw error;
      if (data.length === 0) return data;
      const { data: details, error: detailsError } = await client.from("booking_details").select("booking_id, purpose, attendees").in("booking_id", data.map((booking) => booking.id));
      if (detailsError) throw detailsError;
      const detailByBooking = new Map(details.map((detail) => [detail.booking_id, detail]));
      return data.map((booking) => ({ ...booking, ...detailByBooking.get(booking.id) }));
    },
    async add(booking) {
      const { error } = await client.rpc("create_booking", {
        p_resource: booking.resource,
        p_booking_date: booking.booking_date,
        p_start_time: booking.start_time,
        p_display_name: booking.display_name,
        p_purpose: booking.purpose,
        p_attendees: booking.attendees
      });
      if (error?.code === "23505") throw new Error("This time slot was just booked. Please choose another time.");
      if (error) throw error;
    },
    async remove(id) {
      const { error, count } = await client.from("bookings").delete({ count: "exact" }).eq("id", id).eq("user_id", state.userId);
      if (error) throw error;
      if (count === 0) throw new Error("You can only cancel your own bookings.");
    },
    async sendMagicLink(email) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}${location.pathname}` }
      });
      if (error) throw error;
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      const result = await client.auth.signInAnonymously();
      if (result.error) throw result.error;
      await applySession(result.data.session);
    }
  };
}

async function initialize() {
  renderHeader();
  try {
    state.dataSource = isCloudConfigured ? await createCloudDataSource() : createLocalDataSource();
    renderHeader();
    await refreshBookings();
  } catch (error) {
    elements.slotList.replaceChildren(createElement("div", "error-state", "Could not connect to the booking service. Check the configuration and refresh."));
    showToast(error.message || "Initialization failed", true);
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
elements.resourceButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (button.dataset.resource === state.selectedResource) return;
    state.selectedResource = button.dataset.resource;
    localStorage.setItem("booking-resource", state.selectedResource);
    state.bookings = [];
    renderHeader();
    await refreshBookings();
  });
});
elements.identityButton.addEventListener("click", () => {
  if (!state.isEmailUser) {
    elements.displayName.value = state.displayName;
    elements.identityDialog.showModal();
    return;
  }
  elements.signedOutPanel.hidden = true;
  elements.signedInPanel.hidden = false;
  elements.accountName.textContent = state.isAdmin ? state.displayName : "Signed in";
  elements.accountEmail.textContent = state.email;
  elements.authDialog.showModal();
});
elements.adminSignInButton.addEventListener("click", () => {
  if (!isCloudConfigured) {
    showToast("Email sign-in requires Supabase configuration", true);
    return;
  }
  if (!state.dataSource) {
    showToast("The booking service is still loading. Please try again in a moment.");
    return;
  }
  elements.identityDialog.close();
  elements.signedOutPanel.hidden = false;
  elements.signedInPanel.hidden = true;
  elements.emailAddress.value = "";
  elements.emailStatus.textContent = "";
  elements.emailStatus.classList.remove("error");
  elements.authDialog.showModal();
});
elements.emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = elements.emailForm.querySelector('[type="submit"]');
  const email = elements.emailAddress.value.trim().toLowerCase();
  elements.emailStatus.textContent = "Sending sign-in link...";
  elements.emailStatus.classList.remove("error");
  submitButton.disabled = true;
  try {
    await state.dataSource.sendMagicLink(email);
    elements.emailStatus.textContent = `Request submitted for ${email}, but delivery is not confirmed. If it does not arrive, use a Supabase project team email or configure custom SMTP.`;
    showToast("Sign-in request submitted; delivery is not confirmed");
  } catch (error) {
    const normalizedMessage = error.message?.toLowerCase() || "";
    const message = normalizedMessage.includes("not authorized")
      ? "This address is not in the Supabase project team. Configure custom SMTP to email other addresses."
      : normalizedMessage.includes("rate limit")
      ? "Too many emails have been requested. Please wait and try again later."
      : (error.message || "Could not send sign-in link");
    elements.emailStatus.textContent = message;
    elements.emailStatus.classList.add("error");
  } finally {
    submitButton.disabled = false;
  }
});
elements.signOutButton.addEventListener("click", async () => {
  elements.signOutButton.disabled = true;
  try {
    await state.dataSource.signOut();
    renderHeader();
    elements.authDialog.close();
    showToast("Signed out. You can continue anonymously.");
    await refreshBookings();
  } catch (error) {
    showToast(error.message || "Could not sign out", true);
  } finally {
    elements.signOutButton.disabled = false;
  }
});
elements.identityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.displayName.value.trim();
  if (!name) return;
  state.displayName = name;
  localStorage.setItem("booking-display-name", name);
  renderHeader();
  elements.identityDialog.close();
  showToast("Name saved");
});
elements.bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = elements.bookingForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    const time = elements.bookingSlot.value;
    await state.dataSource.add({
      resource: state.selectedResource,
      booking_date: state.selectedDate,
      start_time: `${time}:00`,
      end_time: `${addMinutes(time, 30)}:00`,
      display_name: state.displayName,
      purpose: elements.bookingPurpose.value.trim(),
      attendees: elements.bookingAttendees.value.trim()
    });
    elements.bookingDialog.close();
    showToast("Booking confirmed");
    await refreshBookings();
  } catch (error) {
    showToast(error.message || "Booking failed", true);
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
