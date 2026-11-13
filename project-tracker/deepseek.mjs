import { readBoundedText, RequestBodyLimitError } from "./request-body.mjs";
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
export function validChatInput(value) {
  return (
    value &&
    ["work", "personal"].includes(value.scope) &&
    typeof value.prompt === "string" &&
    value.prompt.trim().length > 0 &&
    value.prompt.length <= 8000 &&
    (!value.id ||
      (typeof value.id === "string" && /^[a-f0-9-]{36}$/.test(value.id))) &&
    Number.isSafeInteger(value.version) &&
    value.version >= 0
  );
}
export async function readDeepseekStream(body, onText) {
  const reader = body.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    finished = false;
  try {
    for (;;) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value || new Uint8Array(), {
        stream: !chunk.done,
      });
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end).replace(/\r$/, "");
        buffer = buffer.slice(end + 1);
        if (!line.startsWith("data:")) continue;
        const text = line.slice(5).trim();
        if (text === "[DONE]") {
          finished = true;
          continue;
        }
        if (!text) continue;
        const event = JSON.parse(text);
        if (event.error) throw Error("模型返回错误");
        const choice = event.choices?.[0];
        if (
          choice?.finish_reason &&
          !["stop", "length"].includes(choice.finish_reason)
        )
          throw Error("模型回复中断");
        const content = choice?.delta?.content;
        if (typeof content === "string") await onText(content);
      }
      if (buffer.length > 1000000) throw Error("回复数据异常");
      if (chunk.done) break;
    }
    if (!finished) throw Error("回复连接中断");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
async function schema(db) {
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS ai_conversations (id TEXT PRIMARY KEY, owner TEXT NOT NULL, scope TEXT NOT NULL, title TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, lock_token TEXT, locked_until INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)",
    )
    .run();
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS ai_daily_usage (id TEXT PRIMARY KEY, count INTEGER NOT NULL)",
    )
    .run();
}
export async function deepseekRoute(
  request,
  env,
  ctx,
  { fetchModel = fetch } = {},
) {
  const url = new URL(request.url),
    scope = url.searchParams.get("scope");
  if (
    (url.pathname === "/api/ai/chat" && request.method !== "POST") ||
    (url.pathname === "/api/ai/conversations" && request.method !== "GET") ||
    (url.pathname === "/api/ai/status" && request.method !== "GET")
  )
    return json({ error: "不支持此请求" }, 405);
  if (request.method === "GET" && url.pathname === "/api/ai/status")
    return json({
      configured: !!env.DEEPSEEK_API_KEY,
      model: env.DEEPSEEK_MODEL || "deepseek-flash",
    });
  if (request.method !== "GET" && request.method !== "POST")
    return json({ error: "不支持此请求" }, 405);
  if (request.method === "GET" && !["work", "personal"].includes(scope))
    return json({ error: "空间无效" }, 400);
  if (
    request.method === "POST" &&
    (request.headers.get("Origin") !== url.origin ||
      !request.headers.get("Content-Type")?.includes("application/json"))
  )
    return json({ error: "请求来源或格式无效" }, 403);
  let input;
  if (request.method === "POST") {
    if (!env.DEEPSEEK_API_KEY)
      return json(
        { error: "DeepSeek 尚未配置 API Key，请在服务器安全配置后使用。" },
        503,
      );
    try {
      input = JSON.parse(await readBoundedText(request, 40000));
    } catch (e) {
      return json(
        {
          error:
            e instanceof RequestBodyLimitError
              ? "问题内容过长"
              : "请求格式无效",
        },
        e instanceof RequestBodyLimitError ? 413 : 400,
      );
    }
    if (!validChatInput(input))
      return json({ error: "请输入不超过 8000 字的问题" }, 400);
  }
  await schema(env.DB);
  const owner = env.TRACKER_USER;
  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    if (id) {
      const row = await env.DB.prepare(
        "SELECT id,title,payload,version FROM ai_conversations WHERE id=? AND owner=? AND scope=?",
      )
        .bind(id, owner, scope)
        .first();
      return row
        ? json({
            ...row,
            messages: JSON.parse(row.payload),
            payload: undefined,
          })
        : json({ error: "会话不存在" }, 404);
    }
    const rows = await env.DB.prepare(
      "SELECT id,title,version,updated_at FROM ai_conversations WHERE owner=? AND scope=? AND version>0 ORDER BY updated_at DESC LIMIT 30",
    )
      .bind(owner, scope)
      .all();
    return json({ conversations: rows.results });
  }
  const day = new Date(Date.now() + 28800000).toISOString().slice(0, 10),
    usage = owner + ":" + day;
  await env.DB.prepare(
    "INSERT INTO ai_daily_usage(id,count) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET count=count+1",
  )
    .bind(usage)
    .run();
  const count = await env.DB.prepare(
    "SELECT count FROM ai_daily_usage WHERE id=?",
  )
    .bind(usage)
    .first();
  if (count.count > 100)
    return json({ error: "今日 AI 请求已达 100 次，请明天再试。" }, 429);
  let row;
  if (input.id) {
    row = await env.DB.prepare(
      "SELECT * FROM ai_conversations WHERE id=? AND owner=? AND scope=?",
    )
      .bind(input.id, owner, input.scope)
      .first();
    if (!row) return json({ error: "会话不存在" }, 404);
  } else {
    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO ai_conversations(id,owner,scope,title,payload,version,updated_at) VALUES (?,?,?,?,?,0,?)",
    )
      .bind(
        id,
        owner,
        input.scope,
        input.prompt.trim().slice(0, 50),
        "[]",
        Date.now(),
      )
      .run();
    row = { id, payload: "[]", version: 0 };
  }
  const token = crypto.randomUUID(),
    now = Date.now();
  const locked = await env.DB.prepare(
    "UPDATE ai_conversations SET lock_token=?,locked_until=? WHERE id=? AND owner=? AND version=? AND locked_until<?",
  )
    .bind(token, now + 150000, row.id, owner, input.version, now)
    .run();
  if (!locked.meta.changes)
    return json(
      { error: "会话已更新或正在生成，请重新打开会话后再发送。" },
      409,
    );
  const release = () =>
    env.DB.prepare(
      "UPDATE ai_conversations SET lock_token=NULL,locked_until=0 WHERE id=? AND lock_token=?",
    )
      .bind(row.id, token)
      .run();
  const messages = JSON.parse(row.payload);
  if (messages.length >= 40) {
    await release();
    return json({ error: "此会话已达 20 轮，请新建会话。" }, 400);
  }
  const next = [...messages, { role: "user", content: input.prompt.trim() }];
  const abort = new AbortController(),
    timeout = setTimeout(() => abort.abort(), 120000);
  const onAbort = () => abort.abort();
  request.signal.addEventListener("abort", onAbort, { once: true });
  let upstream;
  try {
    upstream = await fetchModel("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + env.DEEPSEEK_API_KEY,
      },
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL || "deepseek-flash",
        messages: [
          {
            role: "system",
            content:
              "你是工作台中的中文助手。根据用户输入回答，未知信息明确说明，不声称访问了未提供的项目、网页或文件。",
          },
          ...next,
        ],
        stream: true,
        max_tokens: 2048,
        thinking: { type: "disabled" },
      }),
      signal: abort.signal,
    });
  } catch {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", onAbort);
    await release();
    return json({ error: "DeepSeek 连接失败或超时，请稍后重试。" }, 502);
  }
  if (!upstream.ok || !upstream.body) {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", onAbort);
    await upstream.body?.cancel();
    await release();
    return json(
      {
        error:
          upstream.status === 401
            ? "DeepSeek 密钥无效，请检查服务器配置。"
            : upstream.status === 402
              ? "DeepSeek 余额不足，请在开放平台充值。"
              : upstream.status === 429
                ? "DeepSeek 请求繁忙，请稍后重试。"
                : "DeepSeek 服务暂不可用，请稍后重试。",
      },
      502,
    );
  }
  const output = new TransformStream(),
    writer = output.writable.getWriter(),
    encoder = new TextEncoder();
  const emit = (value) =>
    writer.write(encoder.encode("data: " + JSON.stringify(value) + "\n\n"));
  const task = (async () => {
    let answer = "";
    try {
      await emit({ type: "start", id: row.id, version: row.version });
      await readDeepseekStream(upstream.body, async (text) => {
        answer += text;
        if (answer.length > 100000) throw Error("回复过长");
        await emit({ type: "delta", text });
      });
      // Persist the complete turn before acknowledging success to the browser.
      if (!answer.trim()) throw Error("未收到回答");
      const saved = await env.DB.prepare(
        "UPDATE ai_conversations SET payload=?,version=version+1,lock_token=NULL,locked_until=0,updated_at=? WHERE id=? AND lock_token=?",
      )
        .bind(
          JSON.stringify([...next, { role: "assistant", content: answer }]),
          Date.now(),
          row.id,
          token,
        )
        .run();
      if (!saved.meta.changes) throw Error("会话保存冲突");
      await emit({ type: "done", id: row.id, version: row.version + 1 });
    } catch {
      await release();
      await emit({
        type: "error",
        error: "生成或保存中断，本轮未确认保存。请重新打开会话核对后重试。",
      }).catch(() => {});
    } finally {
      clearTimeout(timeout);
      request.signal.removeEventListener("abort", onAbort);
      await writer.close().catch(() => {});
    }
  })();
  ctx?.waitUntil(task);
  return new Response(output.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
