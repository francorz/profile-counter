import { Application, Router, Context } from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const router = new Router();

const kv = await Deno.openKv();

const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");
const NOTIFY_KEYS = Deno.env.get("NOTIFY_KEYS") || "";
const PORT = Deno.env.get("PORT") || "3000";

console.log("[INFO] Deno KV connected");

const PLACES = 7;
const DEFAULT_BACKGROUND = "#000000";
const DEFAULT_TEXT = "#00FF13";

function checkKeyInProfileKeys(profileKeys: string, givenKey: string): boolean {
  if (!profileKeys) return false;
  return profileKeys.split(',').map(key => key.trim()).includes(givenKey);
}

function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
}

function normalizeColor(color: string): string {
  if (color.length === 4) {
    return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return color;
}

export function makeSvg(count: number, backgroundColor: string, textColor: string) {
  const countArray = count.toString().padStart(PLACES, "0").split("");
  const parts = countArray.reduce(
    (acc, next, index) =>
      `${acc}
       <rect fill="${backgroundColor}" x="${index * 32}" width="29" height="29"></rect>
       <text font-family="Courier" font-size="24" font-weight="normal" fill="${textColor}">
           <tspan x="${index * 32 + 7}" y="22">${next}</tspan>
       </text>
`,
    ""
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="${PLACES * 32}px" height="30px" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <title>Count</title>
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        ${parts}
      </g>
  </svg>
  `;
}

router.get("/:key/count.svg", async (context: Context) => {
  try {
    const { key } = context.params;
    
    const url = new URL(context.request.url);
    let backgroundColor = url.searchParams.get("background") || DEFAULT_BACKGROUND;
    let textColor = url.searchParams.get("text") || DEFAULT_TEXT;
    
    if (!backgroundColor.startsWith('#')) {
      backgroundColor = '#' + backgroundColor;
    }
    if (!textColor.startsWith('#')) {
      textColor = '#' + textColor;
    }
    
    if (!isValidHexColor(backgroundColor)) {
      console.warn(`[WARN] Invalid background color: ${backgroundColor}, using default`);
      backgroundColor = DEFAULT_BACKGROUND;
    }
    if (!isValidHexColor(textColor)) {
      console.warn(`[WARN] Invalid text color: ${textColor}, using default`);
      textColor = DEFAULT_TEXT;
    }
    
    backgroundColor = normalizeColor(backgroundColor);
    textColor = normalizeColor(textColor);
    
    const result = await kv.get<number>(["counter", key]);
    let count = result.value || 0;
    count++;
    await kv.set(["counter", key], count);
    
    console.log(`[LOG] ${key}: ${count} (bg: ${backgroundColor}, text: ${textColor})`);
    
    if (DISCORD_WEBHOOK_URL && checkKeyInProfileKeys(NOTIFY_KEYS, key)) {
      try {
        await fetch(DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `Hit count for ${key}: ${count} at <t:${Math.round(new Date().getTime()/1000)}:f>`,
          }),
        });
      } catch (err) {
        console.error("[DISCORD] webhook error:", err);
      }
    }
    
    const svg = makeSvg(count, backgroundColor, textColor);
    context.response.headers.set("Content-Type", "image/svg+xml");
    context.response.headers.set("Cache-Control", "max-age=0, no-cache, no-store, must-revalidate");
    context.response.body = svg;
  } catch (error) {
    console.error("[ERROR]", error);
    context.response.status = 500;
    context.response.body = "Internal Server Error";
  }
});

router.get("/:key/", async (context: Context) => {
  try {
    const { key } = context.params;
    const result = await kv.get<number>(["counter", key]);
    const count = result.value || 0;
    
    context.response.headers.set("Content-Type", "application/json");
    context.response.body = JSON.stringify({ key, count });
  } catch (error) {
    console.error("[ERROR]", error);
    context.response.status = 500;
    context.response.body = "Internal Server Error";
  }
});

router.get("/health", (context: Context) => {
  context.response.body = { 
    status: "ok", 
    database: "Deno KV",
    timestamp: new Date().toISOString(),
    if_you_read_this: "VI VON ZULUL"
  };
});

router.get("/", (context: Context) => {
  context.response.headers.set("Content-Type", "text/html; charset=utf-8");
  context.response.body = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Profile Counter</title>
        <meta property="og:image" content="https://i.imgur.com/r98XIfF.png">
        <link rel="icon" type="image/png" href="https://i.imgur.com/gQIcqg8.png">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
            padding: 40px;
            background: #0d1117;
            color: #c9d1d9;
            line-height: 1.6;
          }
          h1 { color: #58a6ff; }
          h2 { color: #79c0ff; margin-top: 30px; }
          code {
            background: #161b22;
            padding: 2px 6px;
            border-radius: 3px;
            color: #79c0ff;
            font-size: 14px;
          }
          pre {
            background: #161b22;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            border: 1px solid #30363d;
          }
          .example {
            background: #161b22;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
            border: 1px solid #30363d;
          }
          .counter-demo {
            margin: 10px 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          a { color: #58a6ff; text-decoration: none; }
          a:hover { text-decoration: underline; }
          ul { margin: 10px 0; }
          li { margin: 8px 0; }
        </style>
      </head>
      <body>
        <h1>🗒️ Profile Counter API</h1>

        <h2>Usage</h2>
        <p>Basic usage:</p>
        <pre><code>https://profile-counter.francorz.deno.net/:key/count.svg</code></pre>

        <p>With custom colors:</p>
        <pre><code>https://profile-counter.francorz.deno.net/:key/count.svg?background=222223&text=feee68</code></pre>

        <h2>Query Parameters</h2>
        <ul>
          <li><code>background</code> - Background color (hex code)</li>
          <li><code>text</code> - Text color (hex code)</li>
        </ul>
        <p><small>The # symbol is optional in hex codes</small></p>

        <h2>Examples</h2>
        
        <div class="example">
          <h3>Default (Black & Green)</h3>
          <div class="counter-demo">
            <img src="/demo1-nobody-should-guess-this/count.svg" alt="Default counter"/>
            <code>/YOUR_KEY/count.svg</code>
          </div>
        </div>

        <div class="example">
          <h3>Dark Gray & Yellow</h3>
          <div class="counter-demo">
            <img src="/demo2-nobody-should-guess-this/count.svg?background=222223&text=feee68" alt="Custom counter"/>
            <code>/YOUR_KEY/count.svg?background=222223&text=feee68</code>
          </div>
        </div>

        <div class="example">
          <h3>Blue & White</h3>
          <div class="counter-demo">
            <img src="/demo3-nobody-should-guess-this/count.svg?background=1a1f3a&text=ffffff" alt="Blue counter"/>
            <code>/YOUR_KEY/count.svg?background=1a1f3a&text=ffffff</code>
          </div>
        </div>

        <div class="example">
          <h3>Purple & Cyan</h3>
          <div class="counter-demo">
            <img src="/demo4-nobody-should-guess-this/count.svg?background=2d1b69&text=00ffff" alt="Purple counter"/>
            <code>/YOUR_KEY/count.svg?background=2d1b69&text=00ffff</code>
          </div>
        </div>

        <div class="example">
          <h3>Red & Gold</h3>
          <div class="counter-demo">
            <img src="/demo5-nobody-should-guess-this/count.svg?background=4a0000&text=ffd700" alt="Red counter"/>
            <code>/YOUR_KEY/count.svg?background=4a0000&text=ffd700</code>
          </div>
        </div>

        <h2>Other Endpoints</h2>
        <ul>
          <li><a href="/health">GET /health</a> - Health check</li>
          <li><code>GET /:key/</code> - Get count as JSON</li>
        </ul>

        <h2>How to Use in Your README</h2>
        <pre><code>&lt;img src="https://profile-counter.francorz.deno.net/YOUR_KEY/count.svg" alt="Visitor Count" /&gt;</code></pre>

        <p style="margin-top: 40px; color: #8b949e; font-size: 14px;">
          Made with 💚 using Deno Deploy
        </p>
      </body>
    </html>
  `;
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log(`[INFO] Server is running on port ${PORT}`);
await app.listen({ port: parseInt(PORT) });