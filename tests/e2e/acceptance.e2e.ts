import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { createHostMagicLink } from './support/auth'

const multipleChoiceTitle = 'Which teamwork value matters most?'
const wordCloudTitle = 'In one word, how was the session?'

function formatCode(code: string) {
  return `${code.slice(0, 4)} ${code.slice(4)}`
}

function getSessionId(url: string) {
  const match = url.match(/\/host\/([^/?#]+)/)

  if (!match?.[1]) {
    throw new Error(`Unable to extract a session id from ${url}`)
  }

  return match[1]
}

async function signInAsHost(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const page = await context.newPage()

  await page.goto(await createHostMagicLink(baseURL))
  await expect(page).toHaveURL(/\/host\/[0-9a-f-]+$/)
  await expect(page.getByRole('heading', { name: 'Host console' })).toBeVisible()

  return { context, page }
}

async function joinAsAudience(browser: Browser, baseURL: string, code: string) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()

  await page.goto(`${baseURL}/?code=${code}`)

  return { context, page }
}

async function waitForAutosave(page: Page) {
  await page.waitForTimeout(800)
  await expect(page.getByText('All changes saved to Supabase.')).toBeVisible()
}

async function readJoinCode(page: Page) {
  const codeText = await page.locator('header').getByText(/\d{4}\s\d{2}/).first().textContent()
  const code = codeText?.replace(/\D/g, '') ?? ''

  if (code.length !== 6) {
    throw new Error(`Expected a six-digit join code, received "${codeText ?? ''}"`)
  }

  return code
}

async function stubWindowOpen(page: Page) {
  await page.evaluate(() => {
    window.open = ((url?: string | URL) => {
      window.localStorage.setItem('__playwright_last_opened_url__', url ? String(url) : '')
      return null
    }) as typeof window.open
  })
}

test('keeps host, audience, and big screen in sync through the Phase 1 flow', async ({
  baseURL,
  browser,
}) => {
  if (!baseURL) {
    throw new Error('Playwright baseURL is required.')
  }

  const contexts: BrowserContext[] = []
  const { context: hostContext, page: hostPage } = await signInAsHost(browser, baseURL)
  contexts.push(hostContext)

  try {
    await hostPage.getByRole('textbox', { name: 'Question title' }).fill(multipleChoiceTitle)
    await hostPage.getByRole('button', { name: 'Add option' }).click()
    await hostPage.getByRole('button', { name: 'Add option' }).click()
    await hostPage.getByRole('textbox', { name: 'Option 1' }).fill('Clarity')
    await hostPage.getByRole('textbox', { name: 'Option 2' }).fill('Speed')
    await hostPage.getByRole('textbox', { name: 'Option 3' }).fill('Ownership')
    await hostPage.getByRole('textbox', { name: 'Option 4' }).fill('Trust')
    await waitForAutosave(hostPage)

    await hostPage.getByRole('button', { name: 'Add word cloud' }).click()
    await expect(hostPage.getByRole('button', { name: /Slide 2:/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(hostPage.getByRole('textbox', { name: 'Question title' })).toHaveValue('Capture words from the room')
    await hostPage.getByRole('textbox', { name: 'Question title' }).fill(wordCloudTitle)
    await waitForAutosave(hostPage)

    await hostPage.getByRole('button', { name: /Slide 1:/ }).click()
    await expect(hostPage.getByRole('button', { name: /Slide 1:/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(hostPage.getByRole('textbox', { name: 'Question title' })).toHaveValue(multipleChoiceTitle)

    const sessionId = getSessionId(hostPage.url())
    const joinCode = await readJoinCode(hostPage)
    const formattedJoinCode = formatCode(joinCode)

    await stubWindowOpen(hostPage)
    await hostPage.getByRole('button', { name: 'Present' }).click()
    await expect
      .poll(() => hostPage.evaluate(() => window.localStorage.getItem('__playwright_last_opened_url__')))
      .toContain(`/present/${sessionId}`)
    await expect(
      hostPage.getByText('This slide is currently driving the audience phones and big screen.'),
    ).toBeVisible()

    const presenterPage = await hostContext.newPage()
    await presenterPage.goto(`${baseURL}/present/${sessionId}`)
    await expect(presenterPage.getByText(formattedJoinCode)).toBeVisible()
    await expect(presenterPage.getByLabel('Session QR code')).toBeVisible()
    await expect(presenterPage.getByRole('heading', { name: multipleChoiceTitle })).toBeVisible()

    const audienceOne = await joinAsAudience(browser, baseURL, joinCode)
    contexts.push(audienceOne.context)
    await expect(audienceOne.page.getByRole('heading', { name: multipleChoiceTitle })).toBeVisible()
    await audienceOne.page.getByRole('button', { name: /Clarity/ }).click()
    await expect(audienceOne.page.getByRole('heading', { name: 'Thanks for voting! 👍' })).toBeVisible()
    await expect(presenterPage.locator('main')).toContainText('1 total responses')
    await expect(presenterPage.locator('main')).toContainText('1 participants')

    const audienceTwo = await joinAsAudience(browser, baseURL, joinCode)
    contexts.push(audienceTwo.context)
    await expect(audienceTwo.page.getByRole('heading', { name: multipleChoiceTitle })).toBeVisible()
    await audienceTwo.page.getByRole('button', { name: /Trust/ }).click()
    await expect(audienceTwo.page.getByRole('heading', { name: 'Thanks for voting! 👍' })).toBeVisible()
    await expect(presenterPage.locator('main')).toContainText('2 total responses')
    await expect(presenterPage.locator('main')).toContainText('2 participants')

    await presenterPage.reload()
    await expect(presenterPage.locator('main')).toContainText('2 total responses')
    await expect(presenterPage.getByRole('heading', { name: multipleChoiceTitle })).toBeVisible()

    await hostPage.getByRole('button', { name: 'Next slide' }).click()
    await expect(audienceOne.page.getByRole('heading', { name: wordCloudTitle })).toBeVisible()
    await expect(audienceTwo.page.getByRole('heading', { name: wordCloudTitle })).toBeVisible()
    await expect(presenterPage.locator('main')).toContainText(wordCloudTitle)

    await audienceOne.page.getByLabel('Your word').fill('productive')
    await audienceOne.page.getByRole('button', { name: 'Submit word' }).click()
    await expect(audienceOne.page.getByText('Thanks for sharing! Add another word any time.')).toBeVisible()
    await expect(audienceOne.page.getByLabel('Your word')).toBeVisible()
    await expect(presenterPage.locator('main')).toContainText('productive')
    await expect(presenterPage.locator('main')).toContainText('1 total responses')

    await audienceTwo.page.getByLabel('Your word').fill('productive')
    await audienceTwo.page.getByRole('button', { name: 'Submit word' }).click()
    await expect(audienceTwo.page.getByText('Thanks for sharing! Add another word any time.')).toBeVisible()
    await expect(presenterPage.locator('main')).toContainText('2 total responses')

    await presenterPage.setViewportSize({ width: 390, height: 844 })
    await expect(presenterPage.getByText(formattedJoinCode)).toBeVisible()
    await expect(presenterPage.getByRole('heading', { name: wordCloudTitle })).toBeVisible()
  } finally {
    await Promise.all(contexts.reverse().map((context) => context.close()))
  }
})
