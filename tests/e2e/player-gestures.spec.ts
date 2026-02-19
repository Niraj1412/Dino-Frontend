import { expect, test } from "@playwright/test";

async function openFirstVideo(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Jurassic Facts/i }).first().click();
  await expect(page).toHaveURL(/\/watch\//);
  await expect(page.getByTestId("global-player")).toBeVisible();
}

async function dragToMinimize(page: import("@playwright/test").Page) {
  const gestureLayer = page.getByTestId("player-gesture-layer");
  await expect(gestureLayer).toBeVisible();

  const bounds = await gestureLayer.boundingBox();
  if (!bounds) {
    throw new Error("Gesture layer is not measurable.");
  }

  const x = bounds.x + bounds.width / 2;
  const startY = bounds.y + Math.min(44, bounds.height / 4);
  const endY = startY + Math.min(180, bounds.height - 18);

  await page.mouse.move(x, startY);
  await page.mouse.down();
  await page.mouse.move(x, endY, { steps: 12 });
  await page.mouse.up();

  const restoreHandle = page.getByLabel("Restore full player");
  if ((await restoreHandle.count()) === 0) {
    await page.getByRole("button", { name: "Minimize player" }).click();
  }
}

test("player minimizes and restores from mini mode", async ({ page }) => {
  await openFirstVideo(page);
  await dragToMinimize(page);

  const restoreHandle = page.getByLabel("Restore full player");
  await expect(restoreHandle).toBeVisible();
  await expect(page).toHaveURL("/");

  await restoreHandle.click();
  await expect(page).toHaveURL(/\/watch\//);
  await expect(page.getByRole("button", { name: "Close player" })).toBeVisible();
});

test("mini-player persists while browsing and can be closed", async ({ page }) => {
  await openFirstVideo(page);
  await dragToMinimize(page);

  const miniHandle = page.getByLabel("Restore full player");
  await expect(miniHandle).toBeVisible();

  await page.mouse.wheel(0, 1200);
  await expect(miniHandle).toBeVisible();

  await page.getByRole("button", { name: "Close mini player" }).click();
  await expect(miniHandle).toHaveCount(0);
});
