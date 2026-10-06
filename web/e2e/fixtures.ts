// Browser tests never hit Wikimedia: scene photos are served from a local stand-in, so runs are fast and repeatable.
import { test as base, expect } from "@playwright/test";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><rect width="960" height="640" fill="#9ab8c4"/><circle cx="480" cy="320" r="160" fill="#d9642b"/></svg>`;

export const test = base.extend({
  page: async ({ page }, runTest) => {
    await page.route("**/commons.wikimedia.org/**", (r) => r.fulfill({ status: 200, contentType: "image/svg+xml", body: SVG }));
    await runTest(page);
  },
});
export { expect };
