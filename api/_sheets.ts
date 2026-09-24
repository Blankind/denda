import { google } from 'googleapis';

const SPREADSHEET_ID = "1DZDGIAvGU66LPYwGndSJ6Qx9v2eldftmzUbfzalv6oE";
const CLIENT_EMAIL = "reject@smooth-aura-465504-i3.iam.gserviceaccount.com";
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC/5nYQpq0ids6d
G20jl86GzVMVWKT1Y+zeZY85upeOotBY/vEdpGyQ/31aZGkdbPbcnOiC2pQAdoc2
uvHx+T+zQwtkgZwOiIh7enmIhN0FNQfqdA35v1i/WPePbMvIyY6xw/uyu/mdG6gN
oL2u60Zt7qIlSCzsn67ifc7wfGZf3QqtAt0JFWjYMCxkiTqrU32DJ5DxiLq6aMj4
bPefLg5qT55pToy/nkAtnjf8ZxAAkNE6tnaWaZASRSyvzcQqxYamlD5wTL4vsGk3
AjsKXP1rOdLrz6dnaV+tul1+XIR3KTFowHwhgSMAFKDQ8VIlU7rBLFVDWMLeWNyj
V9Lm6QqZAgMBAAECggEADDjzW8556DWKpbK0VK2GanXpF6Ah6ufr6M2tfdRMHeTH
LLvu2Iql8uWgSCHCw4HdW/d5zwfOoGmW5XNVFf/gQPHWvRaM6Cy7C1Olf6lSuH0E
XY2kbDv155i/injipo3BPcJJUDzXwlwba+Qei2W8gnj4sTOJJPhrYk1NYRTTTRdX
VY3rsyEz/Fsjul5bJHALYzv3Iyd7KTHRi3LXo/c3wBEALqbczKnYrzitpNQZnFhy
Ba1n/9S0dr+2xR7rPDgVUgPPYVRRTBAXCM1ok1fgJwT99HdzUbp2JCcDwio8nSxj
IGFawfdqhTHg9awWjJClHMJ8CK/wYQSQeUA0uowb2QKBgQDeLHfJEFiKY+xrCGtB
LCl38j0a+WeuMgCqjJmewNVCVnbZ0NlTp7/22InjgGudtB5Ni1Pt8auIyCA9HsNm
UC11be/q3R1wsyrDOKL7M18Pmd40WDo7lztdE7FrzEl6iYQ+wVRBdVl/BeH+nXTU
6yPkumaUfam7InUkJa4QYpp97QKBgQDdHgriMHjOdCeezNNV9rmYR7KEAaNdgf/A
d+I+qXLUHV48kT0cAt07lINLM+JwHVKCKi5vA36GJxqcX3RC0ctLpvIG/HSD/s2k
tlqq2DN4URQCKwhgTY0HJ07v2D37qhmUETzqR8Sf7DsmINGXQzX6g2DJVmxZw9Mx
X2VrYfEJ3QKBgQDMaA0tJ6TObnCtaOmE5KSifnRJxPzm/4otX35W2QNcLUDb1ZKd
rNCow0DZ1uUsCvN2VKG7YYV4Kue+U/diwpGQYL1DUHwtnCnTwt/wTatAJ0iQ0DuD
Z/huAhhSHXndC3hoZGaoctcMTtVF9Ifw/QXhAr4uEA+A5Irx3tjuqkmJYQKBgQCs
kQS3cFLn9RjywzHwNgS0hsgYY9rmYE2EHUvR0ZbPWjgwlr0VflrAY/BvoYeILio1
ccwZUaXN9vi6r3hhqa+6VAkxUJdyaEp/0N1D1kWdEdHGu2TnG78DpTbi0mXVYfRi
bW2X/fjDQq8K27QXFBotb5j6qNsY106cirHxM1fVdQKBgQCxY2nQCivuEMQ6Tm9J
e/hGQGs0YsdsRI0UR4EbCuy3xXoSP18sCBkPcjoKpIOI4T1FL5+MIofq5FSSUrBo
Ne5oxKouYUXwTsoG3Neu7dnfcepDWPbA7byyThaCjhGp6ZDj8FZwE3En6R7SR2AT
e/uYnmC5362u94QbI6yDm39bJA==
-----END PRIVATE KEY-----
`;

export function getSheets() {
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return { sheets: google.sheets({ version: 'v4', auth }), spreadsheetId: SPREADSHEET_ID };
}
