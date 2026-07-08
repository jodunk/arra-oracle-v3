#!/bin/bash
# Call arra_learn API directly to see full error

curl -X POST http://localhost:47778/api/learn \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "Test pattern via curl",
    "source": "test: direct-api-call",
    "concepts": ["test", "debug"]
  }' 2>&1
