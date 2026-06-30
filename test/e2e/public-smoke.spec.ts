import { expect, test } from "@playwright/test";

test("public signup page exposes the Vercel payment flow", async ({ page }) => {
  await page.goto("/join.html");
  await expect(page.getByText("Apply for Membership")).toBeVisible();
  await expect(page.locator("#inquiry-form")).toHaveAttribute("data-signup-api", "/api/signup/start");
  await expect(page.getByText("Secure your place")).toBeVisible();
});
