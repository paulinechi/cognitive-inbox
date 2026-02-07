import logging
import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from google import genai
from google.genai import types

from app.models import MemoProcessed, MemoType, WorkflowStep

logger = logging.getLogger(__name__)

class MCPClient:
    """A client to interact with a specific MCP server."""
    def __init__(self, name: str, params: StdioServerParameters):
        self.name = name
        self.params = params
        self.session: Optional[ClientSession] = None
        self._client_context = None

    async def connect(self):
        self._client_context = stdio_client(self.params)
        read, write = await self._client_context.__aenter__()
        self.session = ClientSession(read, write)
        await self.session.__aenter__()
        await self.session.initialize()
        return self.session

    async def disconnect(self):
        try:
            if self.session:
                await self.session.__aexit__(None, None, None)
            if self._client_context:
                await self._client_context.__aexit__(None, None, None)
        except BaseException as e:
            logger.debug(f"Disconnect error for {self.name}: {e}")

async def analyze_with_mcp(text_input: str) -> MemoProcessed:
    api_key = os.getenv("GOOGLE_API_KEY")
    maps_api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    
    if not api_key:
        return MemoProcessed(original_input=text_input, extracted_text=text_input, 
                             memo_type=MemoType.OTHER, summary="GOOGLE_API_KEY missing", confidence_score=0.0)

    if not maps_api_key:
        logger.warning("GOOGLE_MAPS_API_KEY is missing. Maps agent will not work.")
        # We can still proceed, but the MCP server might fail. 
        # Better to return a clear error if they tried to use maps.
        
    # Configure MCP Servers
    maps_params = StdioServerParameters(
        command="npx",
        args=["-y", "@modelcontextprotocol/server-google-maps"],
        env={**os.environ, "GOOGLE_MAPS_API_KEY": maps_api_key or ""}
    )
    gmail_params = StdioServerParameters(
        command="npx",
        args=["-y", "mcp-server-gmail"],
        env=os.environ.copy()
    )

    client = genai.Client(api_key=api_key)
    system_instruction = """
    You are an intelligent AI agent with access to Google Maps and Gmail.
    Your goal is to fulfill the user's request by calling the appropriate tools.
    1. For location searches or ratings, use 'maps' tools.
    2. For drafting or sending emails, use 'gmail' tools.
    3. Always execute tools when needed before providing the final answer.
    4. In your final report, summarize the REAL data you found (names, addresses, etc.).
    """
    
    # We will connect to both servers
    maps_client = MCPClient("maps", maps_params)
    gmail_client = MCPClient("gmail", gmail_params)
    
    try:
        print("Connecting to Maps MCP...")
        maps_session = await maps_client.connect()
        print("Connected to Maps.")
        print("Connecting to Gmail MCP...")
        gmail_session = await gmail_client.connect()
        print("Connected to Gmail.")
        
        print("Listing tools...")
        print("Listing tools...")
        maps_tools = await maps_session.list_tools()
        gmail_tools = await gmail_session.list_tools()
        print(f"Found {len(maps_tools.tools)} maps tools and {len(gmail_tools.tools)} gmail tools.")

        # Get user email to help the agent
        user_email = "the user"
        try:
            # Try to find a tool that gives user info if available
            if any(t.name == "get_profile" for t in gmail_tools.tools):
                profile = await gmail_session.call_tool("get_profile", arguments={})
                # The response is usually a list of content blocks
                if profile.content:
                    profile_text = str(profile.content[0].text)
                    import re
                    match = re.search(r'[\w\.-]+@[\w\.-]+', profile_text)
                    if match:
                        user_email = match.group(0)
                        print(f"User email extracted: {user_email}")
                    else:
                        print(f"Could not extract email from: {profile_text}")
        except Exception as e:
            print(f"Failed to get profile: {e}")

        # 2. Map all tools to Gemini format
        gemini_tools = []
        print("\nMaps Tools:")
        for tool in maps_tools.tools:
            # Only prefix if not already prefixed
            g_name = tool.name if tool.name.startswith("maps_") else f"maps_{tool.name}"
            print(f" - {tool.name} -> {g_name}")
            gemini_tools.append(types.Tool(function_declarations=[types.FunctionDeclaration(
                name=g_name, description=tool.description, parameters=tool.inputSchema
            )]))
        
        print("\nGmail Tools:")
        for tool in gmail_tools.tools:
            g_name = tool.name if tool.name.startswith("gmail_") else f"gmail_{tool.name}"
            print(f" - {tool.name} -> {g_name}")
            gemini_tools.append(types.Tool(function_declarations=[types.FunctionDeclaration(
                name=g_name, description=tool.description, parameters=tool.inputSchema
            )]))
        
        # 3. Agentic Loop
        prompt_with_context = f"User Request: {text_input}\n\nYour Info: You are acting for user {user_email}. Use this email address if you need to email the user."
        messages = [types.Content(role="user", parts=[types.Part.from_text(text=prompt_with_context)])]
        
        for turn in range(5):
            await asyncio.sleep(2) # Increased delay to avoid 429
            logger.info(f"--- Agent Turn {turn + 1} ---")
            
            # Retry logic for 429
            for attempt in range(3):
                try:
                    response = client.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=messages,
                        config=types.GenerateContentConfig(system_instruction=system_instruction, tools=gemini_tools)
                    )
                    break
                except Exception as e:
                    if "429" in str(e) and attempt < 2:
                        print(f"Rate limited (429), retrying in {2**(attempt+1)}s...")
                        await asyncio.sleep(2**(attempt+1))
                    else:
                        raise e
            
            if not response.candidates: break
            content = response.candidates[0].content
            messages.append(content)
            
            has_tool_call = False
            tool_responses = []
            
            if content.parts:
                for part in content.parts:
                    if part.text:
                        print(f"Agent Prediction: {part.text}")
                    if part.function_call:
                        has_tool_call = True
                        call = part.function_call
                        logger.info(f"Executing: {call.name}")
                        
                        try:
                            # Route to correct session
                            is_maps = call.name.startswith("maps_")
                            session = maps_session if is_maps else gmail_session
                            
                            # Extract the real name carefully
                            # If we prefixed it, we strip it. If it was already there, we keep it? 
                            # Actually, we should strip what we ADDED.
                            real_name = call.name
                            if is_maps and not any(t.name == call.name for t in maps_tools.tools):
                                real_name = call.name[5:] # strip "maps_"
                            elif not is_maps and not any(t.name == call.name for t in gmail_tools.tools):
                                real_name = call.name[6:] # strip "gmail_"
                            
                            print(f"Calling tool: {real_name} on {session}")
                            mcp_result = await session.call_tool(real_name, arguments=call.args)
                            result_text = str(mcp_result.content)
                            print(f"Tool Result ({real_name}): {result_text[:200]}...")
                            tool_responses.append(types.Part.from_function_response(
                                name=call.name, response={"result": result_text}
                            ))
                        except Exception as e:
                            logger.error(f"Tool Error: {e}")
                            tool_responses.append(types.Part.from_function_response(
                                name=call.name, response={"error": str(e)}
                            ))
            
            if has_tool_call:
                messages.append(types.Content(role="user", parts=tool_responses))
            else:
                print("No more tool calls needed.")
                break
        
        print("Requesting final structured response...")
        # 4. Final step: Get structured JSON
        final_prompt = (
            "Based on the tool results above, provide a final JSON matching the MemoProcessed schema. "
            "In 'workflow', include each specific action taken (e.g., 'Search for restaurants', 'Draft email'). "
            "IMPORTANT: Put the actual names/details of restaurants you found into the descriptions."
        )
        messages.append(types.Content(role="user", parts=[types.Part.from_text(text=final_prompt)]))
        
        # Retry logic for final structured response
        for attempt in range(3):
            try:
                final_response = client.models.generate_content(
                    model="gemini-2.0-flash", contents=messages,
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                break
            except Exception as e:
                if "429" in str(e) and attempt < 2:
                    print(f"Rate limited (429) on final step, retrying in {2**(attempt+1)}s...")
                    await asyncio.sleep(2**(attempt+1))
                else:
                    raise e
        
        raw_result = final_response.text
        if "```" in raw_result:
            raw_result = raw_result.split("```")[1]
            if raw_result.startswith("json"): raw_result = raw_result[4:]
        
        result = json.loads(raw_result.strip())
        if isinstance(result, list): result = result[0]
        
        workflow = []
        for i, step_data in enumerate(result.get("workflow", [])):
            if isinstance(step_data, str): step_data = {"description": step_data}
            if "step" not in step_data: step_data["step"] = i + 1
            workflow.append(WorkflowStep(**step_data))

        return MemoProcessed(
            original_input=text_input,
            extracted_text=text_input,
            memo_type=MemoType(result.get("memo_type", "Task")),
            summary=result.get("summary", "Complete"),
            action_items=result.get("action_items", []),
            next_steps=result.get("next_steps", []),
            prioritization_suggestion=result.get("prioritization_suggestion"),
            workflow=workflow,
            tags=result.get("tags", []),
            confidence_score=0.99
        )

    except Exception as e:
        logger.error(f"Agent Error: {e}")
        return MemoProcessed(original_input=text_input, extracted_text=text_input,
                             memo_type=MemoType.OTHER, summary=f"Reality Error: {str(e)}", confidence_score=0.0)
    finally:
        await maps_client.disconnect()
        await gmail_client.disconnect()
