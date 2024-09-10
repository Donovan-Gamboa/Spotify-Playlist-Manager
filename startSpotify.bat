@echo off
:: Navigate to the directory containing your Node.js app
cd C:\PathTo\FolderWithApp

:: Start the Node.js server
start /B cmd /C "node spotify.js"

:: Give the server a moment to start
timeout /t 5 >nul

:: Open the Spotify login page
start http://localhost:8888/login
