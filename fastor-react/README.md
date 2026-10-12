# Fastor React Developer Task

React.js implementation of the Fastor developer assignment: phone signup, six-digit OTP verification, restaurant/menu screen, and item details. The mobile design adapts to a full-width website on laptops. Authentication and restaurant data integrate with Fastor's supplied staging API. This frontend is independent of the Node.js CRM project in the same repository.

## Reviewer quick walkthrough

1. Install and start the app using the commands below.
2. Open [the sample verification screen](http://localhost:5173/verify?phone=9818979450). Enter **123456**, then click **Continue**. This uses the documented staging sample and does not request an SMS.
3. Check the live **Restaurants near you** list; search, open a restaurant, and refresh the list.
4. Open the pizza offer, change its portion/quantity, add it to the cart, then open the cart icon to check the calculated total.
5. Resize the browser to compare the desktop and mobile layouts. Open the account/name button and sign out to check protected routes.

Sample credentials are supplied by the assignment's Postman collection, and were verified during development. Fastor controls their availability. Food/cart/sample-order demonstrations are local; the API provides login and restaurants only.

## Quick start

Requirements: Node.js 22.17 or newer, npm, and internet access to Fastor's staging API.

```powershell
git clone https://github.com/Abdullla-Tamboli/full_stack_project.git
cd full_stack_project/fastor-react
npm ci
npm run dev
```

If the repository is already downloaded, open a terminal in `fastor-react` and run `npm ci` followed by `npm run dev`. These commands also work in macOS/Linux terminals.

Open http://localhost:5173. No local CRM server or MongoDB is needed for this frontend task. API settings have defaults, so `.env` is optional. To override them, copy `.env.example` to `.env` and restart Vite:

```dotenv
VITE_API_BASE_URL=https://staging.fastor.ai
VITE_CITY_ID=118
```

All VITE_ values are public browser configuration. Do not put secrets or JWTs in these variables. To create the optional configuration file, use `Copy-Item .env.example .env` in PowerShell, or `cp .env.example .env` on macOS/Linux.

## Application flow

```text
Phone signup -> Register/request OTP -> Six-digit verification
             -> Login API -> JWT session -> Menu/live restaurants
             -> Sample item detail -> Portion + quantity -> Local cart
             -> Account/sign out -> Signup
```

- A valid Indian mobile number starts the registration request. Errors are displayed before navigation.
- OTP verification supports individual digits, pasting all six digits and the mobile keypad. Resend becomes available after 30 seconds.
- Successful login stores the token and display name in sessionStorage. Protected screens require a non-expired session; a rejected session during restaurant loading signs the user out.
- The restaurant list comes from Fastor, with loading, error, retry and empty states. Search operates on the fetched page.
- Cart rows and totals update when items are added or removed and persist in localStorage. Signing out clears the current session/cart. Sample order cancellations persist separately on this browser.
- Desktop screens show the current device date/time. Phone screens retain the reference styling with a live clock.

## Project structure

```text
fastor-react/
|-- public/assets/             # Reference food-image crops and local Poppins fonts
|-- src/
|   |-- components/
|   |   |-- FoodImage.jsx      # Images with safe fallback
|   |   |-- Icons.jsx          # Inline SVG icons
|   |   |-- Keypad.jsx         # Functional numeric keypad
|   |   |-- Modal.jsx          # Accessible native-dialog sheets
|   |   `-- PhoneFrame.jsx     # Mobile shell, status bar, back button
|   |-- data/menu.js           # Figma sample items, portions, sample orders, cart totals
|   |-- lib/
|   |   |-- api.js             # Fastor API client and response normalization
|   |   `-- storage.js         # Session/cart storage helpers
|   |-- pages/
|   |   |-- Signup.jsx
|   |   |-- Verify.jsx
|   |   |-- Menu.jsx
|   |   `-- ItemDetail.jsx
|   |-- App.jsx                # Routing, protected screens, session and cart state
|   |-- main.jsx
|   `-- styles.css
|-- tests/
|   |-- setup.js
|   |-- api.test.js
|   `-- workflow.test.jsx
|-- .env.example
|-- .gitignore
|-- index.html
|-- package.json
|-- package-lock.json
|-- vite.config.js
|-- README.md
`-- VERIFICATION.md
```

Generated node_modules, dist, .local and any local .env are excluded from Git. The source archive contains source, assets, lockfile, tests and documentation.

## Design reference

Primary Figma reference supplied by the user:
https://www.figma.com/design/3ojakpt78j8wWhqW1yQMnT/Mobile-App-Design-Task?node-id=0-1

API collection from the assignment email:
https://www.postman.com/lunar-sunset-956052/workspace/react-task/collection/8878133-877a3a64-7f42-4f37-bdbe-00c428296471

The four-screen layout, orange buttons, phone/OTP forms, numeric keyboard, food cards, promotion, item detail layout, quantity selector and portions follow the visible reference. Food artwork in public/assets is captured from the supplied reference, not replaced with unrelated stock photographs. Poppins is bundled locally with its font license.

The app adapts to phones, tablets and laptops. At 768px and wider it uses a full-width website header, live local date/time, restaurant grids, and side-by-side item details. Signup and OTP use a split-screen desktop layout with the normal keyboard. On phones the reference layout and functional on-screen keypad are retained. The mobile clock also uses the current device time. Sample menu and order content is labelled; historical sample dates are retained from the design. Exact source-layer metrics and original full-resolution Figma asset exports were unavailable; the app was visually compared to the accessible canvas and uses JPEG reference crops.

## App routes

| Route | Behavior |
| --- | --- |
| / | Phone signup |
| /verify | OTP verification after signup |
| /verify?phone=<10-digit-number> | Verify an OTP already obtained outside this browser tab; does not send an OTP |
| /menu | Menu and live restaurant list; requires a session |
| /item/:id | Sample item detail; requires a session |

Sample item IDs: sushi, rice, pasta, cake, pizza, shake, burger. Refreshing a protected route restores a non-expired session from sessionStorage. Unknown routes redirect to the appropriate signup/menu screen.

## Real API integration

The three requests below are taken from the supplied Postman collection. The app uses form encoding for registration/login and Bearer authentication when fetching restaurants.

### Postman setup

Create a Postman environment with these variables:

| Variable | Value |
| --- | --- |
| apiBaseUrl | https://staging.fastor.ai |
| phone | 9818979450 (documented test number) |
| otp | 123456 (documented staging default) |
| token | Leave empty; populate after login |
| cityId | 118 |

Use the HTTP method separately from the URL. Do not paste `POST` or `GET` into the URL field. Registration/login use **Authorization: No Auth**, **Accept: application/json**, and **Body: x-www-form-urlencoded**, not raw JSON. Postman adds the form Content-Type automatically.

| Request | Postman URL | Body fields | Authorization |
| --- | --- | --- | --- |
| Request/resend OTP | POST {{apiBaseUrl}}/v1/pwa/user/register | phone={{phone}}, dial_code=+91 | No Auth |
| Verify/login | POST {{apiBaseUrl}}/v1/pwa/user/login | phone={{phone}}, otp={{otp}}, dial_code=+91 | No Auth |
| List restaurants | GET {{apiBaseUrl}}/v1/m/restaurant?city_id={{cityId}} | None | Bearer Token: {{token}} |

For the documented sample, start with login; registration is not needed. To test actual OTP delivery, set `phone` to your own number before requesting an OTP; SMS delivery depends on Fastor's staging service.

After a successful login, add this under **Scripts > Post-response** to save the token in the selected environment:

```javascript
const response = pm.response.json();
pm.test('Login returns a session token', () => {
  pm.expect(pm.response.code).to.equal(200);
  pm.expect(response.data.token).to.be.a('string').and.not.empty;
});
if (typeof response.data?.token === 'string' && response.data.token) {
  pm.environment.set('token', response.data.token);
}
```

For the restaurant request, select **Authorization > Bearer Token**, enter `{{token}}`, leave Body set to **none**, and send. The list should be at `data.results`. JWT values should stay in your local environment and should not be committed or included in the submission.

### 1. Register and request OTP

```text
POST https://staging.fastor.ai/v1/pwa/user/register
Content-Type: application/x-www-form-urlencoded
```

Form fields:

```text
phone=<10-digit-mobile-number>
dial_code=+91
```

In Postman select Body > x-www-form-urlencoded. In the app enter a valid Indian mobile number and press Get OTP. The request is anonymous. On success the app opens the OTP screen and starts a 30-second resend timer. Resend calls the same endpoint after the timer expires. Network/API errors stay visible and can be retried.

### 2. Login with OTP

```text
POST https://staging.fastor.ai/v1/pwa/user/login
Content-Type: application/x-www-form-urlencoded
```

Form fields:

```text
phone=<same-mobile-number>
otp=<6-digit-code>
dial_code=+91
```

The collection documents `123456` as its default staging OTP. A successful response supplies the JWT at `response.data.token`.

The app stores only that token and display name in sessionStorage. It discards other profile/password fields returned by the staging response. A missing token or failed status is treated as an error even if the HTTP status is 200. Failed OTP submission keeps the user on the verification screen.

For the collection's documented sample login, without requesting another OTP, open:

```text
http://localhost:5173/verify?phone=9818979450
```

Enter the documented default code `123456`, then Continue. The sample login was verified during development; staging test credentials and availability can change. This does not bypass Fastor's OTP validation.

### 3. Fetch restaurants

```text
GET https://staging.fastor.ai/v1/m/restaurant?city_id=118
Authorization: Bearer <data.token-from-login>
```

No request body. The restaurant API response currently contains:

```json
{
  "status": "Success",
  "status_code": 200,
  "data": {
    "results": [
      {
        "restaurant_id": "75",
        "restaurant_name": "VYB",
        "logo": "https://example.com/restaurant-logo.png",
        "address_complete": "<address>"
      }
    ],
    "meta": { "total_pages": 3, "total_count": 56 }
  }
}
```

The app displays the returned default page in Restaurants near you, below the Figma sample menu. Search filters this fetched page; Refresh re-fetches it. Clicking a restaurant shows its actual logo/name/address. The supplied request does not specify a pagination parameter, so undocumented page-navigation requests are not invented. The tested API returned 20 records on its default page.

The selected city/location text follows the Figma reference. The API returns the configured city_id list; the frontend does not assert or repair geographic accuracy of upstream records. Missing addresses are shown as Address not provided; failed/unsafe image URLs use a food-image fallback. API failures show an error and retry control, never fabricated restaurant results.

## What works locally versus through the API

| Feature | Source of behavior |
| --- | --- |
| Get/resend OTP | Fastor registration API |
| OTP login and JWT | Fastor login API |
| Restaurant list/details/search | Fastor restaurant API; search is client-side |
| Best sellers and popular items | Supplied Figma sample content |
| Quantity/portion changes | React state with calculated item price |
| Cart/add/remove/total | React state persisted in localStorage |
| Sample order cancellation | Removes the sample order on this device |
| Sample order tracking | Reference status sheet; no live driver tracking |

The collection contains no menu, ordering, checkout, cancellation, or tracking endpoints. Local cart/sample-order behavior demonstrates those controls without claiming a server-side order was placed or cancelled. No unsupported checkout/payment API is invented.

The reference mixes rupees for item prices with dollar labels for portions/best sellers. These labels are retained; cart arithmetic treats portion amounts as numeric additions to the displayed item amount and performs no exchange conversion. The pizza's sample base is 4 and Jumbo adds 10, matching the reference's initial displayed 14 with quantity 3.

## Manual test walkthrough

1. Open /. Submit an empty/invalid mobile number: validation should appear without making a registration request.
2. Enter a valid mobile number, click Get OTP, and verify the six-digit screen opens only after the API succeeds. This can send an OTP through the staging service.
3. Enter the code using the keyboard, paste all six digits, or use the on-screen keypad. Invalid/incomplete codes must show an error. Resend is disabled during the countdown.
4. Submit a valid OTP. The app should open /menu and display the real restaurant list beneath the sample menu. For a test that sends no OTP, use the documented sample verification URL above.
5. Search for a returned restaurant such as VYB. Only matching fetched rows should remain. Open it to see its actual details; close the dialog with its button, Escape, or by clicking the backdrop.
6. Click the pizza promotion. Initial quantity is 3 and Jumbo is selected; displayed unit price is 14. Increase quantity to 4 and select Medium; unit price becomes 7. Add to cart and open the receipt/cart icon: that line's total should be 28.
7. Remove a cart item and check its total updates. Reload: the cart persists on this device.
8. Cancel a sample order: confirm removal. Track another sample order: a clearly labelled sample-status sheet opens.
9. Open the account/name button and Sign out. Protected routes must return to signup and the session/cart is cleared.
10. Without signing in, open /item/pizza directly: the app should redirect to signup. An expired restored token should also require login; an upstream 401 during restaurant loading signs the user out.

## Commands and verification

```powershell
npm test
npm run build
npm run preview
```

npm test runs 15 automated checks against mocked API responses. Coverage includes request URLs/form encoding/token headers, staging response shape, failed login/no token, network failures, unsafe image fallback, session expiry, the complete signup-to-OTP-to-menu-to-cart flow, input validation, OTP pasting, protected routes and direct verification links.

The production bundle is written to dist. Vite preview serves it locally; its printed URL is normally http://127.0.0.1:4173. This project is delivered locally, as requested. Production hosts must serve index.html for SPA routes such as /verify and /item/pizza.

Executed results and live/browser checks are documented in [VERIFICATION.md](VERIFICATION.md). Live OTP registration/SMS delivery was not tested; its request contract and UI flow were tested with mocks. Live sample login was successfully verified both directly and through the browser, followed by real restaurant loading. Automated tests mock external requests and do not send SMS.

## GitHub submission

This project lives in the repository's `fastor-react` folder. From the repository root, commit only this frontend's source and documentation:

```powershell
git add fastor-react
git diff --cached --stat
git commit -m "Build responsive Fastor React app with OTP login and restaurant API"
git push origin HEAD
```

The folder's `.gitignore` excludes dependencies, build output, local settings and screenshots. Include `package-lock.json` so reviewers can reproduce installation with `npm ci`. The generated source ZIP is optional and does not need to be committed.

Submit the GitHub link to the `fastor-react` folder on the branch you pushed. On GitHub, open that folder and copy the browser URL; its README will appear beneath the files. Ensure the reviewer can access the repository: use a public repository or give the reviewer access to a private one. No hosted preview is required to run these instructions locally.

Suggested short commit description: **Implement responsive Figma screens, staging OTP/JWT login, live restaurant search, local cart, tests, and setup/API documentation.**

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| Port 5173 occupied | Use the running frontend or stop the previous Vite process; check the actual URL printed by Vite |
| Network/API error | Check internet access and Fastor staging availability, then retry |
| Invalid OTP | Use the correct code for the entered number; the collection's staging default is 123456 |
| No restaurant results | Check the configured city ID or clear the search query |
| HTTP 401 on restaurant request | Log in again; the frontend clears the expired/rejected session |
| Empty cart after browser storage reset | Cart data is local to this device/browser |
| Refresh on a deployed route returns 404 | Configure SPA fallback to index.html |

No JWTs, private credentials or token-bearing submission URLs are included in source; the only sample login values documented are those supplied by the assignment collection. The frontend uses no backend CRM employee accounts.

