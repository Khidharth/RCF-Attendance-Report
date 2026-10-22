// script.js: everything the public page does, in one file.
//   Part 1: dark/light theme toggle
//   Part 2: registration form (validation + saving through Supabase)
// Settings you edit live in supabase-config.js, which loads before this file.

// ======================================================================================
// PART 1: THEME TOGGLE
// The <head> of index.html already applied the saved theme before the page painted.
// This part only wires up the button.
// ======================================================================================
(function () {
  var root = document.documentElement;
  var button = document.getElementById("theme-toggle");
  if (!button) return;
  var icon = document.getElementById("theme-toggle-icon");
  var text = document.getElementById("theme-toggle-text");

  function render(theme) {
    var isDark = theme === "dark";
    // The button always names the mode you will switch TO.
    button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    button.setAttribute("aria-pressed", String(!isDark));
    if (icon) icon.textContent = isDark ? "☀" : "☾";
    if (text) text.textContent = isDark ? "Light" : "Dark";
  }

  render(root.getAttribute("data-theme") || "dark");

  button.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("rcf-theme", next); } catch (e) {}
    render(next);
  });
})();

// ======================================================================================
// PART 2: REGISTRATION FORM
// Talks to Supabase ONLY through the register_member() database function
// (see supabase/schema.sql).
// ======================================================================================
(function () {
  var config = window.RCF_CONFIG || {};
  var form = document.getElementById("registration-form");
  var submitBtn = document.getElementById("submit-btn");
  var formError = document.getElementById("form-error");
  var successSection = document.getElementById("success-section");
  var registerSection = document.getElementById("register-section");
  var welcomeSection = document.getElementById("welcome");

  // ---- Small setup: year, date display, level options ---------------------------------
  document.getElementById("year").textContent = new Date().getFullYear();

  // Display only. The real saved date is set by the database in the Africa/Lagos timezone.
  document.getElementById("reg-date").value = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeZone: config.TIMEZONE || "Africa/Lagos",
  }).format(new Date());

  var levelSelect = document.getElementById("level");
  (config.LEVELS || []).forEach(function (levelName) {
    var option = document.createElement("option");
    option.value = levelName;
    option.textContent = levelName; // textContent = safe, never inserts HTML
    levelSelect.appendChild(option);
  });

  // ---- Supabase client ----------------------------------------------------------------
  var configured =
    config.SUPABASE_URL && config.SUPABASE_ANON_KEY &&
    config.SUPABASE_URL.indexOf("PASTE_") !== 0 && config.SUPABASE_ANON_KEY.indexOf("PASTE_") !== 0;

  var client = null;
  if (configured && window.supabase) {
    client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  }

  // ---- One token per form. A double click or retry reuses it, so no duplicate rows. ---
  var submissionToken = crypto.randomUUID();
  var isSubmitting = false;

  // ---- Validation ---------------------------------------------------------------------
  var fields = {
    full_name: { input: "full-name", error: "full-name-error" },
    level: { input: "level", error: "level-error" },
    phone: { input: "phone", error: "phone-error" },
    department: { input: "department", error: "department-error" },
    gender: { input: "gender", error: "gender-error" },
    category: { input: "category", error: "category-error" },
  };

  function setFieldError(key, message) {
    var el = document.getElementById(fields[key].error);
    var input = document.getElementById(fields[key].input);
    if (message) {
      el.textContent = message;
      el.hidden = false;
      input.setAttribute("aria-invalid", "true");
    } else {
      el.textContent = "";
      el.hidden = true;
      input.removeAttribute("aria-invalid");
    }
  }

  function readValues() {
    return {
      full_name: document.getElementById("full-name").value.trim(),
      level: document.getElementById("level").value,
      phone: document.getElementById("phone").value.trim(),
      department: document.getElementById("department").value.trim(),
      gender: document.getElementById("gender").value,
      category: document.getElementById("category").value,
    };
  }

  // Returns true if everything is valid. The database checks the same rules again.
  function validate(v) {
    var ok = true;
    function fail(key, msg) { setFieldError(key, msg); ok = false; }
    Object.keys(fields).forEach(function (k) { setFieldError(k, ""); });

    if (v.full_name.length < 2) fail("full_name", "Please enter your full name.");
    if (!v.level) fail("level", "Please choose your level.");
    if (!v.department) fail("department", "Please enter your department.");
    if (!v.gender) fail("gender", "Please choose an option.");
    if (!v.category) fail("category", "Please choose a category.");

    if (v.phone) {
      // Accept spaces, dashes, brackets and a leading +; require at least 7 digits.
      var digits = v.phone.replace(/\D/g, "");
      if (!/^[0-9+()\s-]{7,25}$/.test(v.phone) || digits.length < 7) {
        fail("phone", "Please enter a valid phone number, or leave it blank.");
      }
    }
    return ok;
  }

  function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
    formError.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function setBusy(busy) {
    isSubmitting = busy;
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? "Submitting…" : "Submit Registration";
  }

  // ---- Submit -------------------------------------------------------------------------
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (isSubmitting) return; // ignore repeated clicks
    formError.hidden = true;

    var values = readValues();
    if (!validate(values)) {
      var firstBad = form.querySelector("[aria-invalid='true']");
      if (firstBad) firstBad.focus();
      return;
    }

    if (!client) {
      showFormError("Registration is not available right now. Please tell a church worker.");
      return;
    }

    setBusy(true);
    try {
      var result = await client.rpc("register_member", {
        p_full_name: values.full_name,
        p_level: values.level,
        p_phone: values.phone || null,
        p_department: values.department,
        p_gender: values.gender,
        p_category: values.category,
        p_client_token: submissionToken,
      });

      // Success is shown ONLY when the database says it saved (no error, ok === true).
      if (result.error || !result.data || result.data.ok !== true) {
        console.error("Registration failed:", result.error);
        showFormError(
          "We couldn't save your registration. Please check your connection and try again. " +
          "Your details are still on this page."
        );
        setBusy(false);
        return;
      }

      form.reset();
      submissionToken = crypto.randomUUID(); // fresh token for the next person
      registerSection.hidden = true;
      welcomeSection.hidden = true;
      successSection.hidden = false;
      successSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setBusy(false);
    } catch (err) {
      console.error("Registration error:", err);
      showFormError("Something went wrong while saving. Please try again.");
      setBusy(false);
    }
  });

  document.getElementById("register-another").addEventListener("click", function () {
    successSection.hidden = true;
    welcomeSection.hidden = false;
    registerSection.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
