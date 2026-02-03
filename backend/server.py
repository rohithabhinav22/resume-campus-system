from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import hashlib
import base64
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import secrets
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# AES Encryption Key (32 bytes for AES-256)
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', base64.b64encode(get_random_bytes(32)).decode())
encryption_key_bytes = base64.b64decode(ENCRYPTION_KEY)

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============ MODELS ============
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # 'student' or 'teacher'

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class SubmitResumeRequest(BaseModel):
    resume_text: str

class SubmitFeedbackRequest(BaseModel):
    resume_id: str
    feedback_text: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str

class ResumeResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    student_email: str
    resume_text: str
    encrypted_hash: str
    digital_signature: str
    created_at: str
    encoded_metadata: str

class FeedbackResponse(BaseModel):
    id: str
    resume_id: str
    teacher_id: str
    teacher_name: str
    teacher_email: str
    feedback_text: str
    digital_signature: str
    created_at: str

# ============ SECURITY FUNCTIONS ============

def hash_password(password: str) -> str:
    """Hash password with bcrypt (includes salt automatically)"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    """Create JWT token"""
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def encrypt_text(plaintext: str) -> tuple[str, str]:
    """Encrypt text using AES-256-CBC and return (ciphertext_b64, iv_b64)"""
    iv = get_random_bytes(16)
    cipher = AES.new(encryption_key_bytes, AES.MODE_CBC, iv)
    padded_data = pad(plaintext.encode('utf-8'), AES.block_size)
    ciphertext = cipher.encrypt(padded_data)
    return base64.b64encode(ciphertext).decode('utf-8'), base64.b64encode(iv).decode('utf-8')

def decrypt_text(ciphertext_b64: str, iv_b64: str) -> str:
    """Decrypt text using AES-256-CBC"""
    ciphertext = base64.b64decode(ciphertext_b64)
    iv = base64.b64decode(iv_b64)
    cipher = AES.new(encryption_key_bytes, AES.MODE_CBC, iv)
    padded_plaintext = cipher.decrypt(ciphertext)
    plaintext = unpad(padded_plaintext, AES.block_size)
    return plaintext.decode('utf-8')

def create_digital_signature(data: str, user_id: str) -> str:
    """Create digital signature using SHA-256 hash"""
    signature_data = f"{data}:{user_id}:{JWT_SECRET}"
    return hashlib.sha256(signature_data.encode('utf-8')).hexdigest()

def verify_digital_signature(data: str, user_id: str, signature: str) -> bool:
    """Verify digital signature"""
    expected_signature = create_digital_signature(data, user_id)
    return expected_signature == signature

def encode_base64(text: str) -> str:
    """Encode text to Base64"""
    return base64.b64encode(text.encode('utf-8')).decode('utf-8')

def decode_base64(encoded_text: str) -> str:
    """Decode Base64 text"""
    return base64.b64decode(encoded_text.encode('utf-8')).decode('utf-8')

def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return str(random.randint(100000, 999999))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get current user from JWT token"""
    token = credentials.credentials
    payload = verify_jwt_token(token)
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ============ API ENDPOINTS ============

@api_router.post("/auth/register")
async def register(data: RegisterRequest):
    """Register new user (student or teacher only)"""
    if data.role not in ['student', 'teacher']:
        raise HTTPException(status_code=400, detail="Invalid role. Only student or teacher allowed")
    
    # Check if email exists
    existing_user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password with salt
    hashed_password = hash_password(data.password)
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": hashed_password,
        "name": data.name,
        "role": data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return {
        "message": "Registration successful",
        "user": {
            "id": user_doc["id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "role": user_doc["role"]
        }
    }

@api_router.post("/auth/login")
async def login(data: LoginRequest):
    """Login - Single factor authentication"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate OTP for MFA
    otp = generate_otp()
    
    # Store OTP temporarily (expires in 5 minutes)
    otp_doc = {
        "email": data.email,
        "otp": otp,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
    }
    
    await db.otps.delete_many({"email": data.email})  # Remove old OTPs
    await db.otps.insert_one(otp_doc)
    
    return {
        "message": "OTP sent",
        "otp": otp,  # In production, send via email/SMS. For testing, return it
        "email": data.email
    }

@api_router.post("/auth/verify-otp")
async def verify_otp(data: VerifyOTPRequest):
    """Verify OTP - Multi-factor authentication"""
    otp_record = await db.otps.find_one({"email": data.email}, {"_id": 0})
    
    if not otp_record:
        raise HTTPException(status_code=401, detail="OTP not found or expired")
    
    # Check expiration
    expires_at = datetime.fromisoformat(otp_record['expires_at'])
    if datetime.now(timezone.utc) > expires_at:
        await db.otps.delete_one({"email": data.email})
        raise HTTPException(status_code=401, detail="OTP expired")
    
    # Verify OTP
    if otp_record['otp'] != data.otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Delete used OTP
    await db.otps.delete_one({"email": data.email})
    
    # Get user and create JWT token
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    token = create_jwt_token(user['id'], user['email'], user['role'])
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role']
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "name": current_user['name'],
        "role": current_user['role']
    }

# ============ STUDENT ENDPOINTS ============

@api_router.post("/student/resume")
async def submit_resume(data: SubmitResumeRequest, current_user: dict = Depends(get_current_user)):
    """Submit resume (student only) - with encryption and digital signature"""
    if current_user['role'] != 'student':
        raise HTTPException(status_code=403, detail="Access denied. Students only")
    
    # Encrypt resume text
    encrypted_text, iv = encrypt_text(data.resume_text)
    
    # Create digital signature
    signature = create_digital_signature(data.resume_text, current_user['id'])
    
    # Create hash for integrity check
    text_hash = hashlib.sha256(data.resume_text.encode('utf-8')).hexdigest()
    
    # Encode metadata (Base64 encoding)
    metadata = f"Student:{current_user['name']}|Date:{datetime.now(timezone.utc).isoformat()}"
    encoded_metadata = encode_base64(metadata)
    
    resume_doc = {
        "id": str(uuid.uuid4()),
        "student_id": current_user['id'],
        "student_name": current_user['name'],
        "student_email": current_user['email'],
        "encrypted_text": encrypted_text,
        "iv": iv,
        "encrypted_hash": text_hash,
        "digital_signature": signature,
        "encoded_metadata": encoded_metadata,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.resumes.insert_one(resume_doc)
    
    return {
        "message": "Resume submitted successfully",
        "resume_id": resume_doc['id'],
        "encrypted": True,
        "signed": True
    }

@api_router.get("/student/feedback")
async def get_student_feedback(current_user: dict = Depends(get_current_user)):
    """Get all feedback for student's resumes"""
    if current_user['role'] != 'student':
        raise HTTPException(status_code=403, detail="Access denied. Students only")
    
    # Get all student's resumes
    resumes = await db.resumes.find({"student_id": current_user['id']}, {"_id": 0}).to_list(1000)
    resume_ids = [r['id'] for r in resumes]
    
    # Get all feedback for these resumes
    feedbacks = await db.feedbacks.find({"resume_id": {"$in": resume_ids}}, {"_id": 0}).to_list(1000)
    
    # Decrypt resumes for display
    result = []
    for feedback in feedbacks:
        # Find corresponding resume
        resume = next((r for r in resumes if r['id'] == feedback['resume_id']), None)
        if resume:
            try:
                decrypted_resume = decrypt_text(resume['encrypted_text'], resume['iv'])
                result.append({
                    "id": feedback['id'],
                    "resume_preview": decrypted_resume[:100] + "...",
                    "feedback_text": feedback['feedback_text'],
                    "teacher_name": feedback['teacher_name'],
                    "teacher_email": feedback['teacher_email'],
                    "digital_signature": feedback['digital_signature'],
                    "created_at": feedback['created_at'],
                    "signature_verified": verify_digital_signature(
                        feedback['feedback_text'], 
                        feedback['teacher_id'], 
                        feedback['digital_signature']
                    )
                })
            except:
                pass
    
    return result

# ============ TEACHER ENDPOINTS ============

@api_router.get("/teacher/resumes")
async def get_all_resumes(current_user: dict = Depends(get_current_user)):
    """Get all student resumes (teacher and admin only)"""
    if current_user['role'] not in ['teacher', 'admin']:
        raise HTTPException(status_code=403, detail="Access denied. Teachers and admins only")
    
    resumes = await db.resumes.find({}, {"_id": 0}).to_list(1000)
    
    result = []
    for resume in resumes:
        try:
            # Decrypt resume text
            decrypted_text = decrypt_text(resume['encrypted_text'], resume['iv'])
            
            # Verify signature
            signature_valid = verify_digital_signature(
                decrypted_text,
                resume['student_id'],
                resume['digital_signature']
            )
            
            # Decode metadata
            decoded_metadata = decode_base64(resume['encoded_metadata'])
            
            result.append({
                "id": resume['id'],
                "student_name": resume['student_name'],
                "student_email": resume['student_email'],
                "resume_text": decrypted_text,
                "encrypted_hash": resume['encrypted_hash'],
                "digital_signature": resume['digital_signature'][:16] + "...",
                "signature_verified": signature_valid,
                "encoded_metadata": decoded_metadata,
                "created_at": resume['created_at']
            })
        except Exception as e:
            logging.error(f"Error decrypting resume: {e}")
    
    return result

@api_router.post("/teacher/feedback")
async def submit_feedback(data: SubmitFeedbackRequest, current_user: dict = Depends(get_current_user)):
    """Submit feedback on resume (teacher only) - with digital signature"""
    if current_user['role'] != 'teacher':
        raise HTTPException(status_code=403, detail="Access denied. Teachers only")
    
    # Verify resume exists
    resume = await db.resumes.find_one({"id": data.resume_id}, {"_id": 0})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Create digital signature for feedback
    signature = create_digital_signature(data.feedback_text, current_user['id'])
    
    feedback_doc = {
        "id": str(uuid.uuid4()),
        "resume_id": data.resume_id,
        "teacher_id": current_user['id'],
        "teacher_name": current_user['name'],
        "teacher_email": current_user['email'],
        "feedback_text": data.feedback_text,
        "digital_signature": signature,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.feedbacks.insert_one(feedback_doc)
    
    return {
        "message": "Feedback submitted successfully",
        "feedback_id": feedback_doc['id'],
        "signed": True
    }

# ============ ADMIN ENDPOINTS ============

@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Access denied. Admins only")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    """Get system statistics (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Access denied. Admins only")
    
    total_users = await db.users.count_documents({})
    total_students = await db.users.count_documents({"role": "student"})
    total_teachers = await db.users.count_documents({"role": "teacher"})
    total_resumes = await db.resumes.count_documents({})
    total_feedbacks = await db.feedbacks.count_documents({})
    
    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_resumes": total_resumes,
        "total_feedbacks": total_feedbacks
    }

@api_router.post("/admin/user")
async def create_user_by_admin(data: RegisterRequest, current_user: dict = Depends(get_current_user)):
    """Create new user as admin"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Access denied. Admins only")
    
    if data.role not in ['student', 'teacher', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Check if email exists
    existing_user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password with salt
    hashed_password = hash_password(data.password)
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": hashed_password,
        "name": data.name,
        "role": data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return {
        "message": "User created successfully",
        "user": {
            "id": user_doc["id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "role": user_doc["role"],
            "password_hash": hashed_password
        }
    }

@api_router.put("/admin/user/{user_id}")
async def update_user(user_id: str, data: RegisterRequest, current_user: dict = Depends(get_current_user)):
    """Update user details (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Access denied. Admins only")
    
    if data.role not in ['student', 'teacher', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email is taken by another user
    if data.email != user['email']:
        existing_user = await db.users.find_one({"email": data.email}, {"_id": 0})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already taken")
    
    # Hash new password
    hashed_password = hash_password(data.password)
    
    update_doc = {
        "email": data.email,
        "password": hashed_password,
        "name": data.name,
        "role": data.role
    }
    
    await db.users.update_one({"id": user_id}, {"$set": update_doc})
    
    return {
        "message": "User updated successfully",
        "user": {
            "id": user_id,
            "email": data.email,
            "name": data.name,
            "role": data.role,
            "password_hash": hashed_password
        }
    }

@api_router.delete("/admin/user/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete user (admin only)"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Access denied. Admins only")
    
    result = await db.users.delete_one({"id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db():
    # Create admin user if not exists
    admin = await db.users.find_one({"email": "admin@gmail.com"}, {"_id": 0})
    if not admin:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "email": "admin@gmail.com",
            "password": hash_password("admin123"),
            "name": "Administrator",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        logger.info("Admin user created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()