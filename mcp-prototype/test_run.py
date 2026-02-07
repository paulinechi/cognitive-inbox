import asyncio
import logging
import os
from dotenv import load_dotenv
from app.services.gemini_mcp import analyze_with_mcp

# Setup logging to see what's happening
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def main():
    load_dotenv()
    
    prompt = "find a nice restaurant for friends gathering in singapore next Saturday, budget is $50 per pax and once find the restaurant, send out the invite to chifeixuan@gmail.com, Xia Wu <tswuxia@gmail.com>, WU PY <wuboyi.wpy@gmail.com>"
    print(f"\n--- Starting Analysis for: '{prompt}' ---\n")
    
    try:
        result = await analyze_with_mcp(prompt)
        
        print("\n--- Final Result ---")
        print(f"Type: {result.memo_type}")
        print(f"Summary: {result.summary}")
        print("\nWorkflow Steps:")
        for step in result.workflow:
            print(f"{step.step}. {step.description}")
            
        print("\nNext Steps:")
        for ns in result.next_steps:
            print(f"- {ns}")
            
    except Exception as e:
        logger.error(f"Error during test run: {e}")

if __name__ == "__main__":
    asyncio.run(main())
