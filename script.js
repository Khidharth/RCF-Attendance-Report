// script.js: everything the public page does, in one file.
//   Part 1: dark/light theme toggle
//   Part 2: screen navigation (Welcome -> Registration -> Confirmation)
//   Part 3: registration form (validation + saving through Supabase)
// Settings you edit live in supabase-config.js, which loads before this file.

var config = window.RCF_CONFIG || {};

// ======================================================================================
// PART 1: THEME TOGGLE
// The <head> of index.html already applied the saved theme before the page painted.
// This part only wires up the button.
// ======================================================================================
(function () {
  var root = document.documentElement;
  var button = document.getElementById("theme-toggle");
  var icon = document.getElementById("theme-toggle-icon");
  var text = document.getElementById("theme-toggle-text");

  function render(theme) {
    var isDark = theme === "dark";
    // The button always names the mode you will switch TO.
    button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    button.setAttribute("aria-pressed", String(!isDark));
    icon.textContent = isDark ? "☀" : "☾";
    text.textContent = isDark ? "Light" : "Dark";
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
// PART 2: SCREEN NAVIGATION
// The page has three screens. The URL hash chooses which one is visible:
//   #home (default), #register, #success
// The registration form is hidden until the visitor presses "Register Now".
// The Back button of the browser works because each screen is its own hash.
// ======================================================================================
var justRegistered = false; // #success is only allowed right after a saved registration

(function () {
  var views = {
    home: document.getElementById("view-home"),
    register: document.getElementById("view-register"),
    success: document.getElementById("view-success"),
  };
  var navLinks = document.querySelectorAll("[data-nav]");

  function currentRoute() {
    var name = window.location.hash.replace("#", "");
    if (!views[name]) return "home";
    if (name === "success" && !justRegistered) return "home"; // can't open the confirmation directly
    return name;
  }

  function show(route, moveFocus) {
    Object.keys(views).forEach(function (name) {
      views[name].hidden = name !== route;
    });
    navLinks.forEach(function (link) {
      if (link.getAttribute("data-nav") === route) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.title = views[route].getAttribute("data-title");
    if (route !== "success") justRegistered = false;

    window.scrollTo(0, 0);
    if (moveFocus) {
      // Moving focus to the new heading lets screen readers announce the screen change.
      var heading = views[route].querySelector("h1, h2");
      if (heading) heading.focus({ preventScroll: true });
    }
  }

  window.addEventListener("hashchange", function () { show(currentRoute(), true); });

  // Used by Part 3 to open the confirmation screen.
  window.rcfGoTo = function (name) {
    if (window.location.hash === "#" + name) show(name, true);
    else window.location.hash = "#" + name;
  };

  // If someone opens the page at #success directly, tidy the URL back to #home.
  if (window.location.hash === "#success") history.replaceState(null, "", "#home");
  show(currentRoute(), false);
})();

// ======================================================================================
// PART 3: REGISTRATION FORM
// Talks to Supabase ONLY through the register_member() database function
// (see supabase/schema.sql).
// ======================================================================================
(function () {
  var form = document.getElementById("registration-form");
  var submitBtn = document.getElementById("submit-btn");
  var formError = document.getElementById("form-error");

  // ---- Small setup: year, date display, level options, privacy dialog ----------------
  document.getElementById("year").textContent = new Date().getFullYear();

  // Display only. The real saved date is set by the database in the Africa/Lagos timezone.
  document.getElementById("reg-date").textContent = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeZone: config.TIMEZONE || "Africa/Lagos",
  }).format(new Date());

  var levelSelect = document.getElementById("level");
  (config.LEVELS || []).forEach(function (levelName) {
    var option = document.createElement("option");
    option.value = levelName;
    option.textContent = levelName; // textContent is safe: it never inserts HTML
    levelSelect.appendChild(option);
  });

  var privacyDialog = document.getElementById("privacy-dialog");
  document.querySelectorAll("[data-open-privacy]").forEach(function (btn) {
    btn.addEventListener("click", function () { privacyDialog.showModal(); });
  });
  privacyDialog.addEventListener("click", function (e) {
    if (e.target === privacyDialog) privacyDialog.close(); // click on the dark backdrop closes it
  });

  // ---- Supabase client ---------------------------------------------------------------
  var configured =
    config.SUPABASE_URL && config.SUPABASE_ANON_KEY &&
    config.SUPABASE_URL.indexOf("PASTE_") !== 0 && config.SUPABASE_ANON_KEY.indexOf("PASTE_") !== 0;

  var client = null;
  if (configured && window.supabase) {
    client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  }

  // ---- One token per form. A double click or retry reuses it, so no duplicate rows. --
  var submissionToken = crypto.randomUUID();
  var isSubmitting = false;

  // ---- Validation --------------------------------------------------------------------
  var fieldKeys = ["full_name", "phone", "level", "department", "gender", "category"];
  var errorIds = {
    full_name: "full-name-error", phone: "phone-error", level: "level-error",
    department: "department-error", gender: "gender-error", category: "category-error",
  };

  function wrapperFor(key) { return form.querySelector('[data-field="' + key + '"]'); }

  function setFieldError(key, message) {
    var wrapper = wrapperFor(key);
    var errorEl = document.getElementById(errorIds[key]);
    var control = wrapper.querySelector("input[type='text'], input[type='tel'], select");
    if (message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      wrapper.classList.add("has-error");
      if (control) control.setAttribute("aria-invalid", "true");
    } else {
      errorEl.textContent = "";
      errorEl.hidden = true;
      wrapper.classList.remove("has-error");
      if (control) control.removeAttribute("aria-invalid");
    }
  }

  function checkedValue(name) {
    var checked = form.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : "";
  }

  function readValues() {
    return {
      full_name: document.getElementById("full-name").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      level: document.getElementById("level").value,
      department: document.getElementById("department").value.trim(),
      gender: checkedValue("gender"),
      category: checkedValue("registration_category"),
    };
  }

  // Returns the key of the first invalid field, or null when everything is fine.
  // The database checks the same rules again, so this is for friendliness, not security.
  function validate(v) {
    var firstBad = null;
    function fail(key, msg) { setFieldError(key, msg); if (!firstBad) firstBad = key; }
    fieldKeys.forEach(function (k) { setFieldError(k, ""); });

    if (v.full_name.length < 2) fail("full_name", "Please enter your full name.");
    if (v.phone) {
      // Accept spaces, dashes, brackets and a leading +; require at least 7 digits.
      var digits = v.phone.replace(/\D/g, "");
      if (!/^[0-9+()\s-]{7,25}$/.test(v.phone) || digits.length < 7) {
        fail("phone", "Please enter a valid phone number, or leave it blank.");
      }
    }
    if (!v.level) fail("level", "Please choose your level.");
    if (!v.department) fail("department", "Please enter your department.");
    if (!v.gender) fail("gender", "Please choose an option.");
    if (!v.category) fail("category", "Please choose a category.");
    return firstBad;
  }

  // Clear a field's error as soon as the visitor changes it.
  form.addEventListener("input", clearErrorFor);
  form.addEventListener("change", clearErrorFor);
  function clearErrorFor(event) {
    var wrapper = event.target.closest("[data-field]");
    if (wrapper && wrapper.classList.contains("has-error")) setFieldError(wrapper.getAttribute("data-field"), "");
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

  // ---- Submit ------------------------------------------------------------------------
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (isSubmitting) return; // ignore repeated clicks
    formError.hidden = true;

    var values = readValues();
    var badKey = validate(values);
    if (badKey) {
      var firstControl = wrapperFor(badKey).querySelector("input, select");
      if (firstControl) firstControl.focus();
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
      setBusy(false);
      justRegistered = true;
      window.rcfGoTo("success");
    } catch (err) {
      console.error("Registration error:", err);
      showFormError("Something went wrong while saving. Please try again.");
      setBusy(false);
    }
  });
})();
