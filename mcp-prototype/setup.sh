#!/bin/bash

# Navigate to prototype directory
cd "$(dirname "$0")"

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env template if it doesn't exist
if [ ! -f .env ]; then
  cat <<EOF > .env
GOOGLE_API_KEY=your_api_key_here
EOF
  echo "Created .env file. Please add your GOOGLE_API_KEY."
fi

echo "Setup complete. Run 'source venv/bin/activate' and 'python -m app.main' to start (make sure you are in mcp-prototype directory)."
