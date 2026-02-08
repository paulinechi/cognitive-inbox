#!/bin/bash

# Function to kill child processes on exit
cleanup() {
    echo "Stopping backend..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    exit
}

# Trap ctrl-c
trap cleanup SIGINT

# Check if backend port is already in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Backend port 8000 is already in use!"
    echo "Killing existing process..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Clear Metro bundler cache if requested
if [ "$2" == "--clear" ] || [ "$2" == "-c" ]; then
    echo "🧹 Clearing Metro bundler cache..."
    cd mobile-app
    rm -rf node_modules/.cache
    rm -rf .expo
    cd ..
fi

# Start Backend
echo "🚀 Starting Backend..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
sleep 2

# Start Frontend based on argument
echo "📱 Starting Mobile App..."
cd mobile-app

if [ "$1" == "i" ]; then
    echo "Launching iOS Simulator..."
    if [ "$2" == "--clear" ] || [ "$2" == "-c" ]; then
        npx expo start --ios --clear
    else
        npm run ios
    fi
elif [ "$1" == "a" ]; then
    echo "Launching Android Emulator..."
    if [ "$2" == "--clear" ] || [ "$2" == "-c" ]; then
        npx expo start --android --clear
    else
        npm run android
    fi
else
    echo "Usage: ./start.sh [i|a] [--clear]"
    echo "  i        : iOS"
    echo "  a        : Android"
    echo "  --clear  : Clear Metro cache (use when CSS/styling isn't updating)"
    echo ""
    echo "Examples:"
    echo "  ./start.sh i          # Start iOS normally"
    echo "  ./start.sh i --clear  # Start iOS with cache cleared"
    # Kill backend if invalid arg provided
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    exit 1
fi

# Keep script running to maintain backend process
wait $BACKEND_PID
