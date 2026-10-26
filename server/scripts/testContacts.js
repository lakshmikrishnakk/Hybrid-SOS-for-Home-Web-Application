/**
 * server/scripts/testContacts.js
 *
 * Local development-only test script for Hybrid SOS emergency contact registration.
 *
 * Requirements fulfilled:
 * 1. Uses existing authentication (/api/auth/login) and contact (/api/contacts) endpoints.
 * 2. Reads login credentials securely from environment variables (never hardcoded).
 * 3. Logs in to obtain JWT token internally.
 * 4. Registers a fictional test emergency contact using POST /api/contacts.
 * 5. Retrieves saved contacts using GET /api/contacts.
 * 6. Never logs JWT tokens, passwords, or sensitive credentials to the console.
 * 7. Uses a clearly fictional placeholder phone number (+1-555-0199).
 * 8. Handles API and network errors cleanly.
 * 9. Requires no additional dependencies (uses Node.js native fetch and existing dotenv).
 */

const path = require("path");

// Load local server/.env if available
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch {
  // If dotenv cannot be loaded, rely on process.env
}

// Configuration
const RAW_BASE_URL =
  process.env.API_BASE_URL ||
  `http://localhost:${process.env.PORT || 5000}`;
const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

// Credentials from environment variables
const email = process.env.TEST_USER_EMAIL || process.env.TEST_EMAIL;
const password = process.env.TEST_USER_PASSWORD || process.env.TEST_PASSWORD;

// Fictional test contact details (555-0100 through 555-0199 are reserved for fictional use)
const testContactData = {
  name: process.env.TEST_CONTACT_NAME || "Test Contact (Automated Dev Test)",
  relationship: process.env.TEST_CONTACT_RELATIONSHIP || "Emergency Contact",
  phone: process.env.TEST_CONTACT_PHONE || "+1-555-0199",
};

async function runTest() {
  console.log("==================================================");
  console.log("  Hybrid SOS - Emergency Contact Registration Test");
  console.log("==================================================");
  console.log(`📡 Target API Server: ${API_BASE_URL}`);

  // 1. Validate environment credentials
  if (!email || !password) {
    console.error("\n❌ Error: Missing test login credentials.");
    console.error("Please supply test credentials via environment variables.");
    console.error("\nRequired environment variables:");
    console.error("  TEST_USER_EMAIL    : Email of an existing test user");
    console.error("  TEST_USER_PASSWORD : Password of the test user");
    console.error("\nHow to run in PowerShell:");
    console.error(
      '  $env:TEST_USER_EMAIL="your_test_user@example.com"; $env:TEST_USER_PASSWORD="your_password"; node server/scripts/testContacts.js'
    );
    console.error("\nHow to run in Bash / Git Bash:");
    console.error(
      '  TEST_USER_EMAIL="your_test_user@example.com" TEST_USER_PASSWORD="your_password" node server/scripts/testContacts.js'
    );
    console.error("\nAlternatively, add TEST_USER_EMAIL and TEST_USER_PASSWORD to server/.env.");
    process.exit(1);
  }

  let token = null;

  // 2. Authenticate using POST /api/auth/login
  console.log(`\n[Step 1/3] Logging in as: ${email}...`);
  try {
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const loginData = await loginResponse.json().catch(() => ({}));

    if (!loginResponse.ok) {
      console.error(
        `❌ Login failed with HTTP ${loginResponse.status}: ${loginData.message || loginResponse.statusText}`
      );
      process.exit(1);
    }

    if (!loginData.token) {
      console.error("❌ Login succeeded but no authentication token was returned by the server.");
      process.exit(1);
    }

    // Token stored in internal variable; never printed to console
    token = loginData.token;
    console.log("✓ Login successful. Authentication token acquired internally.");
    if (loginData.user && loginData.user.fullName) {
      console.log(`  User: ${loginData.user.fullName} (${loginData.user.email})`);
    }
  } catch (err) {
    handleNetworkError("POST /api/auth/login", err);
    process.exit(1);
  }

  // 3. Register emergency contact using POST /api/contacts
  console.log("\n[Step 2/3] Registering fictional test emergency contact...");
  console.log(`  Name:         ${testContactData.name}`);
  console.log(`  Relationship: ${testContactData.relationship}`);
  console.log(`  Phone:        ${testContactData.phone} (clearly fictional placeholder)`);

  let createdContactId = null;

  try {
    const createResponse = await fetch(`${API_BASE_URL}/api/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(testContactData),
    });

    const createData = await createResponse.json().catch(() => ({}));

    if (!createResponse.ok) {
      console.error(
        `❌ Contact registration failed with HTTP ${createResponse.status}: ${
          createData.message || createResponse.statusText
        }`
      );
      process.exit(1);
    }

    const createdContact = createData.contact || {};
    createdContactId = createdContact.id;

    console.log("✓ Test emergency contact created successfully.");
    console.log(`  Contact ID:   ${createdContact.id || "N/A"}`);
    console.log(`  Status:       ${createdContact.status || "Ready"}`);
  } catch (err) {
    handleNetworkError("POST /api/contacts", err);
    process.exit(1);
  }

  // 4. Retrieve contacts using GET /api/contacts
  console.log("\n[Step 3/3] Retrieving saved emergency contacts...");
  try {
    const listResponse = await fetch(`${API_BASE_URL}/api/contacts`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const listData = await listResponse.json().catch(() => ({}));

    if (!listResponse.ok) {
      console.error(
        `❌ Retrieving contacts failed with HTTP ${listResponse.status}: ${
          listData.message || listResponse.statusText
        }`
      );
      process.exit(1);
    }

    const contactsList = Array.isArray(listData.contacts) ? listData.contacts : [];
    console.log(`✓ Successfully retrieved ${contactsList.length} contact(s) for this user:`);

    contactsList.forEach((c, index) => {
      const isNew = c.id === createdContactId ? " [NEW TEST CONTACT]" : "";
      console.log(
        `  ${index + 1}. ${c.name} | Phone: ${c.phone} | Relationship: ${
          c.relationship || "N/A"
        } | Status: ${c.status || "Ready"}${isNew}`
      );
    });

    const isVerified = contactsList.some((c) => c.id === createdContactId);
    if (isVerified) {
      console.log("\n==================================================");
      console.log("🎉 SUCCESS: Emergency contact registration verified!");
      console.log("==================================================");
    } else {
      console.warn(
        "\n⚠️ Warning: Created contact ID was not found in the retrieved contacts list."
      );
    }
  } catch (err) {
    handleNetworkError("GET /api/contacts", err);
    process.exit(1);
  }
}

function handleNetworkError(action, err) {
  console.error(`\n❌ Network error while executing ${action}:`);
  if (err.cause && (err.cause.code === "ECONNREFUSED" || err.code === "ECONNREFUSED")) {
    console.error(
      `  Connection refused at ${API_BASE_URL}. Ensure that the Node.js backend is running.`
    );
  } else {
    console.error(`  ${err.message || err}`);
  }
}

// Execute test runner
runTest().catch((err) => {
  console.error("\n❌ Unexpected execution error:", err.message || err);
  process.exit(1);
});
