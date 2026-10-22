
/* ==========================================
   RCF ATTENDANCE REPORT
   Redeem Christian Fellowship
   House of Revealed God's Glory
   ========================================== */

const RCF = {
  name: "RCF",
  fellowship: "Redeem Christian Fellowship",
  house: "House of Revealed God's Glory"
};

// 1. GET TODAY'S DATE
function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 2. SET REGISTRATION DATE AUTOMATICALLY
function setRegistrationDate() {
  const dateField = document.getElementById("registrationDate");

  if (dateField) {
    dateField.value = getTodayDate();
  }
}

// 3. DISPLAY THE CURRENT YEAR IN THE FOOTER
function setFooterYear() {
  const footerYear = document.getElementById("footerYear");

  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }
}

// 4. SHOW THE SUCCESS MESSAGE
function showSuccessMessage(fullName) {
  const form = document.getElementById("registrationForm");
  const successMessage = document.getElementById("successMessage");

  if (form) {
    form.hidden = true;
  }

  if (successMessage) {
    successMessage.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = "Registration Successful!";

    const greeting = document.createElement("p");
    greeting.textContent = `Thank you, ${fullName}.`;

    const welcome = document.createElement("p");
    welcome.textContent =
      `Thank you for worshipping with ${RCF.name}, ${RCF.house}.`;

    const closing = document.createElement("p");
    closing.textContent =
      "We're delighted to have you with us. Enjoy the rest of the service!";

    successMessage.append(
      heading,
      greeting,
      welcome,
      closing
    );

    successMessage.hidden = false;
  }
}

// 5. TEMPORARY REGISTRATION STORAGE
// We will replace this with Supabase for permanent storage.
function saveRegistration(person) {
  let registrations = [];

  try {
    registrations = JSON.parse(
      localStorage.getItem("rcfRegistrations") || "[]"
    );
  } catch (error) {
    return {
      success: false,
      message: "Unable to read registrations on this device."
    };
  }

  // Avoid duplicate phone numbers in this browser.
  if (
    person.phone &&
    registrations.some(
      existing => existing.phone === person.phone
    )
  ) {
    return {
      success: false,
      message:
        "This number is already registered. Please contact an attendance worker."
    };
  }

  registrations.push(person);

  try {
    localStorage.setItem(
      "rcfRegistrations",
      JSON.stringify(registrations)
    );
  } catch (error) {
    return {
      success: false,
      message: "Unable to save your registration. Please try again."
    };
  }

  return { success: true };
}

// 6. HANDLE THE REGISTRATION FORM
function handleRegistration(event) {
  event.preventDefault();

  const form = event.currentTarget;

  const person = {
    registrationDate: getTodayDate(),

    fullName:
      document.getElementById("fullName").value.trim(),

    level:
      document.getElementById("level").value,

    phone:
      document.getElementById("phoneNumber").value.trim(),

    department:
      document.getElementById("department").value,

    gender:
      document.getElementById("gender").value,

    category:
      document.getElementById("category").value,

    createdAt: new Date().toISOString()
  };

  if (!form.reportValidity()) {
    return;
  }

  if (
    !person.fullName ||
    !person.level ||
    !person.department ||
    !person.gender ||
    !person.category
  ) {
    alert("Please complete all required fields.");
    return;
  }

  const result = saveRegistration(person);

  if (!result.success) {
    alert(result.message);
    return;
  }

  showSuccessMessage(person.fullName);
}

// 7. START THE WEBSITE
document.addEventListener("DOMContentLoaded", () => {
  setRegistrationDate();
  setFooterYear();

  const registrationForm =
    document.getElementById("registrationForm");

  if (registrationForm) {
    registrationForm.addEventListener(
      "submit",
      handleRegistration
    );
  }
});
