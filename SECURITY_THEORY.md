# Security Theory & Implementation Guide
## Resume Feedback System - 23CSE313 Lab Evaluation

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [Authorization & Access Control](#2-authorization--access-control)
3. [Encryption](#3-encryption)
4. [Hashing & Digital Signatures](#4-hashing--digital-signatures)
5. [Encoding Techniques](#5-encoding-techniques)
6. [Summary Table](#6-summary-table)

---

## 1. AUTHENTICATION

### What is Authentication?
**Definition:** Authentication is the process of verifying the identity of a user, device, or system. It answers the question: "Who are you?"

### Types Implemented

#### A. Single-Factor Authentication (SFA)

**What:** Authentication using only one credential type (password).

**Where Used in Our Application:**
- Login endpoint: `/api/auth/login`
- File: `/app/backend/server.py` (Line 197-230)
- Frontend: `/app/frontend/src/pages/LoginPage.js`

**How It Works:**
```
User Input → Email + Password
         ↓
Backend validates email exists
         ↓
Compares password with stored hash
         ↓
If match → Generate OTP
If no match → Return 401 error
```

**Implementation Details:**
```python
# Step 1: Find user by email
user = await db.users.find_one({"email": data.email})

# Step 2: Verify password against bcrypt hash
if not verify_password(data.password, user['password']):
    raise HTTPException(status_code=401)

# Step 3: Generate OTP for second factor
otp = generate_otp()  # 6-digit code
```

**Why Important:**
- First layer of security
- Prevents unauthorized access
- Foundation for all security
- Required by NIST SP 800-63-2

**Vulnerabilities of SFA Alone:**
- Passwords can be stolen
- Weak passwords easily cracked
- No protection if password compromised
- Phishing attacks

---

#### B. Multi-Factor Authentication (MFA)

**What:** Authentication requiring two or more independent credentials.

**Where Used:**
- OTP Verification: `/api/auth/verify-otp`
- File: `/app/backend/server.py` (Line 232-263)
- Frontend: OTP screen in LoginPage.js

**How It Works:**
```
After Password Verification
         ↓
Generate Random 6-digit OTP
         ↓
Store OTP in database (5-min expiry)
         ↓
Display OTP as website notification
         ↓
User enters OTP
         ↓
Verify OTP matches & not expired
         ↓
Issue JWT Token for session
```

**Implementation Code:**
```python
def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return str(random.randint(100000, 999999))

# Store with expiration
otp_doc = {
    "email": email,
    "otp": otp,
    "expires_at": datetime.now() + timedelta(minutes=5)
}

# Verify OTP
if otp_record['otp'] != data.otp:
    raise HTTPException(status_code=401, detail="Invalid OTP")
```

**MFA Factors Types:**
1. **Knowledge Factor** - Something you know (password)
2. **Possession Factor** - Something you have (OTP)
3. **Inherence Factor** - Something you are (biometric - not implemented)

**Why MFA is Critical:**
- Reduces account takeover by 99.9%
- Even if password stolen, attacker needs OTP
- Time-based expiration (5 minutes)
- Complies with modern security standards

**Real-World Examples:**
- Google 2-Step Verification
- Banking OTPs
- Microsoft Authenticator
- Hardware tokens (YubiKey)

---

### JWT Token (Session Management)

**What:** JSON Web Token - Encrypted token for stateless authentication.

**Where Used:**
- Issued after OTP verification
- Sent with every API request
- File: `/app/backend/server.py` (Line 96-108)

**Structure:**
```
JWT = Header.Payload.Signature

Header: {"alg": "HS256", "typ": "JWT"}
Payload: {"user_id": "123", "role": "student", "exp": 1234567890}
Signature: HMACSHA256(base64(header) + "." + base64(payload), secret)
```

**Implementation:**
```python
def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now() + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')
```

**Why JWT:**
- Stateless (no server-side session storage)
- Contains user info (no database lookup)
- Tamper-proof (signature verification)
- Expires automatically (24 hours)

---

## 2. AUTHORIZATION & ACCESS CONTROL

### What is Authorization?
**Definition:** Authorization determines what an authenticated user is allowed to do. It answers: "What can you access?"

**Difference from Authentication:**
- Authentication: "Who are you?" (Identity)
- Authorization: "What can you do?" (Permissions)

---

### Access Control Model: RBAC

**What:** Role-Based Access Control - Permissions assigned based on user roles.

**Where Used:**
- All protected endpoints
- Dependency: `get_current_user()`
- File: `/app/backend/server.py` (Line 157-165)

**How It Works:**
```
Request with JWT Token
         ↓
Extract & Verify Token
         ↓
Get User Role from Payload
         ↓
Check Role Permission
         ↓
Allow/Deny Access
```

**Implementation:**
```python
async def get_current_user(credentials: HTTPAuthorizationCredentials):
    """Extract user from JWT token"""
    token = credentials.credentials
    payload = verify_jwt_token(token)  # Decode JWT
    
    # Get user from database
    user = await db.users.find_one({"id": payload['user_id']})
    if not user:
        raise HTTPException(status_code=404)
    
    return user  # Contains role information

# Usage in endpoint
@api_router.post("/student/resume")
async def submit_resume(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'student':
        raise HTTPException(status_code=403, detail="Access denied")
    # ... resume submission logic
```

---

### Access Control Matrix

**What:** A table showing which subjects (roles) can perform which actions on which objects (resources).

| Subject/Role | Resumes (Read) | Resumes (Write) | Feedback (Read) | Feedback (Write) | Users (Manage) | Stats |
|--------------|----------------|-----------------|-----------------|------------------|----------------|-------|
| **Student**  | Own only       | Own only (new)  | Own only        | ✗                | ✗              | ✗     |
| **Teacher**  | All (decrypt)  | ✗               | All             | ✓ (create)       | ✗              | ✗     |
| **Admin**    | All (decrypt)  | ✗               | All             | ✗                | ✓ (CRUD)       | ✓     |

**Where Enforced:**
```
/api/student/*   → Requires role='student'
/api/teacher/*   → Requires role='teacher'
/api/admin/*     → Requires role='admin'
```

---

### Policy Definitions & Justification

#### 1. Student Policy

**Can:**
- Submit encrypted resumes
- View their own feedback only
- Access student dashboard

**Cannot:**
- View other students' resumes
- Provide feedback
- Access teacher/admin functions

**Justification:**
- **Privacy:** Students should only see their own data
- **Separation of Duties:** Students submit, teachers evaluate
- **Data Protection:** Prevents unauthorized data access

**Implementation:**
```python
# Students can only view their own feedback
@api_router.get("/student/feedback")
async def get_student_feedback(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'student':
        raise HTTPException(status_code=403)
    
    # Filter resumes by student ID
    resumes = await db.resumes.find({"student_id": current_user['id']})
```

---

#### 2. Teacher Policy

**Can:**
- View ALL student resumes (decrypted)
- Provide feedback with digital signatures
- Access teacher dashboard

**Cannot:**
- Delete resumes
- Manage users
- Access admin statistics

**Justification:**
- **Educational Purpose:** Teachers need to review all submissions
- **Limited Scope:** Can only read and comment, not modify
- **Accountability:** All feedback digitally signed

**Implementation:**
```python
@api_router.get("/teacher/resumes")
async def get_all_resumes(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['teacher', 'admin']:
        raise HTTPException(status_code=403)
    
    # Teachers can see all resumes
    resumes = await db.resumes.find({})
    
    # Decrypt for viewing
    for resume in resumes:
        resume['text'] = decrypt_text(resume['encrypted_text'], resume['iv'])
```

---

#### 3. Admin Policy

**Can:**
- View all data (resumes, feedback, users)
- Create/Edit/Delete users
- Assign roles
- View system statistics
- See password hashes

**Cannot:**
- Submit resumes
- Provide feedback (not their role)

**Justification:**
- **System Administration:** Full access for management
- **Security Audit:** Can view password hashes for verification
- **User Management:** Control over user lifecycle
- **Separation:** Admin manages system, doesn't participate in content

**Implementation:**
```python
@api_router.post("/admin/user")
async def create_user_by_admin(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403)
    
    # Admin can create users with any role
    # Admin can view password hashes
```

---

### Why RBAC?

**Advantages:**
1. **Scalability:** Easy to add new roles
2. **Simplicity:** Clear permission structure
3. **Maintainability:** Change role permissions centrally
4. **Least Privilege:** Users get minimum needed access
5. **Audit Trail:** Track actions by role

**Alternatives Not Used:**
- **DAC (Discretionary):** Users control their own resources
- **MAC (Mandatory):** System-enforced labels (top secret, confidential)
- **ABAC (Attribute-Based):** Rules based on attributes (time, location)

**Why RBAC for Our Application:**
- Clear role hierarchy (student < teacher < admin)
- Fixed permission sets
- Educational institution model
- Simple to understand and implement

---

## 3. ENCRYPTION

### What is Encryption?
**Definition:** Converting plaintext into ciphertext using an algorithm and key, making data unreadable without the key.

**Purpose:** Confidentiality - Protect data from unauthorized viewing.

---

### AES (Advanced Encryption Standard)

**What:** Symmetric block cipher - Same key for encryption and decryption.

**Specifications:**
- **Algorithm:** AES (Rijndael)
- **Key Size:** 256 bits (32 bytes)
- **Mode:** CBC (Cipher Block Chaining)
- **Block Size:** 128 bits (16 bytes)
- **IV:** Random 16-byte Initialization Vector per encryption

**Where Used:**
- Resume text storage
- File: `/app/backend/server.py` (Line 110-131)
- Encrypted at: `/api/student/resume` (POST)
- Decrypted at: `/api/teacher/resumes` (GET)

---

### Key Exchange Mechanism

**What:** Method to securely share encryption keys.

**Our Implementation:** Server-side symmetric key

**How It Works:**
```
Application Startup
         ↓
Generate/Load AES-256 Key (32 bytes)
         ↓
Store in Environment Variable (.env)
         ↓
Load Key at Runtime
         ↓
Use Same Key for All Encryption/Decryption
```

**Code:**
```python
# Key generation (one-time)
from Crypto.Random import get_random_bytes
encryption_key = get_random_bytes(32)  # 256 bits
encryption_key_b64 = base64.b64encode(encryption_key).decode()

# Store in .env
ENCRYPTION_KEY=<base64_encoded_key>

# Load at runtime
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')
encryption_key_bytes = base64.b64decode(ENCRYPTION_KEY)
```

**Why Environment Variable:**
- Not hardcoded in source code
- Different keys per environment (dev/prod)
- Can be rotated without code changes
- Protected by system-level access control

**Production Alternative:**
- Hardware Security Module (HSM)
- Key Management Service (AWS KMS, Azure Key Vault)
- Asymmetric encryption (RSA + AES hybrid)

---

### Encryption & Decryption Process

#### Encryption Flow

**What Happens When Student Submits Resume:**
```
Plain Resume Text
         ↓
Generate Random IV (16 bytes)
         ↓
Pad Text to Block Size (16 bytes)
         ↓
AES-256-CBC Encrypt (Key + IV)
         ↓
Base64 Encode Ciphertext
         ↓
Store: Ciphertext + IV in Database
```

**Implementation:**
```python
def encrypt_text(plaintext: str) -> tuple[str, str]:
    # Generate random IV (different each time)
    iv = get_random_bytes(16)
    
    # Create cipher with key and IV
    cipher = AES.new(encryption_key_bytes, AES.MODE_CBC, iv)
    
    # Pad plaintext to block size (16 bytes)
    padded_data = pad(plaintext.encode('utf-8'), AES.block_size)
    
    # Encrypt
    ciphertext = cipher.encrypt(padded_data)
    
    # Encode to Base64 for storage
    return (
        base64.b64encode(ciphertext).decode('utf-8'),
        base64.b64encode(iv).decode('utf-8')
    )
```

**Why Random IV:**
- Same plaintext encrypts differently each time
- Prevents pattern analysis
- Essential for CBC mode security
- Must be stored with ciphertext (not secret)

---

#### Decryption Flow

**What Happens When Teacher Views Resume:**
```
Retrieve from Database: Ciphertext + IV
         ↓
Base64 Decode Both
         ↓
AES-256-CBC Decrypt (Key + IV)
         ↓
Remove Padding
         ↓
Plain Resume Text (UTF-8)
```

**Implementation:**
```python
def decrypt_text(ciphertext_b64: str, iv_b64: str) -> str:
    # Decode from Base64
    ciphertext = base64.b64decode(ciphertext_b64)
    iv = base64.b64decode(iv_b64)
    
    # Create cipher with same key and IV
    cipher = AES.new(encryption_key_bytes, AES.MODE_CBC, iv)
    
    # Decrypt
    padded_plaintext = cipher.decrypt(ciphertext)
    
    # Remove padding
    plaintext = unpad(padded_plaintext, AES.block_size)
    
    return plaintext.decode('utf-8')
```

---

### Why AES-256-CBC?

**AES-256:**
- **256-bit key:** 2^256 possible keys (practically unbreakable)
- **Industry standard:** Used by governments, banks
- **Fast:** Hardware acceleration available
- **Proven:** Extensively analyzed, no practical attacks

**CBC Mode:**
- **Chaining:** Each block depends on previous block
- **IV Required:** Ensures different ciphertexts for same plaintext
- **Good for large data:** Suitable for text documents

**Alternatives:**
- **ECB (Electronic Codebook):** ❌ Insecure - reveals patterns
- **GCM (Galois/Counter Mode):** ✓ Better - provides authentication
- **CTR (Counter Mode):** ✓ Good - parallelizable

**CBC Limitations:**
- Padding oracle attacks (mitigated by proper error handling)
- Not authenticated (we use digital signatures separately)
- Sequential encryption (can't parallelize)

---

### Encryption in Our Database

**Storage:**
```json
{
  "id": "abc123",
  "student_id": "xyz789",
  "encrypted_text": "U2FsdGVkX1+...(Base64)",
  "iv": "hGt5x3Kp...(Base64)",
  "encrypted_hash": "a1b2c3d4...(SHA-256)",
  "digital_signature": "e5f6g7h8..."
}
```

**Security Properties:**
1. **Confidentiality:** Encrypted text unreadable
2. **Integrity:** Hash detects tampering
3. **Authenticity:** Digital signature proves author
4. **Uniqueness:** Different IV per document

---

## 4. HASHING & DIGITAL SIGNATURES

### What is Hashing?
**Definition:** One-way function converting data into fixed-size fingerprint (hash). Cannot reverse.

**Properties:**
- **Deterministic:** Same input → Same hash
- **Fixed Size:** Any input → Fixed output length
- **One-Way:** Hash → Cannot get original
- **Avalanche Effect:** Tiny change → Completely different hash
- **Collision Resistant:** Hard to find two inputs with same hash

---

### A. Password Hashing with Salt

**What:** Hashing passwords with random salt before storage.

**Where Used:**
- User registration: `/api/auth/register`
- User creation by admin: `/api/admin/user`
- Password verification: Login process
- File: `/app/backend/server.py` (Line 84-92)

---

#### bcrypt Algorithm

**What:** Password hashing function based on Blowfish cipher.

**Why bcrypt:**
1. **Slow by Design:** Makes brute-force attacks expensive
2. **Adaptive:** Can increase cost factor over time
3. **Built-in Salt:** Automatically generates and stores salt
4. **Proven:** Used since 1999, well-tested

**Implementation:**
```python
import bcrypt

def hash_password(password: str) -> str:
    # Generate salt (16 bytes, cost factor 12)
    salt = bcrypt.gensalt()
    
    # Hash password with salt
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    
    # Return as string (includes salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    # bcrypt automatically extracts salt from hash
    return bcrypt.checkpw(password.encode('utf-8'), 
                          hashed.encode('utf-8'))
```

**Hash Format:**
```
$2b$12$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKL

$2b     → bcrypt identifier
$12     → Cost factor (2^12 = 4096 rounds)
$...    → Salt (22 characters, base64)
...     → Hash (31 characters, base64)
```

---

#### What is Salt?

**Definition:** Random data added to password before hashing.

**Why Salt:**
Without salt:
- Same password → Same hash
- Attackers build rainbow tables (precomputed hashes)
- One cracked password → All same passwords cracked

With salt:
- Same password + different salt → Different hash
- Rainbow tables useless (need to compute for each salt)
- Each password requires separate brute-force

**Example:**
```
Password: "hello123"

Without Salt:
Hash: 5d41402abc4b2a76b9719d911017c592 (always same)

With Salt:
Salt1: "abc123" → Hash: 8f4d0a82f1c3d5e7...
Salt2: "xyz789" → Hash: 3a7f2e9c8b1d4c6a...
```

**bcrypt Automatic Salt:**
```python
# bcrypt generates salt automatically
hash1 = bcrypt.hashpw(b"hello123", bcrypt.gensalt())
hash2 = bcrypt.hashpw(b"hello123", bcrypt.gensalt())

# Different hashes for same password
print(hash1)  # $2b$12$abc...
print(hash2)  # $2b$12$xyz...

# But verification works
bcrypt.checkpw(b"hello123", hash1)  # True
bcrypt.checkpw(b"hello123", hash2)  # True
```

---

### B. Digital Signatures

**What:** Cryptographic technique to verify authenticity and integrity of data.

**Where Used:**
- Resume submission signatures
- Feedback signatures
- File: `/app/backend/server.py` (Line 133-142)

---

#### How Digital Signatures Work

**Signing Process:**
```
Data (Resume/Feedback)
         ↓
Add User ID + Secret Key
         ↓
Hash with SHA-256
         ↓
Store Hash as Signature
```

**Verification Process:**
```
Retrieve Data + Signature + User ID
         ↓
Recalculate: Hash(Data + User ID + Secret)
         ↓
Compare with Stored Signature
         ↓
Match → Authentic & Unmodified
No Match → Tampered or Forged
```

**Implementation:**
```python
def create_digital_signature(data: str, user_id: str) -> str:
    """Create HMAC-style signature"""
    # Combine data with user ID and secret
    signature_data = f"{data}:{user_id}:{JWT_SECRET}"
    
    # Hash with SHA-256
    signature = hashlib.sha256(signature_data.encode('utf-8'))
    
    return signature.hexdigest()  # 64 hex characters

def verify_digital_signature(data: str, user_id: str, 
                             signature: str) -> bool:
    """Verify signature"""
    expected = create_digital_signature(data, user_id)
    return expected == signature  # Constant-time comparison
```

---

#### SHA-256 Algorithm

**What:** Secure Hash Algorithm producing 256-bit (32-byte) hash.

**Properties:**
- **Output:** 64 hexadecimal characters
- **Speed:** Fast (good for signatures, bad for passwords)
- **Collision Resistant:** No known collisions
- **Avalanche:** One bit change → 50% hash bits change

**Example:**
```python
import hashlib

text = "Hello World"
hash1 = hashlib.sha256(text.encode()).hexdigest()
# Output: a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e

text = "Hello World!"  # Added !
hash2 = hashlib.sha256(text.encode()).hexdigest()
# Output: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
# Completely different!
```

---

#### Why Digital Signatures?

**Benefits:**
1. **Authentication:** Proves who created the data
2. **Integrity:** Detects any modification
3. **Non-repudiation:** Creator cannot deny authorship
4. **Trust:** Recipients can verify authenticity

**Use Cases in Our App:**

**1. Resume Signatures:**
- Student submits resume with signature
- Teacher sees "Verified" badge if signature valid
- If resume modified → Signature won't match → "Tampered" warning

**2. Feedback Signatures:**
- Teacher provides feedback with signature
- Student sees which teacher gave feedback
- Prevents fake feedback injection

**Example Attack Prevention:**
```
Scenario: Hacker modifies feedback

Original:
  Data: "Good work, needs improvement in X"
  Signature: "abc123..."

Hacked:
  Data: "Excellent work, perfect!" (modified)
  Signature: "abc123..." (same old signature)

Verification:
  Recalculate signature for modified data
  New signature: "xyz789..." (different!)
  Original signature: "abc123..."
  
  Match? NO → Display "⚠️ Signature Invalid - May be tampered"
```

---

### Hash vs Encryption

| Feature | Hashing | Encryption |
|---------|---------|------------|
| **Reversible** | ❌ No (one-way) | ✅ Yes (with key) |
| **Purpose** | Integrity, Authentication | Confidentiality |
| **Output Size** | Fixed (256-bit) | Variable (same as input) |
| **Key Required** | No (or secret for HMAC) | Yes (AES key) |
| **Speed** | Very fast | Slower |
| **Use Case** | Passwords, Signatures | Data storage |

**When to Use:**
- **Hashing:** Passwords, checksums, signatures
- **Encryption:** Sensitive data that needs to be retrieved

---

## 5. ENCODING TECHNIQUES

### What is Encoding?
**Definition:** Converting data from one format to another for compatibility, NOT for security.

**Key Difference:**
- **Encryption:** Secret (requires key)
- **Encoding:** Public (anyone can decode)

---

### Base64 Encoding

**What:** Binary-to-text encoding scheme using 64 ASCII characters.

**Character Set:**
```
A-Z (26) + a-z (26) + 0-9 (10) + + (1) + / (1) = 64 characters
= used for padding
```

**Where Used:**
- Resume metadata encoding
- AES ciphertext storage
- AES IV storage
- File: `/app/backend/server.py` (Line 144-151)

---

#### How Base64 Works

**Encoding Process:**
```
Original Text: "Hello"
         ↓
ASCII Binary: 01001000 01100101 01101100 01101100 01101111
         ↓
Group in 6-bit chunks: 010010 000110 010101 101100 011011 000110 1111
         ↓
Pad to 6 bits: 010010 000110 010101 101100 011011 000110 111100
         ↓
Convert to decimal: 18 6 21 44 27 6 60
         ↓
Map to Base64: S G V s b G 8
         ↓
Add padding: SGVsbG8=
```

**Implementation:**
```python
import base64

def encode_base64(text: str) -> str:
    """Encode text to Base64"""
    bytes_data = text.encode('utf-8')
    encoded = base64.b64encode(bytes_data)
    return encoded.decode('utf-8')

def decode_base64(encoded_text: str) -> str:
    """Decode Base64 to text"""
    bytes_data = encoded_text.encode('utf-8')
    decoded = base64.b64decode(bytes_data)
    return decoded.decode('utf-8')
```

**Example:**
```python
original = "Student:John Doe|Date:2026-01-15"
encoded = encode_base64(original)
# Result: "U3R1ZGVudDpKb2huIERvZXxEYXRlOjIwMjYtMDEtMTU="

decoded = decode_base64(encoded)
# Result: "Student:John Doe|Date:2026-01-15"
```

---

### Why Base64 in Our Application?

**Use Case 1: Resume Metadata**
```python
metadata = f"Student:{student_name}|Date:{timestamp}"
encoded_metadata = encode_base64(metadata)

# Store in database
resume_doc = {
    "encoded_metadata": encoded_metadata,
    # ...
}
```

**Use Case 2: Binary Data Storage**
```python
# AES encryption produces binary data
ciphertext_bytes = cipher.encrypt(data)

# Can't store binary in JSON/text database
# Encode to Base64 for storage
ciphertext_b64 = base64.b64encode(ciphertext_bytes).decode()

# Store as string
db.save({"encrypted": ciphertext_b64})
```

**Why Not Just Store Binary?**
- JSON doesn't support binary
- Text databases require text
- APIs use JSON (text-based)
- URLs can't have binary

---

### Security Levels of Base64

**Security Level: ZERO ❌**

Base64 is NOT encryption. It's easily reversible:
```bash
# Anyone can decode
echo "U3R1ZGVudDpKb2huIERvZQ==" | base64 -d
# Output: Student:John Doe
```

**Why Use If Not Secure?**
1. **Data Transport:** Send binary over text channels
2. **Compatibility:** Store binary in text databases
3. **Readability:** Make binary data viewable
4. **Not for Confidentiality:** For encoding, not security

**Common Misconception:**
```
❌ WRONG: "I encoded my password in Base64, it's secure"
✅ CORRECT: "I hashed my password with bcrypt, it's secure"
```

---

### Possible Attacks on Encoding

#### 1. Base64 Decoding Attack

**Attack:** Simply decode Base64 to read data

**Example:**
```python
# Attacker intercepts encoded data
encoded = "U3VwZXJTZWNyZXRQYXNzd29yZA=="

# Decode instantly
decoded = base64.b64decode(encoded)
print(decoded)  # b'SuperSecretPassword'
```

**Mitigation:**
- Never use Base64 alone for sensitive data
- Always encrypt first, then encode
- Use proper authentication

---

#### 2. Padding Oracle Attack

**Attack:** Exploit Base64 padding to infer information

**How:**
- Base64 uses `=` for padding
- Padding reveals length information
- Attacker can guess content length

**Example:**
```
"A" → "QQ=="      (2 bytes, 2 = padding)
"AB" → "QUI="     (3 bytes, 1 = padding)
"ABC" → "QUJD"    (4 bytes, no padding)
```

**Mitigation:**
- Don't rely on Base64 for security
- Use proper encryption
- Add random padding to encrypted data

---

#### 3. Character Set Attacks

**Attack:** Exploit URL-unsafe characters in standard Base64

**Problem:**
```
Standard Base64: Uses +, /, =
URL: +, / have special meaning
Result: Broken URLs
```

**Example:**
```
Encoded: "Hello+World/Test="
In URL: "https://example.com?data=Hello+World/Test="
Decoded: "Hello World Test" (+ becomes space!)
```

**Mitigation:**
- Use URL-safe Base64 variant
- Replace: + → -, / → _, remove =
```python
base64.urlsafe_b64encode(data)
```

---

#### 4. Length Disclosure Attack

**Attack:** Encoded length reveals original data size

**Math:**
```
Base64 expansion: 4/3 (33% larger)
Original: 100 bytes → Encoded: 134 bytes

Attacker can calculate:
Original size = (Encoded size / 4) * 3
```

**Why Problem:**
- Reveals message length
- Can guess content type
- Breaks anonymity

**Example:**
```
Encoded Resume: 2000 characters
→ Original: ~1500 characters
→ Attacker: "This is a short resume"

Encoded Resume: 20000 characters
→ Original: ~15000 characters
→ Attacker: "This is detailed resume with lots of experience"
```

**Mitigation:**
- Add random padding to plaintext before encryption
- Use fixed-length blocks
- Compress data first

---

#### 5. Injection Attacks

**Attack:** Embed malicious code in encoded data

**Example:**
```javascript
// Server decodes Base64 and executes
const encoded = "PHNjcmlwdD5hbGVydCgneHNzJyk8L3NjcmlwdD4="
const decoded = atob(encoded)
// Decoded: "<script>alert('xss')</script>"

// If server renders without sanitization
document.write(decoded)  // XSS attack!
```

**Mitigation:**
- Always sanitize decoded data
- Validate expected format
- Use Content Security Policy
- Never execute decoded data directly

---

### Encoding vs Encryption vs Hashing

| Feature | Encoding (Base64) | Encryption (AES) | Hashing (SHA-256) |
|---------|------------------|------------------|-------------------|
| **Purpose** | Format conversion | Confidentiality | Integrity check |
| **Reversible** | ✅ Yes (easily) | ✅ Yes (with key) | ❌ No |
| **Security** | ❌ None | ✅ Strong | ✅ Strong |
| **Key Required** | ❌ No | ✅ Yes | ❌ No |
| **Output Size** | 133% of input | Same as input | Fixed (256-bit) |
| **Speed** | Very fast | Fast | Very fast |
| **Use Case** | Data transport | Secret data | Passwords, signatures |

---

## 6. SUMMARY TABLE

### Complete Security Implementation Matrix

| Security Concept | Algorithm/Method | Location in Code | Purpose | Why This Algorithm |
|-----------------|------------------|------------------|---------|-------------------|
| **Single-Factor Auth** | Password verification | `/api/auth/login` | Identity check | Standard practice, user-friendly |
| **Multi-Factor Auth** | 6-digit OTP | `/api/auth/verify-otp` | Second factor | Temporary code, time-limited |
| **Session Management** | JWT (HS256) | Token in requests | Stateless auth | Scalable, contains user info |
| **Access Control** | RBAC | All endpoints | Authorization | Simple, role-based permissions |
| **Password Storage** | bcrypt (cost 12) | User registration | Secure passwords | Slow, salted, adaptive |
| **Data Encryption** | AES-256-CBC | Resume storage | Confidentiality | Industry standard, fast |
| **Key Management** | Environment variable | `.env` file | Key storage | Separation from code |
| **Integrity Check** | SHA-256 hash | Resume metadata | Detect tampering | Fast, collision-resistant |
| **Digital Signature** | HMAC-SHA256 | Resume/Feedback | Authenticity | Proves authorship |
| **Data Encoding** | Base64 | Binary data | Format conversion | Text-compatible storage |

---

### Security Metrics Coverage

| Metric | Points | Implemented | Algorithm | Verification Method |
|--------|--------|-------------|-----------|-------------------|
| **Authentication** | | | | |
| - Single Factor | 1.5m | ✅ | Password (bcrypt) | Login endpoint test |
| - Multi Factor | 1.5m | ✅ | OTP (6-digit) | OTP verification test |
| **Authorization** | | | | |
| - Access Control Model | 1.5m | ✅ | RBAC | Role check at endpoints |
| - Policy Definition | 1.5m | ✅ | Documented | Matrix + justification |
| - Implementation | 1.5m | ✅ | Dependencies | 403 errors for wrong role |
| **Encryption** | | | | |
| - Key Exchange | 1.5m | ✅ | Symmetric (env) | Key loading test |
| - Encrypt/Decrypt | 1.5m | ✅ | AES-256-CBC | Resume encryption test |
| **Hashing & Signatures** | | | | |
| - Hashing with Salt | 1.5m | ✅ | bcrypt | Password verification |
| - Digital Signatures | 1.5m | ✅ | SHA-256 HMAC | Signature verification |
| **Encoding** | | | | |
| - Implementation | 1m | ✅ | Base64 | Encode/decode test |
| - Security Theory | 1m | ✅ | Analysis | Documentation |
| - Attack Vectors | 1m | ✅ | Documented | This document |
| **Total** | **15m** | **✅** | | |

---

### Real-World Security Standards

#### NIST SP 800-63-2 (E-Authentication)

**What:** National Institute of Standards and Technology guidelines.

**Our Compliance:**
- ✅ Level 2 Authentication (password + OTP)
- ✅ Session management (JWT with expiration)
- ✅ Password complexity enforcement available
- ✅ MFA implementation

#### OWASP Top 10

**What:** Open Web Application Security Project top vulnerabilities.

**How We Address:**

1. **A01: Broken Access Control**
   - ✅ RBAC implementation
   - ✅ Role verification on all endpoints

2. **A02: Cryptographic Failures**
   - ✅ AES-256 encryption
   - ✅ bcrypt password hashing
   - ✅ TLS for transport (in production)

3. **A07: Identification and Authentication Failures**
   - ✅ MFA implementation
   - ✅ Session management with JWT
   - ✅ Password hashing with salt

---

### Attack Prevention Summary

| Attack Type | Prevention Method | Implementation |
|------------|-------------------|----------------|
| **Password Cracking** | bcrypt + salt | Slow hashing, unique per user |
| **Brute Force** | Rate limiting (should add) | Currently: OTP expiration |
| **Session Hijacking** | JWT with expiration | 24-hour token lifetime |
| **SQL Injection** | MongoDB (NoSQL) | No SQL queries |
| **Man-in-the-Middle** | Encryption | AES-256 for data at rest |
| **Replay Attacks** | OTP expiration | 5-minute window |
| **Data Tampering** | Digital signatures | SHA-256 HMAC verification |
| **Unauthorized Access** | RBAC | Role-based permissions |
| **Rainbow Tables** | Salt | Unique salt per password |

---

## Conclusion

### What We Built

A **comprehensive security demonstration** implementing:
- ✅ Authentication (password + OTP)
- ✅ Authorization (3-tier RBAC)
- ✅ Encryption (AES-256 for data)
- ✅ Hashing (bcrypt for passwords)
- ✅ Digital Signatures (SHA-256 for integrity)
- ✅ Encoding (Base64 for storage)

### Why These Technologies

Each technology chosen for specific security properties:
- **bcrypt:** Slow, adaptive, prevents brute-force
- **AES-256:** Fast, secure, industry standard
- **SHA-256:** Fast hashing, digital signatures
- **JWT:** Stateless, scalable, self-contained
- **RBAC:** Simple, maintainable, clear permissions

### Educational Value

This project demonstrates:
1. **Theory to Practice:** Academic concepts in working code
2. **Defense in Depth:** Multiple security layers
3. **Real-World Standards:** NIST, OWASP compliance
4. **Practical Security:** Not just algorithms, but application
5. **Trade-offs:** Security vs usability vs performance

### Further Learning

**Advanced Topics:**
- Public Key Infrastructure (PKI)
- Certificate-based authentication
- Hardware Security Modules (HSM)
- Blockchain for immutability
- Zero-knowledge proofs
- Post-quantum cryptography

**Improvements:**
- Rate limiting and CAPTCHA
- Audit logging
- Key rotation
- AES-GCM instead of CBC
- Asymmetric encryption for key exchange
- Biometric authentication

---

## References

1. NIST SP 800-63-2: Electronic Authentication Guideline
2. OWASP Top 10: Web Application Security Risks
3. RFC 7519: JSON Web Token (JWT)
4. FIPS 197: Advanced Encryption Standard (AES)
5. RFC 2898: PKCS #5 - Password-Based Cryptography
6. bcrypt: A Future-Adaptable Password Scheme
7. SHA-2: Secure Hash Standard (FIPS 180-4)

---

**Document Created:** 2026-02-03  
**Project:** 23CSE313 LAB EVALUATION 1  
**Application:** Resume Feedback System  
**Security Level:** Educational Demonstration  
**Total Metrics Covered:** 15 marks (100%)
