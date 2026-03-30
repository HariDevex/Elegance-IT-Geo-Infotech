#!/bin/bash
# Script to create test accounts for QA testing

echo "=============================================="
echo "Creating Test Accounts for QA Testing"
echo "=============================================="

# Configuration
# Default API_URL points to local host and backend port used by `npm start` in server/.
API_URL="${API_URL:-http://192.168.29.205:5000/api}"
ROOT_EMAIL="${ROOT_EMAIL:-mrnobody@elegance.com}"
ROOT_PASSWORD="${ROOT_PASSWORD:-mrnobody009}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Get auth token
echo ""
echo "Authenticating as root user..."
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ROOT_EMAIL\",\"password\":\"$ROOT_PASSWORD\"}" \
    | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    print_error "Failed to authenticate. Please check credentials."
    exit 1
fi

print_status "Authentication successful"

# Function to create employee
create_employee() {
    local name=$1
    local email=$2
    local role=$3
    local department=$4
    
    echo ""
    print_warning "Creating $role: $name ($email)"
    
    RESPONSE=$(curl -s -X POST "$API_URL/employees" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{
            \"name\": \"$name\",
            \"email\": \"$email\",
            \"password\": \"Test123456\",
            \"role\": \"$role\",
            \"department\": \"$department\",
            \"branch\": \"bengaluru\",
            \"designation\": \"$role\"
        }")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        print_status "Created successfully (Password: Test123456)"
    else
        ERROR=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        if echo "$RESPONSE" | grep -q "already exists"; then
            print_warning "Account already exists"
        else
            print_error "Failed: $ERROR"
        fi
    fi
}

# Create test accounts
echo ""
echo "Creating test accounts..."

# Admin account
create_employee "Test Admin" "testadmin@elegance.com" "admin" "Administration"

# Manager account
create_employee "Test Manager" "testmanager@elegance.com" "manager" "Development"

# HR account
create_employee "Test HR" "testhr@elegance.com" "hr" "Human Resources"

# Team Lead account
create_employee "Test Team Lead" "testteamlead@elegance.com" "teamlead" "Development"

# Developer accounts
create_employee "Test Developer 1" "testdev1@elegance.com" "developer" "Development"
create_employee "Test Developer 2" "testdev2@elegance.com" "developer" "Development"

echo ""
echo "=============================================="
echo "Test Accounts Summary"
echo "=============================================="
echo ""
echo "| Role      | Email                       | Password    |"
echo "|-----------|-----------------------------|-------------|"
echo "| Admin     | testadmin@elegance.com       | Test123456  |"
echo "| Manager   | testmanager@elegance.com     | Test123456  |"
echo "| HR        | testhr@elegance.com          | Test123456  |"
echo "| Team Lead | testteamlead@elegance.com    | Test123456  |"
echo "| Developer | testdev1@elegance.com        | Test123456  |"
echo "| Developer | testdev2@elegance.com        | Test123456  |"
echo ""
echo "=============================================="
echo "Testing API endpoints..."
echo "=============================================="

# Test various endpoints
echo ""
echo "Testing Leave Balance API..."
curl -s "$API_URL/leave-balance/balance" \
    -H "Authorization: Bearer $TOKEN" | head -c 200
echo ""

echo ""
echo "Testing Holidays API..."
curl -s "$API_URL/holidays" \
    -H "Authorization: Bearer $TOKEN" | head -c 200
echo ""

echo ""
echo "Testing Announcements API..."
curl -s "$API_URL/announcements" \
    -H "Authorization: Bearer $TOKEN" | head -c 200
echo ""

echo ""
echo "Testing Check-in API..."
curl -s -X POST "$API_URL/checkin/checkin" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' | head -c 300
echo ""

echo ""
echo "=============================================="
echo "Test account creation complete!"
echo "=============================================="
