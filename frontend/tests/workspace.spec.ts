import { expect, test, type Page } from "@playwright/test";

const node = (page: Page, id: string) => page.locator(`[data-node-id="${id}"]`);
async function menu(page: Page, id: string) {
  await node(page, id).locator(":scope > .tree-row .entity-more").click();
}
async function open(page: Page, id: string) {
  await menu(page, id);
  await page
    .getByRole("menuitem", { name: "Open in Tab", exact: true })
    .click();
}
async function consoleTab(page: Page, id: string) {
  await menu(page, id);
  await page.getByRole("menuitem", { name: "New" }).click();
  await page
    .getByRole("menuitem", { name: "Query Console", exact: true })
    .click();
}
async function expand(page: Page, id: string) {
  if ((await node(page, id).getAttribute("aria-expanded")) !== "true")
    await node(page, id).locator(":scope > .tree-row .tree-label").click();
}

test("explicit menus, independent consoles, background completion, and close-all cleanup", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  for (const id of ["postgres", "postgres:public", "mongo", "kafka", "http"])
    await expect(
      node(page, id).locator(":scope > .tree-row .entity-more"),
    ).toHaveCount(0);
  await node(page, "postgres:database")
    .locator(":scope > .tree-row .tree-label")
    .click();
  await expect(page.getByRole("tab")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "public.users", exact: true }),
  ).toBeVisible();
  await consoleTab(page, "postgres:database");
  await page.getByRole("textbox", { name: "SQL statement" }).fill("SELECT 42;");
  await page.getByRole("button", { name: "Simulate Run", exact: true }).click();
  await consoleTab(page, "postgres:database");
  await expect(
    page.getByRole("textbox", { name: "SQL statement" }),
  ).not.toHaveText("SELECT 42;");
  await page.waitForTimeout(800);
  await page.getByRole("tab", { name: /Query Console 1/ }).click();
  await expect(
    page.getByText("Simulation complete · fixed sample data", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "SQL statement" })).toHaveText(
    "SELECT 42;",
  );
  await page.getByRole("button", { name: "Simulate Run", exact: true }).click();
  await page.getByRole("tab", { name: /Query Console 2/ }).click();
  await page.getByRole("button", { name: "Simulate Run", exact: true }).click();
  await page
    .getByRole("button", { name: "Close all tabs", exact: true })
    .click();
  await page.waitForTimeout(800);
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "No tabs open" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close all tabs", exact: true }),
  ).toBeDisabled();
  await expand(page, "postgres:database");
  await open(page, "postgres:users");
  await page
    .getByLabel("Filter rows (SQL WHERE expression)", { exact: true })
    .fill("id > 7");
  await page
    .getByRole("button", { name: "Close public.users", exact: true })
    .click();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await open(page, "postgres:users");
  await expect(
    page.getByLabel("Filter rows (SQL WHERE expression)", { exact: true }),
  ).toHaveValue("id > 7");
  expect(errors).toEqual([]);
});

test("connection pencil reopens settings, cancel/save, sanitizes Mongo URI, and never retargets tabs", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Edit connection Local PostgreSQL",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Host", { exact: true })).toHaveValue(
    "localhost",
  );
  await page.getByLabel("Host", { exact: true }).fill("cancel.example.test");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Edit connection Local PostgreSQL",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Host", { exact: true })).toHaveValue(
    "localhost",
  );
  await page
    .getByLabel("Profile name", { exact: true })
    .fill("Work PostgreSQL");
  await page.getByLabel("Host", { exact: true }).fill("next.example.test");
  await page.getByLabel("Database", { exact: true }).fill("nextdb");
  await page
    .getByLabel("Password · not retained", { exact: true })
    .fill("fictional-secret");
  await page
    .getByRole("button", { name: "Save demo changes", exact: true })
    .click();
  await expect(page.getByRole("tab")).toHaveCount(1);
  await expect(
    node(page, "postgres:database").locator(":scope > .tree-row .tree-label"),
  ).toHaveText("appdb");
  await page
    .getByRole("button", {
      name: "Edit connection Work PostgreSQL",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Host", { exact: true })).toHaveValue(
    "next.example.test",
  );
  await expect(page.getByLabel("Database", { exact: true })).toHaveValue(
    "nextdb",
  );
  await expect(
    page.getByLabel("Password · not retained", { exact: true }),
  ).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", {
      name: "Edit connection Work PostgreSQL",
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Edit connection Local MongoDB", exact: true })
    .click();
  await page
    .getByLabel("MongoDB URI · may contain credentials", { exact: true })
    .fill(
      "mongodb://fictional:secret@mongo.example.test/shop?authSource=admin&token=fictional",
    );
  await page
    .getByRole("button", { name: "Save demo changes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit connection Local MongoDB", exact: true })
    .click();
  await expect(
    page.getByLabel("MongoDB URI · may contain credentials", { exact: true }),
  ).toHaveValue("mongodb://mongo.example.test/shop?authSource=admin");
  await page.getByRole("button", { name: "Show URI", exact: true }).click();
  await expect(
    page.getByLabel("MongoDB URI · may contain credentials", { exact: true }),
  ).toHaveAttribute("type", "text");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", {
      name: "Edit connection Development Kafka",
      exact: true,
    })
    .click();
  await page.getByLabel("Security", { exact: true }).selectOption("SASL_SSL");
  await page.getByLabel("SASL username", { exact: true }).fill("demo-user");
  await page
    .getByLabel("SASL password · not retained", { exact: true })
    .fill("fictional-secret");
  await page
    .getByRole("button", { name: "Save demo changes", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Edit connection Development Kafka",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("SASL username", { exact: true })).toHaveValue(
    "demo-user",
  );
  await expect(
    page.getByLabel("SASL password · not retained", { exact: true }),
  ).toHaveValue("");
  await page.keyboard.press("Escape");
});

test("catalog search and add while empty, tree keyboard actions, and narrow layout", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Close all tabs", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Add connection", exact: true })
    .click();
  await page.getByLabel("Find an integration", { exact: true }).fill("publish");
  await expect(page.locator(".integration-option")).toHaveCount(1);
  await expect(page.locator(".integration-option")).toContainText("Kafka");
  await page
    .getByLabel("Find an integration", { exact: true })
    .fill("postgres");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.getByLabel("Profile name", { exact: true }).fill("Second PG");
  await page.getByLabel("Host", { exact: true }).fill("second.example.test");
  await page
    .getByRole("button", { name: "Add demo profile", exact: true })
    .click();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Edit connection Second PG", exact: true })
    .click();
  await expect(page.getByLabel("Host", { exact: true })).toHaveValue(
    "second.example.test",
  );
  await page.keyboard.press("Escape");
  await node(page, "postgres").focus();
  await page.keyboard.press("Shift+F10");
  await expect(
    page.getByRole("menu", { name: "Entity actions", exact: true }),
  ).toHaveCount(0);
  await node(page, "postgres:database").focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "New" }).click();
  await page
    .getByRole("menuitem", { name: "Query Console", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "SQL statement" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", {
      name: "Edit connection Development Kafka",
      exact: true,
    })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
});

test("typed result inspection, Mongo filters and sampled fields", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Inspect id · int8, row 1", exact: true })
    .click();
  await expect(page.getByLabel("Full value", { exact: true })).toHaveValue(
    "9007199254740993",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Inspect email · text, row 2", exact: true })
    .click();
  await expect(page.getByLabel("Full value", { exact: true })).toHaveValue(
    "NULL",
  );
  await page.keyboard.press("Escape");
  await expand(page, "mongo");
  await expand(page, "mongo:database");
  await open(page, "mongo:customers");
  await page
    .getByLabel("Filter documents (JSON object)", { exact: true })
    .fill("[]");
  await page
    .getByRole("button", { name: "Simulate Apply", exact: true })
    .click();
  await expect(
    page.getByText("Filter must be a JSON object.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Filter documents (JSON object)", { exact: true })
    .fill('{"active":true}');
  await page
    .getByRole("button", { name: "Simulate Apply", exact: true })
    .click();
  await expect(
    page.getByText("Simulation complete · fixed sample data", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sampled fields", exact: true })
    .click();
  await expect(page.getByText(/not a guaranteed schema/)).toBeVisible();
});

test("Kafka consume and publish, validation, and copy-to-draft without auto-publish", async ({
  page,
}) => {
  await page.goto("/");
  await expand(page, "kafka");
  await expand(page, "kafka:topics");
  await open(page, "kafka:orders.created");
  await page
    .getByLabel("Start position", { exact: true })
    .selectOption("offset");
  await page
    .getByRole("button", { name: "Simulate consume", exact: true })
    .click();
  await expect(
    page.getByText(/specific offset needs one partition/),
  ).toBeVisible();
  await page.getByLabel("Partition", { exact: true }).selectOption("0");
  await page.getByLabel("Offset", { exact: true }).fill("9007199254740993");
  await page
    .getByRole("button", { name: "Simulate consume", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "9007199254740993", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: '{"event":"order.created","id":1042}',
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Use as publish draft", exact: true })
    .click();
  await expect(page.getByLabel("JSON payload", { exact: true })).toHaveValue(
    '{"event":"order.created","id":1042}',
  );
  await expect(
    page.getByText(
      "Publish to see a simulated topic, partition, and offset acknowledgement.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("JSON payload", { exact: true }).fill("{broken");
  await page
    .getByRole("button", { name: "Simulate Publish", exact: true })
    .click();
  await expect(page.getByText(/Payload must be valid JSON/)).toBeVisible();
  await page.getByLabel("Payload format", { exact: true }).selectOption("text");
  await page.getByLabel("Text payload", { exact: true }).fill("hello");
  await page
    .getByRole("button", { name: "Simulate Publish", exact: true })
    .click();
  await expect(page.locator("pre")).toContainText("9007199254740994");
});

test("HTTP captures response source, clears secret fields on navigation, makes no API calls", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:5173") &&
      !request.url().startsWith("data:")
    )
      external.push(request.url());
  });
  await page.goto("/");
  await expand(page, "http");
  await expand(page, "http:requests");
  await open(page, "http:health");
  await page
    .getByLabel("Query parameters (name=value, one per line)", { exact: true })
    .fill("tag=one\ntag=two");
  await page
    .getByRole("button", { name: "Simulate Send", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect response", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("URL", { exact: true })
    .fill("https://changed.example.test");
  await page
    .getByRole("button", { name: "Inspect response", exact: true })
    .click();
  await expect(page.locator(".detail-source")).toContainText(
    "GET https://api.example.test/health?tag=one&tag=two",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("group", { name: "Request settings" })
    .getByRole("button", { name: "Headers", exact: true })
    .click();
  await page
    .getByLabel("Headers (name: value, one per line)", { exact: true })
    .fill("Authorization: fictional-header");
  await page
    .getByRole("button", { name: "Authorization", exact: true })
    .click();
  await page
    .getByLabel("Authentication", { exact: true })
    .selectOption("bearer");
  await page
    .getByLabel("Token · not retained", { exact: true })
    .fill("fictional-token");
  await page.getByRole("tab", { name: /public.users/ }).click();
  await page.getByRole("tab", { name: /GET \/health/ }).click();
  await expect(page.getByLabel("Authentication", { exact: true })).toHaveValue(
    "none",
  );
  await expect(page.getByLabel("URL", { exact: true })).toHaveValue(
    "https://changed.example.test",
  );
  await page
    .getByRole("group", { name: "Request settings" })
    .getByRole("button", { name: "Headers", exact: true })
    .click();
  await expect(
    page.getByLabel("Headers (name: value, one per line)", { exact: true }),
  ).toHaveValue("Accept: application/json");
  expect(external).toEqual([]);
});
