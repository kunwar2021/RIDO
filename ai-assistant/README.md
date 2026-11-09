# 🤖 Personal AI Assistant

A clean, interactive Streamlit chatbot application powered by OpenAI's API.

## Features
- 💬 Real-time streaming chat responses
- ⚙️ Sidebar configuration:
  - Model selection (`gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`)
  - Customizable System Prompt
  - API Key input (with automatic fallback to environment/secrets)
  - Clear chat history button
- 🛡️ Error handling and graceful missing API key state

## Setup & Running

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure API Key (Optional)
You can enter your API key directly in the sidebar inside the app, or configure it via:

- **Environment Variable:**
  ```powershell
  $env:OPENAI_API_KEY="sk-..."
  ```
- **Streamlit Secrets:**
  Create `.streamlit/secrets.toml` and add:
  ```toml
  OPENAI_API_KEY = "sk-..."
  ```

### 3. Launch the App
```bash
streamlit run app.py
```
