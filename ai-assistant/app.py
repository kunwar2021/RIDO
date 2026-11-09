import os
import streamlit as st
from openai import OpenAI

st.set_page_config(page_title="Personal AI Assistant", page_icon="🤖", layout="centered")
st.title("🤖 My Personal AI Assistant")

# --- Sidebar Configuration ---
with st.sidebar:
    st.header("⚙️ Configuration")
    
    # Retrieve secret or environment variable safely
    default_key = ""
    try:
        if "OPENAI_API_KEY" in st.secrets:
            default_key = st.secrets["OPENAI_API_KEY"]
    except Exception:
        pass
    
    if not default_key:
        default_key = os.getenv("OPENAI_API_KEY", "")

    api_key = st.text_input("OpenAI API Key", value=default_key, type="password", placeholder="sk-...")
    
    model = st.selectbox(
        "Select Model",
        ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
        index=0
    )
    
    system_prompt = st.text_area(
        "System Prompt",
        value="You are a helpful, concise personal AI assistant."
    )
    
    if st.button("🗑️ Clear Chat History"):
        st.session_state.messages = [{"role": "system", "content": system_prompt}]
        st.rerun()

# --- Check API Key ---
if not api_key:
    st.info("💡 Please enter your OpenAI API key in the sidebar to start chatting.")
    st.stop()

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

# --- Message History Initialization ---
if "messages" not in st.session_state:
    st.session_state.messages = [{"role": "system", "content": system_prompt}]

# --- Render Chat History ---
for msg in st.session_state.messages:
    if msg["role"] != "system":
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

# --- Handle User Input ---
if prompt := st.chat_input("How can I help you today?"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        try:
            stream = client.chat.completions.create(
                model=model,
                messages=st.session_state.messages,
                stream=True,
            )
            response = st.write_stream(stream)
            st.session_state.messages.append({"role": "assistant", "content": response})
        except Exception as e:
            st.error(f"Error: {e}")
