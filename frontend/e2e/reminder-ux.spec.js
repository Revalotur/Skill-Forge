/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");
const { expect } = require("playwright/test");

const BASE_URL = "http://localhost:3000";
const EMAIL = "test-skillforge@example.com";
const PASSWORD = "Test1234!";
const MISSION_ID = "e266afa7-a429-4311-949e-0fccf29ea127";
const MISSION_URL = `${BASE_URL}/api/mission/${MISSION_ID}`;

let passCount = 0;
let failCount = 0;
const failures = [];
const consoleErrors = [];
let loggedIn = false;
let bannerOk = false;

async function check(name, fn) {
  try {
    await fn();
    passCount += 1;
    console.log(`PASS: ${name}`);
  } catch (err) {
    failCount += 1;
    const msg = err && err.message ? err.message : String(err);
    failures.push(`${name}: ${msg}`);
    console.log(`FAIL: ${name} — ${msg}`);
  }
}

async function resetMission(page) {
  const res = await page.request.patch(MISSION_URL, {
    data: { is_completed: false },
  });
  console.log(`RESET: PATCH ${MISSION_URL} -> ${res.status()}`);
  if (!res.ok()) {
    throw new Error(`Reset failed with status ${res.status()}`);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  page.on("pageerror", (err) => {
    consoleErrors.push(`pageerror: ${err.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`console.error: ${msg.text()}`);
    }
  });

  try {
    // 0. Reset mission to incomplete before assertions (idempotent re-run)
    await check("Reset mission to is_completed:false before run", async () => {
      await resetMission(page);
    });

    // 1. Login
    await check("Login as test user and land on dashboard", async () => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
      await page.fill('input[name="email"]', EMAIL);
      await page.fill('input[name="password"]', PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL("**/dashboard", { timeout: 20000 });
      loggedIn = true;
    });

    if (loggedIn) {
      // 2. Reminder banner visible
      await check("Reminder banner visible (Misi hari ini belum dikerjakan)", async () => {
        const banner = page.getByText("Misi hari ini belum dikerjakan");
        await expect(banner).toBeVisible({ timeout: 10000 });
        bannerOk = true;
      });

      // 3. MissionCard due badge visible
      await check("MissionCard due badge visible (Belum dikerjakan)", async () => {
        const badge = page.getByText(/Belum dikerjakan/);
        await expect(badge).toBeVisible({ timeout: 10000 });
      });

      if (bannerOk) {
        // 4. Click banner "Selesaikan" -> toast appears
        await check("Click banner Selesaikan -> toast 'Misi selesai!' appears", async () => {
          const button = page.getByRole("button", { name: "Selesaikan", exact: true });
          await expect(button).toBeVisible({ timeout: 10000 });
          await button.click();
          const toast = page.getByText(/Misi selesai!/).first();
          await toast.waitFor({ state: "visible", timeout: 8000 });
          await expect(toast).toBeVisible();
        });

        // 5. Banner disappears after completing
        await check("Banner disappears after completing mission", async () => {
          await expect(
            page.getByText("Misi hari ini belum dikerjakan")
          ).toHaveCount(0, { timeout: 8000 });
        });
      } else {
        console.log("SKIP: Selesaikan click + banner disappearance (banner was not visible)");
      }
    }

    // 6. Mentor empty state
    await check("Mentor empty state visible (Halo! Aku AI Mentor-mu)", async () => {
      await page.goto(`${BASE_URL}/mentor`, { waitUntil: "domcontentloaded" });
      const heading = page.getByText("Halo! Aku AI Mentor-mu 🤖");
      await expect(heading).toBeVisible({ timeout: 15000 });
    });

    // 7. No page errors / console errors
    await check("No page errors / console errors", async () => {
      if (consoleErrors.length > 0) {
        throw new Error(`Collected ${consoleErrors.length} error(s):\n  ${consoleErrors.join("\n  ")}`);
      }
    });

    // 8. Reset mission back to incomplete so the test is re-runnable
    await check("Reset mission to is_completed:false after run", async () => {
      await resetMission(page);
    });

    console.log("");
    console.log(`RESULTS: ${passCount} PASS, ${failCount} FAIL`);
    if (failures.length > 0) {
      console.log("FAILURES:");
      failures.forEach((f) => console.log(`  - ${f}`));
    }
  } catch (err) {
    failCount += 1;
    console.log(`FAIL: unexpected test error — ${err.message}`);
  } finally {
    if (consoleErrors.length > 0) {
      console.log("");
      console.log("COLLECTED CONSOLE/PAGE ERRORS:");
      consoleErrors.forEach((e) => console.log(`  - ${e}`));
    }
    await browser.close();
  }

  process.exitCode = failCount > 0 ? 1 : 0;
})();
