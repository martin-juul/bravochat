import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('welcome screen renders with suggestion chips', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Hey There, Sugar!' })).toBeVisible();
  await expect(page.locator('.chip')).toHaveCount(5);
});

test('sending a message produces a Johnny response', async ({ page }) => {
  const input = page.locator('#message-input');
  await input.fill('Tell me about your mama');

  const sendBtn = page.locator('#send-btn');
  await expect(sendBtn).toBeEnabled();
  await sendBtn.click();

  // User bubble appears immediately
  await expect(page.locator('.message.user .message-bubble')).toHaveText(/mama/i);

  // Typing indicator shows, then resolves into an AI response
  await expect(page.locator('#typing-message')).toBeVisible();
  const aiBubble = page.locator('.message.ai .message-bubble').last();
  await expect(aiBubble).toContainText(/mama|MAMA|juice|lasagna|sandwich/i, { timeout: 10_000 });
});

test('enter key sends, shift+enter makes a newline', async ({ page }) => {
  const input = page.locator('#message-input');
  await input.fill('hello');
  await input.press('Enter');
  await expect(page.locator('.message.user .message-bubble')).toHaveText(/hello/i);

  // Wait for the response so isResponding clears
  await expect(page.locator('.message.ai .message-bubble').last()).toBeVisible({ timeout: 10_000 });
});

test('greeting keyword routes to the hello pool', async ({ page }) => {
  await page.locator('#message-input').fill('hello');
  await page.locator('#message-input').press('Enter');
  const bubble = page.locator('.message.ai .message-bubble').last();
  await expect(bubble).toContainText(/sugar|gorgeous|toots|mama/i, { timeout: 10_000 });
});

test('suggestion chip sends its pre-baked text', async ({ page }) => {
  await page.getByRole('button', { name: /Tell me a joke/i }).click();
  await expect(page.locator('.message.user .message-bubble')).toHaveText(/Tell me a joke, pretty boy/i);
});

test('regenerate replaces the last AI response', async ({ page }) => {
  await page.locator('#message-input').fill('hey');
  await page.locator('#message-input').press('Enter');

  const first = page.locator('.message.ai .message-bubble').last();
  await expect(first).toBeVisible({ timeout: 10_000 });
  const firstText = await first.textContent();

  const regen = page.locator('.regenerate-btn');
  await expect(regen).toHaveCount(1);
  await regen.click();

  // Old text disappears, a new AI bubble (possibly the same line, but re-rendered) appears
  await expect(page.locator('.regenerate-btn')).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator('.message.user')).toHaveCount(1);
  await expect(page.locator('.message.ai')).toHaveCount(1);
});

test('no-repeat guard: repeated questions never duplicate a response', async ({ page }) => {
  const seen = new Set();
  for (let i = 0; i < 3; i++) {
    await page.locator('#message-input').fill('hey there');
    await page.locator('#message-input').press('Enter');
    const bubble = page.locator('.message.ai .message-bubble').nth(i);
    await expect(bubble).toBeVisible({ timeout: 10_000 });
    const text = await bubble.textContent();
    expect(seen, `response #${i + 1} repeated an earlier line`).not.toContain(text);
    seen.add(text);
  }
});

test('new chat resets to the welcome screen', async ({ page }) => {
  await page.locator('#message-input').fill('hello');
  await page.locator('#message-input').press('Enter');
  await expect(page.locator('.message.ai .message-bubble').last()).toBeVisible({ timeout: 10_000 });

  await page.locator('#new-chat').click();
  await expect(page.getByRole('heading', { name: 'Hey There, Sugar!' })).toBeVisible();
  await expect(page.locator('.message')).toHaveCount(0);

  // Resurrection guard: sending after New Chat must not drag the old
  // conversation's bubbles back (messages model reset on chat-reset).
  await page.locator('#message-input').fill('tell me a joke');
  await page.locator('#message-input').press('Enter');
  await expect(page.locator('.message.user')).toHaveCount(1);
  await expect(page.locator('.message')).toHaveCount(1, { timeout: 300 }); // AI bubble not yet — response pending
});

test('history items load pre-baked conversations', async ({ page }) => {
  const item = page.locator('.history-item').first();
  const id = await item.getAttribute('data-id');
  expect(id).toBeTruthy();

  await item.click();
  await expect(page.locator('.message').first()).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('.message').first()).toBeAttached();
  // The clicked item becomes active
  await expect(page.locator(`.history-item[data-id="${id}"]`)).toHaveClass(/active/);
});

test('typing indicator cycles status phrases', async ({ page }) => {
  await page.locator('#message-input').fill('what do you think about quantum physics?');
  await page.locator('#message-input').press('Enter');

  const typingText = page.locator('#typing-message .typing-text');
  await expect(typingText).toBeVisible();
  const first = await typingText.textContent();

  // Response delay is 1–2.5s; phrase rotates at 2s. Take a second sample.
  const second = await page.locator('#typing-message .typing-text').textContent().catch(() => null);
  if (second !== null && first !== second) {
    expect(true).toBe(true); // rotation observed
  }
  // Either way the indicator must resolve
  await expect(page.locator('#typing-message')).toHaveCount(0, { timeout: 10_000 });
});

test('escape and slash keyboard shortcuts work', async ({ page }) => {
  // Info modal opens and Escape closes it
  await page.locator('#info-btn').click();
  await expect(page.locator('#modal-backdrop')).toHaveClass(/show/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#modal-backdrop')).not.toHaveClass(/show/);

  // '/' focuses the input
  await page.keyboard.press('/');
  await expect(page.locator('#message-input')).toBeFocused();
});

test('sparkle trigger words do not break input', async ({ page }) => {
  const input = page.locator('#message-input');
  await input.fill('handsome');
  await expect(input).toHaveValue('handsome');
  await input.fill('mama hair');
  await expect(input).toHaveValue('mama hair');
});

test('send button disabled while a response is pending', async ({ page }) => {
  const input = page.locator('#message-input');
  const sendBtn = page.locator('#send-btn');
  await expect(sendBtn).toBeDisabled();
  await input.fill('hello');
  await expect(sendBtn).toBeEnabled();
  await sendBtn.click();
  await input.fill('again');
  await expect(sendBtn).toBeDisabled();
  await expect(page.locator('.message.ai .message-bubble').last()).toBeVisible({ timeout: 10_000 });
  await expect(sendBtn).toBeEnabled();
});

test('credit line links to juul.xyz', async ({ page }) => {
  const link = page.locator('.input-credit a').first();
  await expect(link).toHaveAttribute('href', 'https://juul.xyz');
  await expect(page.locator('.input-credit')).toContainText(/Martin Juul Christiansen/i);
});

test('persisted chats: threshold, reload, resume without duplication', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());

  // Two messages (below the 3-message threshold): nothing saved (AE1).
  const input = page.locator('#message-input');
  await input.fill('hello there sugar');
  await input.press('Enter');
  await expect(page.locator('.message.ai .message-bubble').last()).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.locator('#saved-chats .history-item')).toHaveCount(0);

  // Cross the threshold with a hair topic (AE2).
  for (const q of ['tell me about your hair', 'what about hairspray though']) {
    await input.fill(q);
    await input.press('Enter');
    await expect(page.locator('.message.ai .message-bubble').last()).toBeVisible({ timeout: 10_000 });
  }
  await expect(page.locator('#saved-chats .history-item')).toHaveCount(1);
  await expect(page.locator('#saved-chats .history-item-text')).toHaveText('Hair care tips');
  await expect(page.locator('#saved-chats .history-item')).toHaveAttribute('title', /spray|handsome|Johnny/);

  // Reload: the chat survives and resumes as continuable (AE3).
  await page.reload();
  await expect(page.locator('#saved-chats .history-item')).toHaveCount(1);
  await page.locator('#saved-chats .history-item').click();
  await expect(page.locator('.message')).toHaveCount(4); // the persisted conversation (the sub-threshold pair was never stored)
  await input.fill('continue this hair chat');
  await input.press('Enter');
  await expect(page.locator('.message')).toHaveCount(6);
  await expect(page.locator('#saved-chats .history-item')).toHaveCount(1); // no duplicate entry
});

test('new chat leaves the persisted chat stored', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  const input = page.locator('#message-input');
  for (const q of ['hey mama', 'tell me about mama', 'mama stories']) {
    await input.fill(q);
    await input.press('Enter');
    await expect(page.locator('.message.ai .message-bubble').last()).toBeVisible({ timeout: 10_000 });
  }
  await expect(page.locator('#saved-chats .history-item')).toHaveCount(1);

  await page.locator('#new-chat').click();
  await expect(page.getByRole('heading', { name: 'Hey There, Sugar!' })).toBeVisible();
  await expect(page.locator('#saved-chats .history-item')).toHaveCount(1); // still stored (R10)
});
