# 🧾 Profile Counter

A minimal Deno service that tracks per-key hits and exposes a simple SVG counter at `/:key/count.svg`.


---

## Usage

- SVG counter: `GET /:key/count.svg` — increments and returns an SVG image with the current count.
- JSON endpoint: `GET /:key/` — returns `{ key, count }` as JSON.
- Health: `GET /health` — basic health check.

Examples:

```text
https://profile-counter.francorz.deno.net/:key/count.svg
https://profile-counter.francorz.deno.net/:key/count.svg?background=222223&text=feee68
```

You can embed the counter in markdown/HTML:

```html
<img src="https://profile-counter.francorz.deno.net/YOUR_KEY/count.svg" alt="Visitor Count" />
```

---

## Deploy yourself (Deno)

1. **Fork** this repository to your GitHub account.
2. Go to https://console.deno.com/ and **Sign in with GitHub**.
3. **Create a new project** and link it to your forked repository.
4. Set `main.ts` as the **entry point**.
5. **Deploy**.

Or, to test quickly, try the Deno Deploy playground or the Deno playground to run `main.ts` without a local setup.

---

## Credits

This project was recreated from and heavily inspired by https://github.com/YogPanjarale/profile-counter — original repo couldn't be found.