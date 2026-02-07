import os.path
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

def main():
    creds = None
    creds_path = os.path.expanduser('~/.gmail-mcp/credentials.json')
    token_path = os.path.expanduser('~/.gmail-mcp/token.json')

    if not os.path.exists(creds_path):
        print(f"Error: {creds_path} not found.")
        return

    flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
    
    print("Starting local server for authorization...")
    # run_local_server will print the URL to the console when open_browser=False
    creds = flow.run_local_server(port=0, open_browser=False)
    
    # Save the credentials for the next run
    with open(token_path, 'w') as token:
        token.write(creds.to_json())
    print(f"Token saved to {token_path}")
    
    # Save the credentials for the next run
    with open(token_path, 'w') as token:
        token.write(creds.to_json())
    print(f"Token saved to {token_path}")

if __name__ == '__main__':
    main()
