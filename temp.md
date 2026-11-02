import requests

url = "https://test-api.sandbox.co.in/kyc/aadhaar/okyc/otp"

payload = {
    "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
    "aadhaar_number": "123456789012",
    "consent": "y",
    "reason": "For KYC"
}
headers = {
    "Authorization": "<authorization>",
    "x-api-key": "<x-api-key>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
response = response.json()
print(response["data"]["reference_id"])



--- 

import requests

url = "https://test-api.sandbox.co.in/kyc/aadhaar/okyc/otp/verify"

payload = {
    "@entity": "in.co.sandbox.kyc.aadhaar.okyc.request",
    "reference_id": "1234567",
    "otp": "121212"
}
headers = {
    "Authorization": "<authorization>",
    "x-api-key": "<x-api-key>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
response = response.json()
print(response["code"] == 200 )
