const config = window.BOOKING_CONFIG || {};
const isCloudConfigured = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
const bookingStartDate = "2026-11-29";
const bookingEndDate = "2026-12-02";
const bookingDates = ["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"];
const resources = [
  { id: "drx-evolution", name: "DRX Evolution", morningHost: "Joe Lu", afternoonHost: "TBD1" },
  { id: "compass-fmt", name: "Compass-FMT", morningHost: "Salvatore Cesaria", afternoonHost: "TBD2" },
  { id: "premium-performance-mobile", name: "New Premium Mobile & Performance Mobile", morningHost: "Felix Zhang", afternoonHost: "Antonio Cavallaro" },
  { id: "drx-revolution-rise", name: "DRX-Revolution & DRX-Rise", morningHost: "TBD3", afternoonHost: "TBD4" },
  { id: "dyna-c300", name: "Dyna-C300", morningHost: "Luke Li", afternoonHost: "TBD5" },
  { id: "detectors-retrofits", name: "Detectors & Retrofits", morningHost: "Marco Riolfo", afternoonHost: "TBD6" },
  { id: "eclipse-carestream-360", name: "Eclipse & Carestream 360", morningHost: "TBD7", afternoonHost: "TBD8" }
];
const resourceById = new Map(resources.map((resource) => [resource.id, resource]));

const elements = {
  roomName: document.querySelector("#room-name"),
  footerRoomName: document.querySelector("#footer-room-name"),
  resourceDescription: document.querySelector("#resource-description"),
  selectedDateLabel: document.querySelector("#selected-date-label"),
  timezoneNote: document.querySelector("#timezone-note"),
  datePicker: document.querySelector("#date-picker"),
  previousDay: document.querySelector("#previous-day"),
  nextDay: document.querySelector("#next-day"),
  todayButton: document.querySelector("#today-button"),
  refreshButton: document.querySelector("#refresh-button"),
  exportButton: document.querySelector("#export-button"),
  slotList: document.querySelector("#slot-list"),
  overviewHeader: document.querySelector("#overview-header"),
  overviewPage: document.querySelector("#overview-page"),
  overviewFooter: document.querySelector("#overview-footer"),
  appointmentPage: document.querySelector("#appointment-page"),
  appointmentBack: document.querySelector("#appointment-back"),
  identityButton: document.querySelector("#identity-button"),
  identityLabel: document.querySelector("#identity-label"),
  avatar: document.querySelector("#avatar"),
  authDialog: document.querySelector("#auth-dialog"),
  signedOutPanel: document.querySelector("#signed-out-panel"),
  signedInPanel: document.querySelector("#signed-in-panel"),
  adminLoginForm: document.querySelector("#admin-login-form"),
  adminUsername: document.querySelector("#admin-username"),
  adminPassword: document.querySelector("#admin-password"),
  authStatus: document.querySelector("#auth-status"),
  accountName: document.querySelector("#account-name"),
  accountEmail: document.querySelector("#account-email"),
  signOutButton: document.querySelector("#sign-out-button"),
  identityDialog: document.querySelector("#identity-dialog"),
  identityForm: document.querySelector("#identity-form"),
  displayName: document.querySelector("#display-name"),
  adminSignInButton: document.querySelector("#admin-signin-button"),
  bookingForm: document.querySelector("#booking-form"),
  bookingSlot: document.querySelector("#booking-slot"),
  summaryBooth: document.querySelector("#summary-booth"),
  summaryHost: document.querySelector("#summary-host"),
  summaryDate: document.querySelector("#summary-date"),
  summaryTime: document.querySelector("#summary-time"),
  customerFirstName: document.querySelector("#customer-first-name"),
  customerLastName: document.querySelector("#customer-last-name"),
  customerCompany: document.querySelector("#customer-company"),
  customerPosition: document.querySelector("#customer-position"),
  customerCountry: document.querySelector("#customer-country"),
  customerEmail: document.querySelector("#customer-email"),
  contactEmail: document.querySelector("#contact-email"),
  contactEmailNa: document.querySelector("#contact-email-na"),
  bookingPurpose: document.querySelector("#booking-purpose"),
  toast: document.querySelector("#toast")
};

const state = {
  selectedDate: bookingStartDate,
  selectedResource: resources[0].id,
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

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateString}T12:00:00Z`));
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
  elements.roomName.textContent = "Carestream";
  elements.footerRoomName.textContent = "Carestream Exhibition Booths";
  document.title = "Carestream Exhibition Booking";
  elements.timezoneNote.textContent = `Booth hours 08:30–17:30${isCloudConfigured ? "" : " · Local demo"}`;
  elements.selectedDateLabel.textContent = formatDate(state.selectedDate);
  elements.todayButton.textContent = formatShortDate(state.selectedDate);
  elements.datePicker.value = state.selectedDate;
  elements.previousDay.disabled = state.selectedDate <= bookingStartDate;
  elements.nextDay.disabled = state.selectedDate >= bookingEndDate;
  elements.exportButton.hidden = !state.isAdmin;
  elements.identityLabel.textContent = state.isEmailUser
    ? (state.isAdmin ? state.displayName : maskEmail(state.email))
    : (state.displayName || "Set name");
  elements.avatar.textContent = state.displayName ? Array.from(state.displayName)[0] : "?";
}

function renderSlots() {
  elements.slotList.replaceChildren();
  const bookingBySlot = new Map(state.bookings.map((booking) => [`${booking.resource}:${booking.start_time.slice(0, 5)}`, booking]));

  resources.forEach((resource, cardIndex) => {
    const card = createElement("article", "booth-card");
    card.style.animationDelay = `${cardIndex * 45}ms`;
    card.append(createElement("h2", "booth-title", resource.name));

    [[resource.morningHost, slotTimes().filter((time) => time < "13:00")], [resource.afternoonHost, slotTimes().filter((time) => time >= "13:00")]].forEach(([host, times]) => {
      const section = createElement("section", "host-section");
      section.append(createElement("h3", "host-name", host));
      times.forEach((time) => {
        const booking = bookingBySlot.get(`${resource.id}:${time}`);
        const row = createElement("div", `booth-slot ${booking ? "is-booked" : "is-available"}`);
        row.append(createElement("span", "booth-slot-time", `${time}–${addMinutes(time, 30)}`));
        row.append(createElement("span", "booth-slot-status", booking ? booking.display_name : ""));
        let action;
        if (!booking) {
          action = createElement("button", "reserve-button", "Book");
          action.type = "button";
          action.addEventListener("click", () => openBookingDialog(resource.id, time));
        } else if (booking.user_id === state.userId) {
          action = createElement("button", "cancel-button", "Cancel");
          action.type = "button";
          action.addEventListener("click", () => cancelBooking(booking));
        } else {
          action = createElement("span", "booked-label", "Booked");
        }
        row.append(action);
        const canViewDetails = state.isAdmin || booking?.user_id === state.userId;
        if (canViewDetails && (booking?.purpose || booking?.attendees || booking?.customer_email)) {
          const details = createElement("div", "booking-details");
          details.append(createElement("strong", "booking-details-title", "Booking details"));
          details.append(createElement("span", "", `Customer: ${[booking.customer_first_name, booking.customer_last_name].filter(Boolean).join(" ") || booking.attendees || ""}`));
          details.append(createElement("span", "", `Company: ${booking.company || ""}`));
          details.append(createElement("span", "", `Position: ${booking.position_title || ""}`));
          details.append(createElement("span", "", `Country: ${booking.country || ""}`));
          details.append(createElement("span", "", `Customer email: ${booking.customer_email || ""}`));
          details.append(createElement("span", "", `Carestream contact: ${booking.contact_email || "N/A"}`));
          details.append(createElement("span", "", `Notes: ${booking.purpose || ""}`));
          row.append(details);
        }
        section.append(row);
      });
      card.append(section);
    });
    elements.slotList.append(card);
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

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

async function exportBookings() {
  if (!state.isAdmin) return;
  elements.exportButton.disabled = true;
  try {
    const dailyBookings = await Promise.all(bookingDates.map((date) => (
      state.dataSource.list(date, resources.map((resource) => resource.id))
    )));
    const bookings = dailyBookings.flat().sort((first, second) => (
      first.booking_date.localeCompare(second.booking_date)
      || first.start_time.localeCompare(second.start_time)
      || first.resource.localeCompare(second.resource)
    ));
    const headings = ["Date", "Time", "Booth", "Booth host", "Booked by", "Customer first name", "Customer last name", "Company", "Position", "Country", "Customer email", "Carestream contact email", "Schedule your appointment"];
    const rows = bookings.map((booking) => {
      const resource = resourceById.get(booking.resource);
      const startTime = booking.start_time.slice(0, 5);
      const host = startTime < "13:00" ? resource?.morningHost : resource?.afternoonHost;
      return [
        booking.booking_date,
        `${startTime}-${addMinutes(startTime, 30)}`,
        resource?.name || booking.resource,
        host || "",
        booking.display_name || "",
        booking.customer_first_name || "",
        booking.customer_last_name || "",
        booking.company || "",
        booking.position_title || "",
        booking.country || "",
        booking.customer_email || "",
        booking.contact_email || "",
        booking.purpose || ""
      ];
    });
    const csv = `\uFEFF${[headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "carestream-rsna-bookings.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${bookings.length} bookings`);
  } catch (error) {
    showToast(error.message || "Export failed", true);
  } finally {
    elements.exportButton.disabled = false;
  }
}

async function refreshBookings() {
  setLoading(true);
  const requestedDate = state.selectedDate;
  try {
    const bookings = await state.dataSource.list(requestedDate, resources.map((resource) => resource.id));
    if (requestedDate !== state.selectedDate) return;
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

function showOverview() {
  elements.appointmentPage.hidden = true;
  elements.overviewHeader.hidden = false;
  elements.overviewPage.hidden = false;
  elements.overviewFooter.hidden = false;
  window.scrollTo(0, 0);
}

function openBookingDialog(resourceId, time) {
  state.selectedResource = resourceId;
  const resource = resourceById.get(resourceId);
  const boothHost = time < "13:00" ? resource.morningHost : resource.afternoonHost;
  elements.bookingSlot.value = time;
  elements.bookingForm.reset();
  elements.bookingSlot.value = time;
  elements.contactEmail.disabled = false;
  elements.contactEmail.required = true;
  elements.bookingPurpose.value = "";
  elements.summaryBooth.textContent = resource.name;
  elements.summaryHost.textContent = boothHost;
  elements.summaryDate.textContent = formatDate(state.selectedDate);
  elements.summaryTime.textContent = `${time} - ${addMinutes(time, 30)}`;
  elements.overviewHeader.hidden = true;
  elements.overviewPage.hidden = true;
  elements.overviewFooter.hidden = true;
  elements.appointmentPage.hidden = false;
  window.scrollTo(0, 0);
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
  const storageKey = "carestream-booth-demo-bookings";
  const userKey = "carestream-booth-demo-user";
  let userId = localStorage.getItem(userKey);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(userKey, userId);
  }
  state.userId = userId;

  const read = () => JSON.parse(localStorage.getItem(storageKey) || "[]");
  const write = (bookings) => localStorage.setItem(storageKey, JSON.stringify(bookings));
  return {
    async list(date, resourceIds) {
      return read().filter((booking) => booking.booking_date === date && resourceIds.includes(booking.resource));
    },
    async add(booking) {
      const bookings = read();
      if (bookings.some((item) => item.resource === booking.resource && item.booking_date === booking.booking_date && item.start_time === booking.start_time)) {
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
      if (data?.display_name === "Fiona") {
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
    async list(date, resourceIds) {
      const { data, error } = await client.from("bookings").select("id, resource, booking_date, start_time, display_name, user_id").eq("booking_date", date).in("resource", resourceIds).order("start_time");
      if (error) throw error;
      if (data.length === 0) return data;
      const { data: details, error: detailsError } = await client.from("booking_details").select("booking_id, purpose, attendees, products, customer_first_name, customer_last_name, company, position_title, country, customer_email, contact_email").in("booking_id", data.map((booking) => booking.id));
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
        p_attendees: booking.attendees,
        p_products: booking.products,
        p_customer_first_name: booking.customer_first_name,
        p_customer_last_name: booking.customer_last_name,
        p_company: booking.company,
        p_position_title: booking.position_title,
        p_country: booking.country,
        p_customer_email: booking.customer_email,
        p_contact_email: booking.contact_email
      });
      if (error?.code === "23505") throw new Error("This time slot was just booked. Please choose another time.");
      if (error?.code === "23514" && error.message?.includes("bookings_valid_resource")) {
        throw new Error("The booking database needs the latest booth update. Please ask the administrator to run supabase.sql.");
      }
      if (error) throw error;
    },
    async remove(id) {
      const { error, count } = await client.from("bookings").delete({ count: "exact" }).eq("id", id).eq("user_id", state.userId);
      if (error) throw error;
      if (count === 0) throw new Error("You can only cancel your own bookings.");
    },
    async signInAdmin(username, password) {
      const email = `${username.trim().toLowerCase()}@booking.example`;
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await applySession(data.session);
      if (!state.isAdmin) {
        await client.auth.signOut();
        const anonymousResult = await client.auth.signInAnonymously();
        if (anonymousResult.error) throw anonymousResult.error;
        await applySession(anonymousResult.data.session);
        throw new Error("This account is not an administrator.");
      }
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
elements.datePicker.addEventListener("change", async (event) => {
  if (!event.target.value) return;
  if (event.target.value < bookingStartDate || event.target.value > bookingEndDate) return;
  state.selectedDate = event.target.value;
  renderHeader();
  await refreshBookings();
});
elements.refreshButton.addEventListener("click", refreshBookings);
elements.exportButton.addEventListener("click", exportBookings);
elements.appointmentBack.addEventListener("click", showOverview);
elements.contactEmailNa.addEventListener("change", () => {
  elements.contactEmail.disabled = elements.contactEmailNa.checked;
  elements.contactEmail.required = !elements.contactEmailNa.checked;
  if (elements.contactEmailNa.checked) elements.contactEmail.value = "";
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
    showToast("Administrator sign-in requires Supabase configuration", true);
    return;
  }
  if (!state.dataSource) {
    showToast("The booking service is still loading. Please try again in a moment.");
    return;
  }
  elements.identityDialog.close();
  elements.signedOutPanel.hidden = false;
  elements.signedInPanel.hidden = true;
  elements.adminUsername.value = "";
  elements.adminPassword.value = "";
  elements.authStatus.textContent = "";
  elements.authStatus.classList.remove("error");
  elements.authDialog.showModal();
});
elements.adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = elements.adminLoginForm.querySelector('[type="submit"]');
  const username = elements.adminUsername.value;
  const password = elements.adminPassword.value;
  elements.authStatus.textContent = "Signing in...";
  elements.authStatus.classList.remove("error");
  submitButton.disabled = true;
  try {
    await state.dataSource.signInAdmin(username, password);
    renderHeader();
    elements.authDialog.close();
    showToast(`Signed in as ${state.displayName}`);
    await refreshBookings();
  } catch (error) {
    const message = error.message?.toLowerCase().includes("invalid login credentials")
      ? "Incorrect administrator or password."
      : (error.message || "Could not sign in");
    elements.authStatus.textContent = message;
    elements.authStatus.classList.add("error");
  } finally {
    elements.adminPassword.value = "";
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
    const customerName = `${elements.customerFirstName.value.trim()} ${elements.customerLastName.value.trim()}`;
    await state.dataSource.add({
      resource: state.selectedResource,
      booking_date: state.selectedDate,
      start_time: `${time}:00`,
      end_time: `${addMinutes(time, 30)}:00`,
      display_name: state.displayName.slice(0, 40),
      purpose: elements.bookingPurpose.value.trim(),
      attendees: customerName,
      products: [],
      customer_first_name: elements.customerFirstName.value.trim(),
      customer_last_name: elements.customerLastName.value.trim(),
      company: elements.customerCompany.value.trim(),
      position_title: elements.customerPosition.value.trim(),
      country: elements.customerCountry.value.trim(),
      customer_email: elements.customerEmail.value.trim(),
      contact_email: elements.contactEmailNa.checked ? null : elements.contactEmail.value.trim()
    });
    showOverview();
    renderHeader();
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
