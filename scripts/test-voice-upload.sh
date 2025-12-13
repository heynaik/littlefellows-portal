#!/bin/bash
HOST="http://localhost:3000"

echo "1. Testing GET Upload URL..."
UPLOAD_RES=$(curl -s "$HOST/api/upload-url?fileName=test-voice.mp3&contentType=audio/mpeg")
echo "Response: $UPLOAD_RES"

# Extract URL only (simple grep/sed, assuming JSON structure simple)
# {"url":".../api/local-upload?filename=...","key":"..."}
UPLOAD_URL=$(echo $UPLOAD_RES | grep -o 'http[^"]*')
echo "Extracted Upload URL: $UPLOAD_URL"

echo ""
echo "2. Testing PUT File to Local Upload..."
# Create dummy file
echo "dummy mp3 content" > dummy.mp3
curl -X PUT -T dummy.mp3 "$UPLOAD_URL"
# Check if file exists in public/uploads/
# Filename is in query param of upload url
FILENAME=$(echo $UPLOAD_URL | sed 's/.*filename=//')
echo "Expected filename: $FILENAME"
ls -l public/uploads/$FILENAME

echo ""
echo "3. Testing POST to Child Profiles (Save Voice)..."
PUBLIC_URL="/uploads/$FILENAME"
# Use a specific parent/child for test
curl -X POST -H "Content-Type: application/json" \
     -d "{\"parentEmail\":\"test-auto@example.com\",\"childName\":\"AutoTest\",\"voiceUrl\":\"$PUBLIC_URL\",\"voiceOwner\":\"Tester\"}" \
     "$HOST/api/child-profiles-api"

echo ""
echo "4. Testing GET Profile..."
PROFILE_RES=$(curl -s "$HOST/api/child-profiles-api?parentEmail=test-auto@example.com&childName=AutoTest")
echo "Profile: $PROFILE_RES"

# Verify path is correct in JSON
if [[ "$PROFILE_RES" == *"$PUBLIC_URL"* ]]; then
  echo "SUCCESS: Voice URL matches uploaded path."
else
  echo "FAILURE: Voice URL does not match."
fi

echo ""
echo "5. Testing DELETE Voice..."
curl -X POST -H "Content-Type: application/json" \
     -d "{\"parentEmail\":\"test-auto@example.com\",\"childName\":\"AutoTest\",\"action\":\"delete_voice\"}" \
     "$HOST/api/child-profiles-api"

echo ""
echo "6. Testing GET Profile after Delete..."
FINAL_RES=$(curl -s "$HOST/api/child-profiles-api?parentEmail=test-auto@example.com&childName=AutoTest")
echo "Profile After Delete: $FINAL_RES"

if [[ "$FINAL_RES" == *"\"voiceUrl\":null"* ]]; then
  echo "SUCCESS: Voice URL is null."
else
  echo "FAILURE: Voice URL is not null."
fi
