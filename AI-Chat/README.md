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
   
