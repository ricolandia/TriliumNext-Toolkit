# AI Chat inside Trilium (No-Code Approach)

An experimental, command-driven AI chat interface built directly into Trilium Notes, using OpenRouter. 

## Features

* **Context-Aware:** Load any active note as the context for the AI prompt.
* **Quick Commands:**
  * `📄 Resumo`: Generates a complete summary of the note, preserving links and bibliography.
  * `🔀 Mermaid`: Generates a Mermaid.js diagram (flowchart/mindmap) based on note relations.
  * `💡 Insights`: Extracts key insights, open questions, and blind spots.
  * `🖥️ Slides`: Generates an HTML-based slide presentation layout based on the text.
* **Save Conversations:** Easily save the chat log as a child note of your context note.

## Setup Requirements

1. Import the plugin code as a `JS Frontend` note.
2. You must create a configuration note named `AI Chat - Config`.
3. Inside the config note, add your API keys in the text:
   `openrouter_key: YOUR_API_KEY_HERE`
   `model: anthropic/claude-3.5-sonnet` (or your preferred model).
   
   
### Images  

![screen capture](imagens/chat-1-.webp)
![screen capture](imagens/chat-2-.webp)
   
## Improvements

### UI / Layout
- **Markdown rendering** — AI responses now render bold, code blocks, lists, tables, links, images, and blockquotes using `marked` + `DOMPurify` (loaded via CDN, graceful fallback to plain text if offline)
- **Monochromatic icons** — All colorful emoji replaced with Unicode symbols (`✎`, `▲`, `⌕`, `⎘`, `↻`, `⊡`, `◈`, etc.) that render as single-color text, consistent in any theme
- **Message actions on hover** — Copy (⎘), Regenerate (↻), and Edit (✎) buttons appear when hovering over messages
- **Auto-resize textarea** — Input grows as you type (up to 180px)
- **Search within conversation** — Toggle filter input to show/hide messages by text match
- **Message counter** — Live count of messages in the current conversation
- **Copy toast** — Brief "Copied!" popup when copying a message
- **Loading indicator** — "IA processando..." and button state disable during requests
- **Clear confirmation** — Confirm dialog before wiping the conversation (`Ctrl+Shift+C`)

### Functionality
- **Regenerate last response** — Click ↻ on any AI message to re-roll the last answer
- **Edit sent messages** — Click ✎ on a user message to put it back in the input and re-send from that point
- **Keyboard shortcuts** — `Ctrl+Enter` send, `Ctrl+Shift+C` clear, `Ctrl+Shift+S` save, `Ctrl+Shift+F` search
- **localStorage persistence** — Conversation history (last 100 messages), selected persona, and system prompt are saved automatically and restored on reload
- **Config-driven model & parameters** — Model, temperature, and max_tokens are read from the config note (no UI dropdowns)
- **Protected note support** — Config loading tries `getProtectedContent()` first, falls back to `getContent()` — secure your API key with Trilium's master password

### Security
- **Request timeout** — 90s timeout with `AbortController` on all API calls prevents hanging
- **Input validation** — Max 32000 characters per message
- **Structured error handling** — Distinguishes HTTP errors, API errors, timeouts, and network failures with clear messages
- **Sanitized markdown** — DOMPurify strips malicious HTML before rendering

### Code Quality
- Reduced from ~1260 to ~1060 lines by removing dead code (model picker, export, sliders)
- All template literals properly balanced and validated
- History index tracking instead of fragile text matching for edit/regenerate
