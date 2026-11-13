import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { deepseekRoute, readDeepseekStream } from "../deepseek.mjs";
import worker from "../worker.mjs";
function environment() {
  const db = new DatabaseSync(":memory:");
  return {
    TRACKER_USER: "owner",
    TRACKER_PASSWORD: "password",
    DEEPSEEK_API_KEY: "test-secret",
    DB: {
      prepare(sql) {
        const statement = db.prepare(sql);
        let args = [];
        return {
          bind(...values) {
            args = values;
            return this;
          },
          async run() {
            return { meta: statement.run(...args) };
          },
          async first() {
            return statement.get(...args) || null;
          },
          async all() {
            return { results: statement.all(...args) };
          },
        };
      },
    },
  };
}
const request = (path, body, origin = "https://test.local") =>
  new Request("https://test.local/api/ai/" + path, {
    method: body ? "POST" : "GET",
    headers: { Origin: origin, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const prompt = { scope: "work", prompt: "测试问题", version: 0 };
const model = async () =>
  new Response(
    'data: {"choices":[{"delta":{"content":"第一段"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"第二段"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
  );
test("DeepSeek routes require existing login and reject missing keys and cross-origin requests", async () => {
  const env = environment();
  assert.equal((await worker.fetch(request("status"), env)).status, 401);
  assert.equal(
    (
      await deepseekRoute(request("chat", prompt), {
        ...env,
        DEEPSEEK_API_KEY: "",
      })
    ).status,
    503,
  );
  assert.equal(
    (await deepseekRoute(request("chat", prompt, "https://evil.local"), env))
      .status,
    403,
  );
  assert.equal(
    (
      await deepseekRoute(
        request("chat", { ...prompt, prompt: "x".repeat(8001) }),
        env,
      )
    ).status,
    400,
  );
  assert.equal(
    (await deepseekRoute(request("conversations"), env)).status,
    400,
  );
  assert.equal((await deepseekRoute(request("chat"), env)).status, 405);
});
test("DeepSeek streams, persists full turns, isolates scope/owner and rejects stale versions", async () => {
  const env = environment(),
    tasks = [],
    ctx = {
      waitUntil(task) {
        tasks.push(task);
      },
    };
  const response = await deepseekRoute(request("chat", prompt), env, ctx, {
    fetchModel: model,
  });
  assert.equal(response.status, 200);
  const text = await response.text();
  await Promise.all(tasks);
  assert.match(text, /第一段/);
  assert.match(text, /第二段/);
  assert.match(text, /"type":"done"/);
  assert.ok(!text.includes(env.DEEPSEEK_API_KEY));
  const list = await (
    await deepseekRoute(request("conversations?scope=work"), env)
  ).json();
  assert.equal(list.conversations.length, 1);
  const id = list.conversations[0].id;
  const detail = await (
    await deepseekRoute(request("conversations?scope=work&id=" + id), env)
  ).json();
  assert.deepEqual(detail.messages, [
    { role: "user", content: "测试问题" },
    { role: "assistant", content: "第一段第二段" },
  ]);
  assert.equal(detail.version, 1);
  assert.equal(
    (await deepseekRoute(request("conversations?scope=personal&id=" + id), env))
      .status,
    404,
  );
  assert.equal(
    (
      await deepseekRoute(request("conversations?scope=work&id=" + id), {
        ...env,
        TRACKER_USER: "other",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await deepseekRoute(request("chat", { ...prompt, id }), env, ctx, {
        fetchModel: model,
      })
    ).status,
    409,
  );
  const next = await deepseekRoute(
    request("chat", { ...prompt, id, version: 1 }),
    env,
    ctx,
    { fetchModel: model },
  );
  await next.text();
  await Promise.all(tasks);
  assert.equal(
    (
      await (
        await deepseekRoute(request("conversations?scope=work&id=" + id), env)
      ).json()
    ).messages.length,
    4,
  );
});
test("DeepSeek upstream failure and truncated streams never persist a completed turn", async () => {
  const env = environment(),
    tasks = [],
    ctx = {
      waitUntil(t) {
        tasks.push(t);
      },
    };
  assert.equal(
    (
      await deepseekRoute(request("chat", prompt), env, ctx, {
        fetchModel: async () =>
          new Response("secret provider details", { status: 401 }),
      })
    ).status,
    502,
  );
  const response = await deepseekRoute(request("chat", prompt), env, ctx, {
    fetchModel: async () =>
      new Response('data: {"choices":[{"delta":{"content":"不完整"}}]}\n\n'),
  });
  assert.match(await response.text(), /"type":"error"/);
  await Promise.all(tasks);
  assert.equal(
    (
      await (
        await deepseekRoute(request("conversations?scope=work"), env)
      ).json()
    ).conversations.length,
    0,
  );
  env.DB.prepare("UPDATE ai_daily_usage SET count=100").run();
  assert.equal(
    (
      await deepseekRoute(request("chat", prompt), env, ctx, {
        fetchModel: model,
      })
    ).status,
    429,
  );
});
test("SSE decoder handles byte splits and multibyte Chinese", async () => {
  const bytes = new TextEncoder().encode(
    'data: {"choices":[{"delta":{"content":"中文"}}]}\n\ndata: [DONE]\n\n',
  );
  let answer = "";
  await readDeepseekStream(
    new ReadableStream({
      start(c) {
        for (const byte of bytes) c.enqueue(Uint8Array.of(byte));
        c.close();
      },
    }),
    (text) => {
      answer += text;
    },
  );
  assert.equal(answer, "中文");
});
