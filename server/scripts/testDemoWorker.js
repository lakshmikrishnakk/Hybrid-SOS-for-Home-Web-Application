/**
 * server/scripts/testDemoWorker.js
 *
 * Local development-only test script for Hybrid SOS Demo Social Worker registration.
 *
 * Requirements fulfilled:
 * 1. Follows the existing server/scripts/testContacts.js approach.
 * 2. Reads TEST_USER_EMAIL and TEST_USER_PASSWORD securely from environment variables.
 * 3. Logs in via POST /api/auth/login and stores JWT token internally.
 * 4. Registers a clearly labelled Demo Social Worker via POST /api/workers.
 * 5. Uses a reserved fictional placeholder phone number (+1-555-0188).
 * 6. Uses a designated demo badge number (DEMO-SW-9901).
 * 7. Retrieves workers via GET /api/workers and verifies the registered worker is present.
 * 8. Verifies isDemo === true and isVerified === false.
 * 9. Handles duplicate registration gracefully if run multiple times.
 * 10. Never logs passwords, JWT tokens, or authorization headers.
 * 11. Does not trigger any SOS alerts or send SMS.
 * 12. Requires zero new packages (uses Node.js native fetch and existing dotenv).
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

// Clearly labelled fictional Demo Social Worker test payload
// 555-0100 through 555-0199 are reserved for fictional use (NANP / ITU)
const testWorkerData = {
  name: process.env.TEST_DEMO_WORKER_NAME || "Alex Rivera (Demo Social Worker)",
  badgeNumber: process.env.TEST_DEMO_WORKER_BADGE || "DEMO-SW-9901",
  agency:
    process.env.TEST_DEMO_WORKER_AGENCY ||
    "Hybrid SOS Demo Responder Unit (Academic Simulation)",
  phone: process.env.TEST_DEMO_WORKER_PHONE || "+1-555-0188",
  currentEta: process.env.TEST_DEMO_WORKER_ETA || "6 mins",
};

async function runTest() {
  console.log("==================================================");
  console.log("  Hybrid SOS - Demo Social Worker Registration Test");
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
      '  $env:TEST_USER_EMAIL="your_test_user@example.com"; $env:TEST_USER_PASSWORD="your_password"; node server/scripts/testDemoWorker.js'
    );
    console.error("\nHow to run in Bash / Git Bash:");
    console.error(
      '  TEST_USER_EMAIL="your_test_user@example.com" TEST_USER_PASSWORD="your_password" node server/scripts/testDemoWorker.js'
    );
    console.error(
      "\nAlternatively, add TEST_USER_EMAIL and TEST_USER_PASSWORD to server/.env."
    );
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
        `❌ Login failed with HTTP ${loginResponse.status}: ${
          loginData.message || loginResponse.statusText
        }`
      );
      process.exit(1);
    }

    if (!loginData.token) {
      console.error(
        "❌ Login succeeded but no authentication token was returned by the server."
      );
      process.exit(1);
    }

    // Token stored internally; never logged or exposed
    token = loginData.token;
    console.log("✓ Login successful. Authentication token acquired internally.");
    if (loginData.user && loginData.user.fullName) {
      console.log(`  User: ${loginData.user.fullName} (${loginData.user.email})`);
    }
  } catch (err) {
    handleNetworkError("POST /api/auth/login", err);
    process.exit(1);
  }

  // 3. Register Demo Social Worker using POST /api/workers
  console.log("\n[Step 2/3] Registering Demo Social Worker via POST /api/workers...");
  console.log(`  Name:         ${testWorkerData.name}`);
  console.log(`  Badge Number: ${testWorkerData.badgeNumber}`);
  console.log(`  Agency:       ${testWorkerData.agency}`);
  console.log(`  Phone:        ${testWorkerData.phone} (fictional placeholder)`);
  console.log(`  ETA:          ${testWorkerData.currentEta}`);

  let registrationStatus = "pending";

  try {
    const createResponse = await fetch(`${API_BASE_URL}/api/workers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(testWorkerData),
    });

    const createData = await createResponse.json().catch(() => ({}));

    if (createResponse.ok) {
      registrationStatus = "created";
      console.log("✓ Demo social worker registered successfully.");
      if (createData.worker) {
        console.log(`  Worker ID:   ${createData.worker.id || "N/A"}`);
        console.log(`  Status:      ${createData.worker.status || "Available"}`);
        console.log(`  isDemo:      ${createData.worker.isDemo}`);
        console.log(`  isVerified:  ${createData.worker.isVerified}`);
      }
    } else if (
      createResponse.status === 400 &&
      createData.message &&
      createData.message.toLowerCase().includes("already exists")
    ) {
      registrationStatus = "already_exists";
      console.log(
        `ℹ Safe duplicate handling: Worker with badge "${testWorkerData.badgeNumber}" already exists.`
      );
      console.log("  Proceeding to retrieve and verify existing record...");
    } else {
      console.error(
        `❌ Worker registration failed with HTTP ${createResponse.status}: ${
          createData.message || createResponse.statusText
        }`
      );
      process.exit(1);
    }
  } catch (err) {
    handleNetworkError("POST /api/workers", err);
    process.exit(1);
  }

  // 4. Retrieve workers using GET /api/workers
  console.log("\n[Step 3/3] Retrieving registered social workers via GET /api/workers...");
  try {
    const listResponse = await fetch(`${API_BASE_URL}/api/workers`, {
      method: "GET",
    });

    const listData = await listResponse.json().catch(() => ({}));

    if (!listResponse.ok) {
      console.error(
        `❌ Retrieving workers failed with HTTP ${listResponse.status}: ${
          listData.message || listResponse.statusText
        }`
      );
      process.exit(1);
    }

    const workersList = Array.isArray(listData.workers) ? listData.workers : [];
    console.log(`✓ Retrieved ${workersList.length} total worker(s) in system:`);

    workersList.forEach((w, index) => {
      const matchBadge =
        w.badgeNumber &&
        w.badgeNumber.toLowerCase() === testWorkerData.badgeNumber.toLowerCase();
      const marker = matchBadge ? " [TEST DEMO WORKER]" : "";
      console.log(
        `  ${index + 1}. [${w.badgeNumber}] ${w.name} | Phone: ${w.phone} | Agency: ${
          w.agency || "N/A"
        } | Status: ${w.status || "Available"}${marker}`
      );
    });

    // Locate the test demo worker in the list
    const foundWorker = workersList.find(
      (w) =>
        w.badgeNumber &&
        w.badgeNumber.toLowerCase() === testWorkerData.badgeNumber.toLowerCase()
    );

    if (!foundWorker) {
      console.error(
        `\n❌ Failure: Demo worker with badge "${testWorkerData.badgeNumber}" was not found in GET /api/workers list.`
      );
      process.exit(1);
    }

    console.log("\n--------------------------------------------------");
    console.log("  Demo Worker Verification Checks:");
    console.log("--------------------------------------------------");
    console.log(`  Found Record ID: ${foundWorker.id || "N/A"}`);
    console.log(`  Badge Number:    ${foundWorker.badgeNumber}`);
    console.log(`  Status:          ${foundWorker.status}`);
    console.log(`  isDemo Flag:     ${foundWorker.isDemo}`);
    console.log(`  isVerified Flag: ${foundWorker.isVerified}`);

    let checksPassed = true;

    if (foundWorker.isDemo === true) {
      console.log("  ✓ PASS: isDemo is explicitly true (marked as simulation responder).");
    } else {
      console.error(
        `  ❌ FAIL: isDemo expected true, received ${foundWorker.isDemo}.`
      );
      checksPassed = false;
    }

    if (foundWorker.isVerified === false) {
      console.log(
        "  ✓ PASS: isVerified is explicitly false (not treated as official emergency personnel)."
      );
    } else {
      console.error(
        `  ❌ FAIL: isVerified expected false, received ${foundWorker.isVerified}.`
      );
      checksPassed = false;
    }

    if (checksPassed) {
      console.log("==================================================");
      console.log(
        `🎉 SUCCESS: Demo Social Worker verified! (${
          registrationStatus === "created" ? "New Registration" : "Verified Existing Record"
        })`
      );
      console.log("==================================================");
    } else {
      console.error("\n❌ One or more verification checks failed.");
      process.exit(1);
    }
  } catch (err) {
    handleNetworkError("GET /api/workers", err);
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
