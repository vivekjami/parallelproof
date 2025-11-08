#!/bin/bash
# Test optimization API with detailed logging

echo "Testing optimization endpoint..."
echo ""

# Test with a simple SQL query
curl -s http://localhost:8000/api/v1/optimize \
  -X POST \
  -H "Content-Type: application/json" \
  --data @test_request.json | jq .

echo ""
echo "Waiting 10 seconds for processing..."
sleep 10

# Get the task ID from the response
TASK_ID=$(curl -s http://localhost:8000/api/v1/optimize \
  -X POST \
  -H "Content-Type: application/json" \
  --data @test_request.json | jq -r .task_id)

echo ""
echo "Task ID: $TASK_ID"
echo ""
echo "Checking task status..."
sleep 5

curl -s "http://localhost:8000/api/v1/task/$TASK_ID" | jq .

echo ""
echo "Done!"
