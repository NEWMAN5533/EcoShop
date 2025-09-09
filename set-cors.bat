@echo off
echo ================================
echo 🔄 Setting up Firebase Storage CORS for ecoshop-536ca
echo ================================

REM Make sure gcloud SDK and gsutil are installed before running!

REM Create cors.json file
echo [ > cors.json
echo   { >> cors.json
echo     "origin": [ >> cors.json
echo       "http://localhost:3000", >> cors.json
echo       "http://localhost:3002", >> cors.json
echo       "http://127.0.0.1:3000", >> cors.json
echo       "http://127.0.0.1:3002", >> cors.json
echo       "https://ecoshop-536ca.web.app", >> cors.json
echo       "https://ecoshop-536ca.firebaseapp.com" >> cors.json
echo     ], >> cors.json
echo     "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"], >> cors.json
echo     "maxAgeSeconds": 3600, >> cors.json
echo     "responseHeader": ["Content-Type", "x-goog-meta-*", "x-goog-resumable", "Authorization"] >> cors.json
echo   } >> cors.json
echo ] >> cors.json

REM Apply CORS to the Firebase storage bucket
gsutil cors set cors.json gs://ecoshop-536ca.appspot.com

echo ================================
echo ✅ CORS rules applied successfully!
echo ================================
pause
