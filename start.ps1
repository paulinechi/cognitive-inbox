# Cognitive Inbox - Windows PowerShell Startup Script

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('i', 'a')]
    [string]$Platform,
    
    [switch]$Clear
)

# Function to kill child processes on exit
function Cleanup {
    Write-Host ""
    Write-Host "Stopping backend..." -ForegroundColor Yellow
    if ($null -ne $script:BackendProcess) {
        Stop-Process -Id $script:BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    exit
}

# Register cleanup on Ctrl+C
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup }

# Check if backend port is already in use and kill it
$portProcess = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($portProcess) {
    Write-Host "Backend port 8000 is already in use!" -ForegroundColor Yellow
    Write-Host "Killing existing process..." -ForegroundColor Yellow
    $processId = $portProcess.OwningProcess
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Clear Metro bundler cache if requested
if ($Clear) {
    Write-Host "Clearing Metro bundler cache..." -ForegroundColor Cyan
    Push-Location mobile-app
    Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path ".expo" -Recurse -Force -ErrorAction SilentlyContinue
    Pop-Location
}

# Start Backend
Write-Host "Starting Backend..." -ForegroundColor Green
Push-Location backend

# Check if virtual environment exists
if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "Virtual environment not found at backend\venv\" -ForegroundColor Red
    Write-Host "Please create it first with: python -m venv venv" -ForegroundColor Yellow
    Pop-Location
    exit 1
}

# Activate virtual environment and start uvicorn
$BackendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru -WindowStyle Normal

Pop-Location

# Wait for backend to be ready
Write-Host "Waiting for backend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Start Frontend based on argument
Write-Host "Starting Mobile App..." -ForegroundColor Green
Push-Location mobile-app

try {
    if ($Platform -eq 'i') {
        Write-Host "Launching iOS Simulator..." -ForegroundColor Cyan
        if ($Clear) {
            npx expo start --ios --clear
        }
        else {
            npm run ios
        }
    }
    elseif ($Platform -eq 'a') {
        Write-Host "Launching Android Emulator..." -ForegroundColor Cyan
        if ($Clear) {
            npx expo start --android --clear
        }
        else {
            npm run android
        }
    }
}
catch {
    Write-Host "Error starting mobile app: $_" -ForegroundColor Red
    Cleanup
}
finally {
    Pop-Location
}

# Keep script running
Write-Host ""
Write-Host "Press Ctrl+C to stop both backend and frontend..." -ForegroundColor Yellow
try {
    Wait-Process -Id $BackendProcess.Id
}
catch {
    Cleanup
}
