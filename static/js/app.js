
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const money = (n) => "₹" + Number(n).toLocaleString("en-IN", {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});

function message(id, text, success = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("success", success);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? {"Content-Type": "application/json"} : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function showToast(text) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.classList.remove("show"), 3000);
}

/* Theme preference */
function setTheme(dark) {
  document.body.classList.toggle("dark-mode", dark);
  localStorage.setItem("fivpay-theme", dark ? "dark" : "light");
}
setTheme(localStorage.getItem("fivpay-theme") === "dark");

$("#themeButton")?.addEventListener("click", () => {
  setTheme(!document.body.classList.contains("dark-mode"));
});

/* Login and registration page */
let registerMode = false;

$("#switchMode")?.addEventListener("click", () => {
  registerMode = !registerMode;
  $("#nameField").classList.toggle("hidden", !registerMode);
  $("#name").required = registerMode;
  $("#formEyebrow").textContent = registerMode ? "GET STARTED" : "WELCOME BACK";
  $("#formTitle").textContent = registerMode ? "Create your account" : "Sign in to FivPay";
  $("#formSubtitle").textContent = registerMode
    ? "Set up your demo account in a few steps."
    : "Enter your details to access your dashboard.";
  $("#authSubmit").textContent = registerMode ? "Create account →" : "Sign in →";
  $("#switchText").textContent = registerMode ? "Already registered?" : "New to FivPay?";
  $("#switchMode").textContent = registerMode ? "Sign in" : "Create account";
  $("#password").autocomplete = registerMode ? "new-password" : "current-password";
  message("#authMessage", "");
});

$("#togglePassword")?.addEventListener("click", () => {
  const input = $("#password");
  input.type = input.type === "password" ? "text" : "password";
  $("#togglePassword").textContent = input.type === "password" ? "Show" : "Hide";
});

$("#authForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: $("#name").value.trim(),
    email: $("#email").value.trim(),
    password: $("#password").value
  };
  try {
    const result = await api(registerMode ? "/api/register" : "/api/login", {
      method: "POST", body: JSON.stringify(payload)
    });
    message("#authMessage", result.message, true);
    window.location.assign(result.redirect);
  } catch (error) {
    message("#authMessage", error.message);
  }
});

/* Dashboard */
let me = null;
let scanner = null;
let scannerRunning = false;

function initials(name) {
  return name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function showSection(key) {
  const section = $(`#${key}Section`);
  if (!section) return;
  $$(".content-section").forEach(el => el.classList.remove("visible"));
  section.classList.add("visible");
  $$(".side-link[data-section]").forEach(el =>
    el.classList.toggle("active", el.dataset.section === key)
  );
  $("#pageBreadcrumb").textContent = ({
    overview: "Overview", payments: "Pay someone", qr: "QR payments",
    activity: "Transactions", profile: "My profile"
  })[key] || "Overview";
  $("#sidebar")?.classList.remove("open");
  if (key === "activity") loadTransactions();
  if (key === "qr") makeQR();
  window.scrollTo({top: 0, behavior: "smooth"});
}

$$("[data-section]").forEach(button => button.addEventListener("click", () => {
  showSection(button.dataset.section);
}));
$$("[data-go]").forEach(button => button.addEventListener("click", () => {
  showSection(button.dataset.go);
}));
$("#menuButton")?.addEventListener("click", () => $("#sidebar").classList.toggle("open"));

async function loadProfile() {
  me = await api("/api/me");
  $("#welcomeName").textContent = me.name;
  $("#topAvatar").textContent = initials(me.name);
  $("#accountName").textContent = me.name;
  $("#accountValue").textContent = me.account_no;
  $("#accountShort").textContent = me.account_no;
  $("#balanceValue").textContent = money(me.balance);
  $("#profileAvatar").textContent = initials(me.name);
  $("#profileName").value = me.name;
  $("#profileEmail").value = me.email;
  $("#profileAccount").value = me.account_no;
  await loadTransactions();
}

async function loadTransactions() {
  const rows = await api("/api/transactions");
  const today = new Date().toISOString().slice(0, 10);
  $("#todayCount").textContent = rows.filter(row =>
    row.created_at && row.created_at.slice(0, 10) === today
  ).length;

  const html = rows.map(row => {
    const received = row.type === "received";
    const person = received ? row.sender : row.receiver;
    const date = row.created_at ? new Date(row.created_at + "Z").toLocaleString() : "";
    return `<tr>
      <td><strong>${escapeHTML(person)}</strong><br>
        <span class="muted">${escapeHTML(row.note || "Demo transfer")}</span></td>
      <td>${escapeHTML(date)}</td>
      <td>${received ? "Received" : "Sent"}</td>
      <td class="amount-cell ${received ? "credit" : "debit"}">
        ${received ? "+" : "−"}${money(row.amount)}
      </td></tr>`;
  }).join("");

  $("#recentRows").innerHTML = html || '<tr><td colspan="4">No transactions yet.</td></tr>';
  $("#allRows").innerHTML = html || '<tr><td colspan="4">No transactions yet.</td></tr>';
  if (me) {
    const fresh = await api("/api/me");
    me.balance = fresh.balance;
    $("#balanceValue").textContent = money(fresh.balance);
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

$("#profileForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await api("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({name: $("#profileName").value.trim()})
    });
    message("#profileMessage", "Profile name updated.", true);
    await loadProfile();
    showToast("Profile updated.");
  } catch (error) {
    message("#profileMessage", error.message);
  }
});

$("#payForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const account_no = $("#payAccount").value.trim();
  const amount = Number($("#payAmount").value);
  const note = $("#payNote").value.trim();

  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
    message("#payMessage", "Enter an amount between ₹1 and ₹1,00,000.");
    return;
  }

  if (!confirm(`Confirm demo payment of ${money(amount)} to ${account_no}?`)) return;

  try {
    const result = await api("/api/pay", {
      method: "POST",
      body: JSON.stringify({account_no, amount, note})
    });
    message("#payMessage", result.message, true);
    $("#payForm").reset();
    await loadProfile();
    showToast("Demo payment recorded.");
  } catch (error) {
    message("#payMessage", error.message);
  }
});

$("#copyAccount")?.addEventListener("click", async () => {
  if (!me) return;
  try {
    await navigator.clipboard.writeText(me.account_no);
    showToast("Account number copied.");
  } catch {
    showToast("Copy not available in this browser.");
  }
});

/* Generate a QR containing the demo account number */
function makeQR() {
  if (!me || !$("#qrOutput")) return;
  $("#qrOutput").innerHTML = "";
  if (typeof QRCode === "undefined") {
    $("#qrOutput").textContent = "QR library could not load. Check your internet connection.";
    return;
  }
  new QRCode($("#qrOutput"), {
    text: `FIVPAY:${me.account_no}`,
    width: 180, height: 180,
    correctLevel: QRCode.CorrectLevel.M
  });
}
$("#makeQr")?.addEventListener("click", makeQR);

/* Scan QR. A scanned code only fills the account field; user confirms payment. */
$("#startScanner")?.addEventListener("click", async () => {
  if (typeof Html5Qrcode === "undefined") {
    message("#scanMessage", "Scanner library unavailable. Check your internet connection.");
    return;
  }
  if (scannerRunning) return;

  scanner = new Html5Qrcode("qrReader");
  try {
    await scanner.start(
      {facingMode: "environment"},
      {fps: 10, qrbox: {width: 220, height: 220}},
      async decodedText => {
        const account = decodedText.startsWith("FIVPAY:")
          ? decodedText.slice(7).trim()
          : "";
        if (!account) {
          message("#scanMessage", "This QR is not a FivPay demo QR.");
          return;
        }
        $("#payAccount").value = account;
        message("#scanMessage", "Account number scanned. Review the details before paying.", true);
        showSection("payments");
        await stopScanner();
      },
      () => {}
    );
    scannerRunning = true;
    message("#scanMessage", "Camera scanner started. Point it at a FivPay demo QR.");
  } catch (error) {
    scanner.clear().catch(() => {});
    scanner = null;
    message("#scanMessage", "Camera unavailable. Allow camera access and use localhost or HTTPS.");
  }
});

async function stopScanner() {
  if (!scanner) return;
  try {
    if (scannerRunning) await scanner.stop();
    await scanner.clear();
  } catch {}
  scannerRunning = false;
  scanner = null;
}
$("#stopScanner")?.addEventListener("click", stopScanner);

$("#logoutButton")?.addEventListener("click", async () => {
  await stopScanner();
  try {
    const result = await api("/api/logout", {method: "POST"});
    window.location.assign(result.redirect);
  } catch {
    window.location.assign("/");
  }
});

/* Only execute dashboard initialization on dashboard.html */
if ($("#overviewSection")) {
  loadProfile().catch(() => window.location.replace("/"));
}
