# Quick Reference Guide - Security Metrics

## 📋 Where is What?

### 1. Authentication (3 marks)

**Single-Factor (1.5m):**
- **Location:** `/app/backend/server.py` - Line 197-230
- **Endpoint:** `POST /api/auth/login`
- **What:** Email + Password verification
- **Algorithm:** bcrypt password comparison

**Multi-Factor (1.5m):**
- **Location:** `/app/backend/server.py` - Line 232-263
- **Endpoint:** `POST /api/auth/verify-otp`
- **What:** 6-digit OTP verification
- **Method:** Random OTP with 5-minute expiration

---

### 2. Authorization (3 marks)

**Access Control Model (1.5m):**
- **Model:** RBAC (Role-Based Access Control)
- **Roles:** Student, Teacher, Admin
- **Implementation:** JWT payload contains role
- **Location:** `/app/backend/server.py` - Line 157-165

**Policy Definition (1.5m):**
- **Matrix:** See SECURITY_THEORY.md - Section 2
- **Students:** Own data only
- **Teachers:** All resumes + feedback
- **Admins:** Full system access

**Implementation (1.5m):**
- **Method:** `get_current_user()` dependency
- **Enforcement:** Role check at each endpoint
- **Response:** HTTP 403 for denied access

---

### 3. Encryption (3 marks)

**Key Exchange (1.5m):**
- **Method:** Symmetric key in environment variable
- **Location:** `/app/backend/.env` - `ENCRYPTION_KEY`
- **Algorithm:** AES-256 (32-byte key)
- **Storage:** Base64-encoded in .env

**Encrypt/Decrypt (1.5m):**
- **Location:** `/app/backend/server.py` - Line 110-131
- **Algorithm:** AES-256-CBC
- **IV:** Random 16 bytes per encryption
- **Usage:** Resume text encryption

---

### 4. Hashing & Digital Signatures (3 marks)

**Hashing with Salt (1.5m):**
- **Location:** `/app/backend/server.py` - Line 84-92
- **Algorithm:** bcrypt with automatic salt
- **Cost Factor:** 12 rounds (2^12 = 4096)
- **Usage:** Password storage

**Digital Signatures (1.5m):**
- **Location:** `/app/backend/server.py` - Line 133-142
- **Algorithm:** HMAC-SHA256
- **Usage:** Resume + Feedback signatures
- **Format:** 64 hex characters

---

### 5. Encoding (3 marks)

**Implementation (1m):**
- **Location:** `/app/backend/server.py` - Line 144-151
- **Algorithm:** Base64
- **Usage:** Resume metadata, ciphertext storage

**Security Theory (1m):**
- **Document:** `/app/SECURITY_THEORY.md` - Section 5
- **Key Point:** Base64 is NOT encryption
- **Security Level:** Zero (publicly reversible)

**Attack Vectors (1m):**
- **Decoding Attack:** Easily reversed
- **Padding Oracle:** Length information leak
- **Character Set:** URL safety issues
- **Length Disclosure:** Size reveals information
- **Injection:** XSS/code injection risk

---

## 🔐 Algorithms Used

| Security Feature | Algorithm | Key Size/Detail |
|-----------------|-----------|-----------------|
| Password Hashing | bcrypt | Cost factor: 12 |
| Data Encryption | AES-256-CBC | 256-bit key, 128-bit IV |
| Digital Signatures | HMAC-SHA256 | 256-bit output |
| Session Tokens | JWT (HS256) | 256-bit secret |
| Metadata Encoding | Base64 | No security |

---

## 📁 File Structure

```
/app/
├── backend/
│   ├── server.py              # All security implementations
│   ├── .env                   # Keys (JWT_SECRET, ENCRYPTION_KEY)
│   └── requirements.txt       # Dependencies (bcrypt, pycryptodome)
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── LoginPage.js   # Authentication UI
│       │   ├── StudentDashboard.js
│       │   ├── TeacherDashboard.js
│       │   └── AdminDashboard.js
│       └── App.js             # Route protection
│
└── docs/
    ├── SECURITY_FEATURES.md   # Implementation details
    └── SECURITY_THEORY.md     # This comprehensive theory
```

---

## 🎯 Testing Quick Reference

### Test Authentication
```bash
# Login (Single-Factor)
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin123"}'

# Response: {"otp": "123456", "email": "..."}

# Verify OTP (Multi-Factor)
curl -X POST $API_URL/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","otp":"123456"}'

# Response: {"token": "eyJ...", "user": {...}}
```

### Test Authorization
```bash
# Test student endpoint with admin token (should fail)
curl -X POST $API_URL/api/student/resume \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"resume_text":"..."}'

# Response: 403 Forbidden (if not student role)
```

### Test Encryption
```bash
# Submit resume (encrypts automatically)
curl -X POST $API_URL/api/student/resume \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d '{"resume_text":"My resume content"}'

# View resume (decrypts automatically for teacher)
curl -X GET $API_URL/api/teacher/resumes \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

---

## 💡 Key Concepts Summary

### Why bcrypt?
- Slow (prevents brute-force)
- Automatic salt generation
- Adaptive (can increase cost)
- Industry standard since 1999

### Why AES-256-CBC?
- 256-bit key (2^256 possibilities)
- Fast with hardware acceleration
- CBC mode chains blocks
- Random IV per encryption

### Why SHA-256?
- Fast (good for signatures)
- 256-bit output (collision-resistant)
- One-way (can't reverse)
- Widely trusted

### Why Base64?
- Text representation of binary
- JSON/URL compatible
- NOT for security
- Format conversion only

---

## 🛡️ Security Checklist

- [✅] Passwords never stored in plaintext
- [✅] All passwords hashed with bcrypt
- [✅] Unique salt per password (automatic)
- [✅] Resumes encrypted at rest (AES-256)
- [✅] Random IV per encrypted document
- [✅] Digital signatures for authenticity
- [✅] JWT tokens expire (24 hours)
- [✅] OTP expires (5 minutes)
- [✅] Role-based access control
- [✅] 403 errors for unauthorized access
- [✅] No hardcoded secrets
- [✅] Environment variables for keys

---

## 📊 Metrics Mapping

| Metric | File | Function/Class | Line Numbers |
|--------|------|----------------|--------------|
| Single-Factor Auth | server.py | `login()` | 197-230 |
| Multi-Factor Auth | server.py | `verify_otp()` | 232-263 |
| JWT Token | server.py | `create_jwt_token()` | 96-105 |
| Access Control | server.py | `get_current_user()` | 157-165 |
| Password Hash | server.py | `hash_password()` | 84-87 |
| Password Verify | server.py | `verify_password()` | 89-92 |
| Encrypt | server.py | `encrypt_text()` | 110-122 |
| Decrypt | server.py | `decrypt_text()` | 124-131 |
| Sign | server.py | `create_digital_signature()` | 133-138 |
| Verify Signature | server.py | `verify_digital_signature()` | 140-142 |
| Encode | server.py | `encode_base64()` | 144-147 |
| Decode | server.py | `decode_base64()` | 149-151 |

---

## 🔑 Admin Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gmail.com | admin123 |
| Student | (register new) | (your choice) |
| Teacher | (register new) | (your choice) |

---

## 📚 Further Reading

1. **SECURITY_THEORY.md** - Detailed theory (What, Where, How, Why)
2. **SECURITY_FEATURES.md** - Implementation guide
3. **Backend Test:** `/app/backend_test.py`
4. **Test Reports:** `/app/test_reports/`

---

**Quick Reference Version:** 1.0  
**Last Updated:** 2026-02-03  
**Lab Evaluation:** 23CSE313 - 20 Marks Total
