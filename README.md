# IT Widget — Local Test Repo

## Structure

```
dist/          Built widget JS (baked with API_BASE=http://127.0.0.1:3001/...)
src/           Widget source (vanilla JS, esbuild)
server/        Express server (Node 18+, ESM)
test.html      Load this in a browser to test the widget
```

## Running locally

**1. Start the server**
```bash
cd server
npm install
OPENCLAW_TOKEN=<your-token> node server.js
```
Server listens on `http://127.0.0.1:3001`.

**2. Serve the test page** (needed for the script tag to load)
```bash
cd ..
npx serve .
# or: python3 -m http.server 8080
```

**3. Open `http://localhost:8080/test.html`** in your browser.

The widget button should appear bottom-right. Identity is hardcoded in `test.html` as `data-username="test.user"` / `data-first-name="Tester"`.

## Running server tests
```bash
cd server
OPENCLAW_TOKEN=test-token node test.js
```
