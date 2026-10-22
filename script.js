"use strict";

// =====================================
// RCF ATTENDANCE REPORT
// Registration + Dark/Light Mode
// =====================================

const REGISTRATION_KEY = "rcfRegistrations";
const THEME_KEY = "rcfTheme";

// =====================================
// 1. GET TODAY'S DATE
// =====================================

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function setRegistrationDate() {
  const dateInput = document.getElementById("registrationDate");

  if (dateInput) {
    dateInput.value = getTodayDate();
  }
}

// =====================================
// 2. UPDATE FOOTER YEAR
// =====================================

function setFooterYear() {
  const footerYear = document.getElementById("footerYear");

  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }
}

// =====================================
// 3. DARK AND LIGHT MODE
// =====================================

function applyTheme(theme) {
  const html = document.documentElement;
  const themeIcon = document.getElementById("themeIcon");
  const themeLabel = document.getElementById("themeLabel");
  const themeToggle = document.getElementById("themeToggle");
  const themeColor = document.querySelector('meta[name="theme-color"]');

  // Only allow the two supported themes.
  const selectedTheme = theme === "light" ? "light" : "dark";

  html.setAttribute("data-theme", selectedTheme);

  if (themeIcon) {
    themeIcon.textContent = selectedTheme === "dark" ? "☀" : "☾";
  }

  if (themeLabel) {
    themeLabel.textContent =
      selectedTheme === "dark" ? "Light mode" : "Dark mode";
  }

  if (themeToggle) {
    themeToggle.setAttribute(
      "aria-pressed",
      String(selectedTheme === "light")
    );

    themeToggle.setAttribute(
      "aria-label",
      selectedTheme === "dark"
        ? "Switch to light mode"
        : "Switch to dark mode"
    );
  }

  if (themeColor) {
    themeColor.setAttribute(
      "content",
      selectedTheme === "dark" ? "#101827" : "#f5f6fa"
    );
  }
}

function initialiseTheme() {
  let savedTheme = "dark";

  try {
    const storedTheme = localStorage.getItem(THEME_KEY);

    if (storedTheme === "light" || storedTheme === "dark") {
      savedTheme = storedTheme;
    }
  } catch (error) {
    console.warn("Theme preference could not be loaded.");
  }

  applyTheme(savedTheme);

  const themeToggle = document.getElementById("themeToggle");

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const currentTheme =
        document.documentElement.getAttribute("data-theme") || "dark";

      const newTheme = currentTheme === "dark" ? "light" : "dark";

      applyTheme(newTheme);

      try {
        localStorage.setItem(THEME_KEY, newTheme);
      } catch (error) {
        console.warn("Theme preference could not be saved.");
      }
    });
  }
}

// =====================================
// 4. READ SAVED REGISTRATIONS
// =====================================

function getRegistrations() {
  try {
    const savedData = localStorage.getItem(REGISTRATION_KEY);

    if (!savedData) {
      return [];
    }

    const registrations = JSON.parse(savedData);

    return Array.isArray(registrations) ? registrations : [];
  } catch (error) {
    console.error("Could not read registrations:", error);
    return [];
  }
}

// =====================================
// 5. SAVE A REGISTRATION
// =====================================

function saveRegistration(person) {
  const registrations = getRegistrations();

  // Check whether this phone number already exists.
  const phone = person.phone.trim();

  if (phone) {
    const phoneExists = registrations.some(function (registration) {
      return (
        registration.phone &&
        registration.phone.trim() === phone
      );
    });

    if (phoneExists) {
      return {
        success: false,
        message:
          "This phone number has already been registered on this browser. Please check your details."
      };
    }
  }

  registrations.push(person);

  try {
    localStorage.setItem(
      REGISTRATION_KEY,
      JSON.stringify(registrations)
    );

    return { success: true };
  } catch (error) {
    console.error("Could not save registration:", error);

    return {
      success: false,
      message:
        "Your registration could not be saved. Please check your browser storage and try again."
    };
  }
}

// =====================================
// 6. SHOW REGISTRATION SUCCESS MESSAGE
// =====================================

function showSuccessMessage(fullName) {
  const form = document.getElementById("registrationForm");
  const successMessage = document.getElementById("successMessage");

  if (!form || !successMessage) {
    return;
  }

  // Clear any previous message.
  successMessage.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent = "Registration Successful!";

  const greeting = document.createElement("p");
  greeting.textContent = `Thank you, ${fullName}, for worshipping with RCF, House of Revealed God's Glory.`;

  const message = document.createElement("p");
  message.textContent =
    "We're delighted to have you with us. Enjoy the rest of the service!";

  successMessage.append(heading, greeting, message);

  form.hidden = true;
  successMessage.hidden = false;

  successMessage.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

// =====================================
// 7. SHOW FORM ERROR
// =====================================

function showFormError(message) {
  const form = document.getElementById("registrationForm");

  if (!form) {
    return;
  }

  let errorMessage = document.getElementById("formError");

  if (!errorMessage) {
    errorMessage = document.createElement("p");
    errorMessage.id = "formError";
    errorMessage.setAttribute("role", "alert");
    errorMessage.style.color = "#e05252";
    errorMessage.style.marginTop = "12px";

    const submitButton = form.querySelector('[type="submit"]');

    if (submitButton) {
      submitButton.insertAdjacentElement("beforebegin", errorMessage);
    } else {
      form.appendChild(errorMessage);
    }
  }

  errorMessage.textContent = message;
}

// =====================================
// 8. HANDLE REGISTRATION FORM
// =====================================

function handleRegistration(event) {
  event.preventDefault();

  const form = document.getElementById("registrationForm");

  if (!form) {
    return;
  }

  // Clear any previous error.
  const previousError = document.getElementById("formError");

  if (previousError) {
    previousError.remove();
  }

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const fullName = document.getElementById("fullName").value.trim();
  const level = document.getElementById("level").value;
  const phone = document.getElementById("phoneNumber").value.trim();
  const department = document.getElementById("department").value.trim();
  const gender = document.getElementById("gender").value;
  const category = document.getElementById("category").value;

  if (!fullName || !level || !department || !gender || !category) {
    showFormError("Please complete all required fields.");
    return;
  }

  const person = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    registrationDate: getTodayDate(),
    fullName: fullName,
    level: level,
    phone: phone,
    department: department,
    gender: gender,
    category: category,
    createdAt: new Date().toISOString()
  };

  const result = saveRegistration(person);

  if (!result.success) {
    showFormError(result.message);
    return;
  }

  showSuccessMessage(fullName);
}

// =====================================
// 9. START THE WEBSITE
// =====================================

document.addEventListener("DOMContentLoaded", function () {
  setRegistrationDate();
  setFooterYear();
  initialiseTheme();

  const registrationForm =
    document.getElementById("registrationForm");

  if (registrationForm) {
    registrationForm.addEventListener(
      "submit",
      handleRegistration
    );
  }
});
