import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceSelect } from "@/components/workspace-select";
import { WorkspaceIconButton } from "@/components/workspace-icon-action";
import { MessageCircle, Copy, Plus, ArrowUp, Square } from "lucide-react";
type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; version: number };
async function responseJson(response: Response) {
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "请求失败，请重试。");
  return data;
}
export function WorkspaceAssistant({ scope }: { scope: string }) {
  const [open, setOpen] = useState(false),
    [configured, setConfigured] = useState<boolean | null>(null),
    [conversations, setConversations] = useState<Conversation[]>([]),
    [selected, setSelected] = useState(""),
    [version, setVersion] = useState(0),
    [messages, setMessages] = useState<Message[]>([]),
    [draft, setDraft] = useState(""),
    [partial, setPartial] = useState(""),
    [pending, setPending] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const request = useRef<AbortController | null>(null),
    busy = useRef(false),
    bottom = useRef<HTMLDivElement>(null),
    loadSequence = useRef(0),
    mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [partial, messages]);
  async function refresh() {
    const data = await responseJson(
      await fetch("/api/ai/conversations?scope=" + scope),
    );
    if (mounted.current) setConversations(data.conversations);
  }
  async function load(id: string) {
    if (busy.current) return;
    const sequence = ++loadSequence.current;
    setError("");
    setLoading(true);
    try {
      const status = await responseJson(await fetch("/api/ai/status"));
      if (sequence !== loadSequence.current || !mounted.current) return;
      setConfigured(status.configured);
      await refresh();
      if (sequence !== loadSequence.current || !mounted.current) return;
      if (id) {
        const data = await responseJson(
          await fetch(
            "/api/ai/conversations?scope=" +
              scope +
              "&id=" +
              encodeURIComponent(id),
          ),
        );
        if (sequence !== loadSequence.current || !mounted.current) return;
        setMessages(data.messages);
        setVersion(data.version);
        setSelected(id);
      } else {
        setMessages([]);
        setVersion(0);
        setSelected("");
      }
      setPartial("");
      setNotice("");
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      if (sequence === loadSequence.current && mounted.current)
        setLoading(false);
    }
  }
  useEffect(() => {
    if (open) void load(selected);
  }, [open]);
  async function send() {
    if (busy.current || loading || !configured || !draft.trim()) return;
    const prompt = draft.trim();
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    setPartial("");
    const abort = new AbortController();
    request.current = abort;
    let answer = "",
      done = false,
      currentId = selected;
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          id: selected || undefined,
          version,
          prompt,
        }),
        signal: abort.signal,
      });
      if (!response.ok) {
        await responseJson(response);
        return;
      }
      if (!response.body) throw Error("回复连接不可用");
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = "";
      try {
        for (;;) {
          const chunk = await reader.read();
          buffer += decoder.decode(chunk.value || new Uint8Array(), {
            stream: !chunk.done,
          });
          let end;
          while ((end = buffer.indexOf("\n\n")) >= 0) {
            const event = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const line = event
              .split("\n")
              .find((line) => line.startsWith("data:"));
            if (!line) continue;
            const value = JSON.parse(line.slice(5));
            if (value.type === "start") {
              currentId = value.id;
              setSelected(value.id);
            }
            if (value.type === "delta") {
              answer += value.text;
              setPartial(answer);
            }
            if (value.type === "error") throw Error(value.error);
            if (value.type === "done") {
              done = true;
              setVersion(value.version);
              setMessages([
                ...messages,
                { role: "user", content: prompt },
                { role: "assistant", content: answer },
              ]);
              setDraft("");
              setPartial("");
              setNotice("回答已保存");
            }
          }
          if (chunk.done) break;
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      if (!done) throw Error("回复连接中断，请重新打开会话核对。");
      await refresh();
    } catch (e) {
      if (abort.signal.aborted)
        setError("已停止生成，本轮内容尚未确认保存。问题已保留。");
      else setError(e instanceof Error ? e.message : "发送失败，问题已保留。");
      if (currentId) setSelected(currentId);
    } finally {
      busy.current = false;
      setPending(false);
      request.current = null;
    }
  }
  const currentTitle = conversations.find((c) => c.id === selected)?.title ||
    (selected ? "当前会话" : "新会话");
  const historyOptions = [
    { value: "new", label: "新会话" },
    ...conversations.map((c) => ({ value: c.id, label: c.title || "未命名会话" })),
    ...(selected && !conversations.some((c) => c.id === selected)
      ? [{ value: selected, label: "当前会话" }] : []),
  ];
  const newConversation = () => { void load(""); };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="wb-icon-button"
          aria-label="打开 DeepSeek 助手"
          title="DeepSeek 助手"
        >
          <MessageCircle size={18} aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="wb-assistant">
        <DialogDescription className="sr-only">DeepSeek 聊天会话</DialogDescription>
        <div className="wb-assistant-sidebar" role="complementary" aria-label="会话历史">
          <div className="wb-assistant-brand">
            <MessageCircle size={22} aria-hidden="true" />
            <DialogTitle>DeepSeek</DialogTitle>
          </div>
          <Button variant="outline" disabled={pending || loading} onClick={newConversation}>
            <Plus size={18} aria-hidden="true" />新会话
          </Button>
          <h2 className="wb-assistant-history-label">最近会话</h2>
          <nav className="wb-assistant-history" aria-label="选择聊天记录">
            {conversations.map((conversation) => (
              <Button key={conversation.id} variant="ghost"
                className="wb-assistant-history-item"
                aria-current={selected === conversation.id ? "true" : undefined}
                disabled={pending || loading}
                onClick={() => { void load(conversation.id); }}>
                <MessageCircle size={16} aria-hidden="true" />
                <span title={conversation.title}>{conversation.title || "未命名会话"}</span>
              </Button>
            ))}
          </nav>
          <span className="wb-assistant-scope">{scope === "work" ? "工作空间" : "私人空间"}</span>
        </div>
        <div className="wb-assistant-body">
          <header className="wb-assistant-header">
            <h2 title={currentTitle}>{currentTitle}</h2>
            <span className="wb-assistant-mobile-brand">DeepSeek</span>
          </header>
          <div className="wb-assistant-mobile-history">
            <WorkspaceSelect label="选择聊天记录" value={selected || "new"}
              disabled={pending || loading} options={historyOptions}
              onValueChange={(id) => { void load(id === "new" ? "" : id); }} />
            <WorkspaceIconButton label="新会话" icon={Plus} disabled={pending || loading} onClick={newConversation} />
          </div>
          {configured === false && (
            <div className="wb-assistant-info" role="status">
              <strong>尚未配置 API Key</strong>
              <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">DeepSeek 开放平台 ↗</a>
            </div>
          )}
          {loading && <p role="status">正在读取聊天记录…</p>}
          <div
            className="wb-assistant-messages"
            aria-label="聊天记录"
            aria-busy={pending || loading}
          >
            {!loading && messages.length === 0 && !pending && !partial && (
              <div className="wb-assistant-empty">
                <MessageCircle size={36} aria-hidden="true" />
                <h3>DeepSeek</h3>
              </div>
            )}
            {messages.map((message, index) => (
              <article
                key={index}
                className="wb-assistant-message"
                data-role={message.role}
              >
                <div className="wb-assistant-message-head">
                  <strong>{message.role === "user" ? "你" : "DeepSeek"}</strong>
                  {message.role === "assistant" && (
                    <WorkspaceIconButton
                      label="复制回答"
                      icon={Copy}
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(message.content)
                          .then(
                            () => setNotice("已复制回答"),
                            () => setError("复制失败，请选择回答文字复制。"),
                          );
                      }}
                    />
                  )}
                </div>
                <p>{message.content}</p>
              </article>
            ))}
            {pending && draft.trim() && (
              <article className="wb-assistant-message" data-role="user">
                <strong>你</strong>
                <p>{draft.trim()}</p>
              </article>
            )}
            {pending && draft.trim() && (
              <article className="wb-assistant-message" data-role="assistant">
                <strong>DeepSeek</strong>
                <p>{partial || "正在生成回答…"}</p>
              </article>
            )}
            {!pending && partial && error && (
              <article className="wb-assistant-message" data-role="assistant">
                <strong>未完成的回答</strong>
                <p>{partial}</p>
              </article>
            )}
            <div ref={bottom} />
          </div>
          {error && (
            <div className="wb-assistant-error" role="alert">
              <p>{error}</p>
              <Button
                variant="outline"
                disabled={pending || loading}
                onClick={() => {
                  void load(selected);
                }}
              >
                重新读取会话
              </Button>
            </div>
          )}
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="wb-assistant-composer"
          >
            <label className="sr-only" htmlFor={"assistant-prompt-" + scope}>你的问题</label>
            <Textarea
              id={"assistant-prompt-" + scope}
              value={pending ? "" : draft}
              maxLength={8000}
              disabled={pending}
              placeholder="发送消息…"
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className="wb-assistant-actions">
              <p className="wb-assistant-feedback" role="status">{notice}</p>
              {pending ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={(event) => {
                    event.preventDefault();
                    request.current?.abort();
                  }}
                >
                  <Square size={16} aria-hidden="true" />停止生成
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!configured || loading || !draft.trim()}
                >
                  <ArrowUp size={18} aria-hidden="true" />发送
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
