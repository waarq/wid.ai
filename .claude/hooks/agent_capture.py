#!/usr/bin/env python3
"""Claude Code hook: append every prompt and final response to .agent-logs/.

Wired in .claude/settings.json:
  SessionStart     -> session-start  remembers the session model for the first prompt
  UserPromptSubmit -> prompt         logs the prompt verbatim, as submitted
  Stop             -> response       logs the final assistant message of the turn

Only the prompt and the final response are logged: no thinking, tool calls or
intermediate text. Never writes to stdout (UserPromptSubmit stdout is injected
into the model's context) and always exits 0, so a logging failure can't block
a turn. Errors go to .git/agent-capture/errors.log.
"""
import fcntl
import glob
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import traceback
from datetime import datetime, timezone

TOOL = "claude-code"
LOG_DIR = ".agent-logs"
ENTRY_RE = re.compile(r"^\[LOG_ENTRY ", re.M)


def now_iso():
    d = datetime.now(timezone.utc)
    return d.strftime("%Y-%m-%dT%H:%M:%S.") + f"{d.microsecond // 1000:03d}Z"


def git(proj, *args):
    try:
        out = subprocess.run(["git", "-C", proj, *args], capture_output=True, text=True, timeout=5)
        return out.stdout.strip()
    except Exception:
        return ""


def origin_parts(proj):
    url = git(proj, "remote", "get-url", "origin")
    m = re.search(r"github\.com[:/]([^/]+)/(.+?)(?:\.git)?/?$", url)
    return (m.group(1), m.group(2)) if m else (None, None)


def author(proj):
    return (os.environ.get("AGENT_LOG_AUTHOR") or git(proj, "config", "github.user")
            or origin_parts(proj)[0] or git(proj, "config", "user.name") or "unknown")


def project_name(proj):
    return (os.environ.get("AGENT_LOG_PROJECT") or origin_parts(proj)[1]
            or os.path.basename(proj.rstrip("/")))


def state_dir(proj):
    # Per-session bookkeeping lives inside .git so it is never committed.
    gitdir = os.path.join(proj, ".git")
    base = (os.path.join(gitdir, "agent-capture") if os.path.isdir(gitdir)
            else os.path.join(tempfile.gettempdir(), "agent-capture"))
    os.makedirs(base, exist_ok=True)
    return base


# --- transcript --------------------------------------------------------------

def read_transcript(path):
    entries = []
    if not path or not os.path.exists(path):
        return entries
    with open(path, encoding="utf-8") as f:
        for line in f:
            try:
                entries.append(json.loads(line))
            except ValueError:
                pass  # a partially flushed last line
    return entries


def blocks(msg):
    content = (msg or {}).get("content")
    if isinstance(content, str):
        return [{"type": "text", "text": content}]
    return content or []


def last_model(entries):
    for e in reversed(entries):
        if e.get("type") == "assistant" and not e.get("isSidechain"):
            model = (e.get("message") or {}).get("model")
            if model and model != "<synthetic>":
                return model
    return None


def final_response(entries):
    """Text of the assistant messages after the last user entry (prompt or tool
    result): the turn's final answer, without thinking or tool calls."""
    texts, model, seen = [], None, set()
    for e in reversed(entries):
        if e.get("isSidechain"):
            continue
        if e.get("type") == "user":
            break
        if e.get("type") != "assistant":
            continue
        msg = e.get("message") or {}
        model = model or msg.get("model")
        for b in reversed(blocks(msg)):
            if b.get("type") == "text" and b.get("text"):
                key = (msg.get("id"), b["text"])
                if key not in seen:
                    seen.add(key)
                    texts.append(b["text"])
    return "\n\n".join(reversed(texts)), model


def last_user_prompt(entries):
    for e in reversed(entries):
        if e.get("type") != "user" or e.get("isSidechain") or e.get("isMeta"):
            continue
        parts = [b for b in blocks(e.get("message")) if b.get("type") in ("text", "tool_result")]
        if not parts or any(b["type"] == "tool_result" for b in parts):
            continue
        text = "\n\n".join(b.get("text", "") for b in parts)
        if text.lstrip().startswith(("<command-", "<local-command", "<task-notification")):
            continue
        return text, e.get("timestamp")
    return None, None


# --- log file ----------------------------------------------------------------

def header(st, sid):
    first, last = st["first_prompt_time"], st["last_prompt_time"]
    return (
        "---\n"
        f"session_id: {sid}\n"
        f"date: {first[:10]}\n"
        f"author: {st['author']}\n"
        f"model: {', '.join(st['models']) or 'unknown'}\n"
        f"tool: {TOOL}\n"
        f"project: {st['project']}\n"
        f"total_exchanges: {st['prompts']}\n"
        f"first_prompt_time: {first}\n"
        f"last_prompt_time: {last}\n"
        "---\n\n"
        f"# Session Log - {first[:10]}\n\n"
        f"Session: `{sid[:8]}` | Project: `{st['project']}` | Author: `{st['author']}`\n\n"
        "---\n\n"
    )


def entry(kind, num, sid, ts, model, text, note=None):
    out = f"[LOG_ENTRY type={kind} num={num} session={sid[:8]}]\ntimestamp: {ts}\nmodel: {model}\n"
    if note:
        out += f"note: {note}\n"
    text = text if text.endswith("\n") else text + "\n"
    return out + "\n" + text + "\n\n"


def append(proj, sid, st, chunk):
    """Rewrite the front matter (counts, last time) and append the entry. Entries
    already in the file are carried over byte for byte."""
    path = st["file"]
    body = ""
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            existing = f.read()
        m = ENTRY_RE.search(existing)
        body = existing[m.start():] if m else ""
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(header(st, sid) + body + chunk)
    os.replace(tmp, path)


def load_state(proj, sid, ts):
    path = os.path.join(state_dir(proj), f"{sid}.json")
    st = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            st = json.load(f)
    st.setdefault("prompts", 0)
    st.setdefault("models", [])
    st.setdefault("author", author(proj))
    st.setdefault("project", project_name(proj))
    if not st.get("file"):
        found = sorted(glob.glob(os.path.join(proj, LOG_DIR, f"*_{sid}.md")))
        if found:
            st["file"] = found[0]
        else:
            stamp = datetime.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S").strftime("%Y-%m-%d_%H-%M-%S")
            st["file"] = os.path.join(proj, LOG_DIR, f"{stamp}_{sid}.md")
    return path, st


def save_state(path, st):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(st, f, indent=2)


def note_model(st, model):
    if model and model != "unknown" and model not in st["models"]:
        st["models"].append(model)


# --- events ------------------------------------------------------------------

def on_session_start(proj, sid, hook):
    spath, st = load_state(proj, sid, now_iso())
    if hook.get("model"):
        st["session_model"] = hook["model"]
    save_state(spath, st)


def log_prompt(proj, sid, st, text, ts, model, note=None):
    st["prompts"] += 1
    st.setdefault("first_prompt_time", ts)
    st["last_prompt_time"] = ts
    note_model(st, model)
    append(proj, sid, st, entry("PROMPT", st["prompts"], sid, ts, model, text, note))


def on_prompt(proj, sid, hook):
    ts = now_iso()
    spath, st = load_state(proj, sid, ts)
    entries = read_transcript(hook.get("transcript_path"))
    model = last_model(entries) or st.get("session_model") or "unknown"
    log_prompt(proj, sid, st, hook.get("prompt", ""), ts, model)
    save_state(spath, st)


def on_response(proj, sid, hook):
    ts = now_iso()
    tpath = hook.get("transcript_path")
    text, model = "", None
    for _ in range(5):  # the transcript can lag the Stop event by a moment
        entries = read_transcript(tpath)
        text, model = final_response(entries)
        if text:
            break
        time.sleep(0.3)
    if not text:
        text = hook.get("last_assistant_message") or ""
    spath, st = load_state(proj, sid, ts)
    model = model or last_model(entries) or st.get("session_model") or "unknown"
    if st["prompts"] == 0:
        # The prompt hook did not fire for this session's prompt (hooks installed
        # mid-session). Recover the prompt from the transcript and say so.
        ptext, pts = last_user_prompt(entries)
        if ptext is not None:
            log_prompt(proj, sid, st, ptext, pts or ts, model,
                       note="recovered from transcript; UserPromptSubmit hook was not active yet")
    note_model(st, model)
    append(proj, sid, st, entry("RESPONSE", st["prompts"], sid, ts, model, text))
    save_state(spath, st)


def main():
    event = sys.argv[1] if len(sys.argv) > 1 else ""
    raw = sys.stdin.read()
    hook = json.loads(raw) if raw.strip() else {}
    proj = os.environ.get("CLAUDE_PROJECT_DIR") or hook.get("cwd") or os.getcwd()
    sid = hook.get("session_id") or "unknown-session"
    os.makedirs(os.path.join(proj, LOG_DIR), exist_ok=True)
    with open(os.path.join(state_dir(proj), "lock"), "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        {"session-start": on_session_start, "prompt": on_prompt, "response": on_response}[event](proj, sid, hook)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        try:
            proj = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
            with open(os.path.join(state_dir(proj), "errors.log"), "a") as f:
                f.write(f"{now_iso()} {sys.argv[1:]}\n{traceback.format_exc()}\n")
        except Exception:
            pass
    sys.exit(0)
