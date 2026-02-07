# Gemini-MCP Agentic Workflow Implementation Plan

This document outlines the architecture and implementation details for the "Cognitive Inbox" MCP prototype, which enables a Gemini-powered agent to interact with real-world APIs via the Model Context Protocol (MCP).

## Architecture Overview

The system follows a service-oriented architecture where a FastAPI backend orchestrates a multi-turn agentic loop between Gemini 2.0 and various MCP servers.

### Component Breakdown

#### 1. Core Logic: [gemini_mcp.py](file:///Users/xiaohewang/Desktop/projects/cognitive-inbox/mcp-prototype/app/services/gemini_mcp.py)
The central `analyze_with_mcp` function performs the following:
- **Server Orchestration:** Launches and connects to standard MCP servers (`mcp-server-gmail`, `@modelcontextprotocol/server-google-maps`) via stdio.
- **Tool Mapping:** Dynamically translates MCP tool definitions into Gemini-compatible `FunctionDeclarations`.
- **Agentic Loop:** Implements a 5-turn maximum loop where Gemini can call tools, receive feedback, and refine its plan.
- **Structured Extraction:** Finalizes the interaction by forcing Gemini to output a JSON object matching the `MemoProcessed` schema.

#### 2. Authentication: [get_gmail_token.py](file:///Users/xiaohewang/Desktop/projects/cognitive-inbox/mcp-prototype/get_gmail_token.py)
A helper utility to manage the OAuth 2.0 flow for Gmail:
- Uses `google-auth-oauthlib` to capture user consent.
- Stores the refresh token in `~/.gmail-mcp/token.json` for persistent access.

#### 3. Data Models: [models.py](file:///Users/xiaohewang/Desktop/projects/cognitive-inbox/mcp-prototype/app/models.py)
Pydantic models that define the structure of processed memos:
- **[MODIFY] [models.py](file:///Users/xiaohewang/Desktop/projects/cognitive-inbox/mcp-prototype/app/models.py):** Updated `next_steps` to be a `List[str]` to better accommodate the agent's multi-step planning output.

---

## Technical Features & Resilience

### Rate Limit Mitigation
- **Retry Logic:** Implemented exponential backoff for `429 RESOURCE_EXHAUSTED` errors during both tool calls and final status extraction.
- **Loop Pacing:** Added a fixed 2-second sleep between agent turns to stay within Vitamin-Flash quota limits.

### Tool Virtualization
- **Prefixing:** Tool names are prefixed (`maps_`, `gmail_`) to avoid collisions across different servers.
- **Dynamic Routing:** The service dynamically routes tool calls back to the correct MCP session based on these prefixes.

### Robust Cleanup
- **BaseException Catching:** The `disconnect` logic is wrapped in high-level exception handling to ensure that terminal-based MCP processes are always terminated, even if the main task fails.

---

## Verification Plan

### Automated Verification
The flow is verified using [test_run.py](file:///Users/xiaohewang/Desktop/projects/cognitive-inbox/mcp-prototype/test_run.py), which simulates complex user requests:
- **Test Case 1:** Finding a restaurant in Shibuya and emailing the user.
- **Test Case 2:** Searching Singapore restaurants within a budget ($50/pax) and inviting three distinct email addresses.

### Manual Verification
1. Verify emails are correctly received in the recipient's inbox.
2. Check Google Maps API usage in the Google Cloud Console to confirm real-world hits.
