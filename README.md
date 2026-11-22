# Academic Integrity Dilemma: class web activity

Two files serve students and the teacher from GitHub Pages:

- `index.html`: the student page (scenario, points table, code, response)
- `dashboard.html`: the teacher dashboard (passcode required)

Responses are stored in a Google Sheet that you own. A small Apps Script web app
receives submissions and returns data to the dashboard. Students never see the sheet.

## Files

| File | Where it goes | Purpose |
|---|---|---|
| `index.html`, `dashboard.html`, `app.js`, `dashboard.js`, `style.css`, `config.js` | the GitHub repo root | the site |
| `apps-script/Code.gs` | pasted into Apps Script (not uploaded to GitHub) | storage and aggregation |

## One-time setup

### 1. Create the spreadsheet and backend

1. Create a new blank Google Sheet (use a new sheet, not the old one with email addresses).
2. In the sheet, choose **Extensions > Apps Script**.
3. Delete the default code, paste the contents of `apps-script/Code.gs`, and save.
4. Select `setup` in the function dropdown and click **Run**. Approve the permission prompts.
   This creates three tabs: `Submissions`, `Reasons`, and `Settings`.
5. Go to **Project Settings** (gear icon) > **Script properties** > **Add script property**.
   - Property: `TEACHER_PASSCODE`
   - Value: a passcode only you know
6. Click **Deploy > New deployment**, choose **Web app**, then set:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy** and copy the Web app URL (ends in `/exec`).

If you later change `Code.gs`, use **Deploy > Manage deployments > Edit > New version**
so the URL stays the same.

### 2. Connect the site

1. Open `config.js` and replace `PASTE_WEB_APP_URL_HERE` with the URL from step 7.
2. Check that `PAIR_COUNT` matches the number of pairs (15).
3. Upload the files to the repo `eecastro/academic-integrity-dilemma` (or a new repo).
4. In the repo, go to **Settings > Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
5. The student page will be at `https://eecastro.github.io/academic-integrity-dilemma/`
   and the dashboard at `.../dashboard.html`.

Do not put the dashboard link on the student page or in the class handout. Its data is
protected by the passcode, but keep the link to yourself.

### 3. Payoffs and settings

Open the **Settings** tab in the sheet. Edit these values, and the dashboard and student page
will use them immediately:

| Key | Default | Meaning |
|---|---|---|
| `pay_me_blame_partner_silent` | 7 | I blame, partner stays silent |
| `pay_me_silent_partner_silent` | 4 | Both stay silent |
| `pay_me_blame_partner_blame` | 2 | Both blame |
| `pay_me_silent_partner_blame` | 0 | I stay silent, partner blames |
| `extra_credit_cap` | 14 | Maximum extra credit across rounds in one session |

Round and session are controlled from the dashboard (Class settings), not the sheet.

## Running the activity

Before class:

1. Open `dashboard.html`, sign in, and in **Class settings** enter a session name
   (for example `Fall 2026 Period 3`), set round to 1, and check **Accepting responses**.
2. Save settings.

Round 1 (no talking):

1. Students open the student page, pick their pair number, and choose a code.
   The **Suggest a code** button gives an example like `maple-otter-42`.
2. Each student writes the code down and submits.
3. When everyone has finished, uncheck **Accepting responses** or wait until the end.

Round 2 (talking allowed):

1. Set the round to 2, check **Accepting responses**, and save.
2. Students use the **same code** as in Round 1.

Extra credit:

- Dashboard > **Extra credit by code** shows each code's points for each round and the capped total.
- Students bring their code to you. Only you can link codes to names, on your own paper list.
- Codes must be unique within a round. The site rejects a code that is already used.

## Anonymity notes

- The sheet has no names or emails. The dashboard never shows reasoning with a code or pair number.
- The `Submissions` tab links each code to a pair number and round. You can see this, and since
  you assigned pairs, that is expected. Keep the sheet private.
- Students can see the points table but not other students' data.
- A determined student could guess another student's code. That is a risk for extra credit, not
  for responses, so tell students not to share their code.
- Free-text reasoning is removed from any student's code and pair, but a student could still write
  identifying details in the reasoning box. Remind them not to write names.

## Testing before class

1. Submit two test responses using codes `test-one` and `test-two` with pair number 1.
   Check that the dashboard shows a complete pair with points.
2. Try submitting a third response for pair 1. It should be rejected.
3. Try reusing a code in the same round. It should be rejected.
4. On the dashboard, select the test session and click **Delete this session's round** for each round.
   Then change the session name back to your real session.

## Limits and known gaps

- Anyone with the Web app URL can submit responses (that is how students submit). Ask
  students to submit only once. The page blocks a second submission on the same browser, but a
  student who clears browser data could submit again with a different code. Watch for pairs with more
  than two responses; the dashboard flags them.
- Passcode checks happen on the server, but the dashboard HTML itself is public (it shows only a sign-in form).
- Apps Script has daily quotas. A class of about 30 is far below the limit.
- Only rounds 1 and 2 appear in the extra credit table. Settings allow up to 9 rounds for later use.
