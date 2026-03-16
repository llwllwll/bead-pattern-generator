import requests

# Test backend API
url = "http://localhost:8000/api/admin/palettes/public"

try:
    response = requests.get(url)
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
