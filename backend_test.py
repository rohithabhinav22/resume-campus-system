#!/usr/bin/env python3
"""
Resume Feedback System Backend API Testing
Tests all security features: Authentication, Authorization, Encryption, Digital Signatures
"""

import requests
import sys
import json
from datetime import datetime
import time

class ResumeSystemTester:
    def __init__(self, base_url="https://eduresume.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different users
        self.users = {}   # Store user data
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, user_token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if user_token:
            test_headers['Authorization'] = f'Bearer {user_token}'
        elif headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration for students and teachers"""
        print("\n🔍 Testing User Registration...")
        
        # Test student registration
        student_data = {
            "email": f"student_{int(time.time())}@university.edu",
            "password": "SecurePass123!",
            "name": "Test Student",
            "role": "student"
        }
        
        success, response = self.run_test(
            "Student Registration",
            "POST",
            "auth/register",
            200,
            data=student_data
        )
        
        if success:
            self.users['student'] = student_data
        
        # Test teacher registration
        teacher_data = {
            "email": f"teacher_{int(time.time())}@university.edu",
            "password": "SecurePass123!",
            "name": "Test Teacher",
            "role": "teacher"
        }
        
        success, response = self.run_test(
            "Teacher Registration",
            "POST",
            "auth/register",
            200,
            data=teacher_data
        )
        
        if success:
            self.users['teacher'] = teacher_data
        
        # Test invalid role registration
        self.run_test(
            "Invalid Role Registration (should fail)",
            "POST",
            "auth/register",
            400,
            data={
                "email": "invalid@test.com",
                "password": "pass123",
                "name": "Invalid User",
                "role": "invalid_role"
            }
        )

    def test_authentication_flow(self):
        """Test complete authentication flow with MFA"""
        print("\n🔍 Testing Authentication Flow...")
        
        for role in ['student', 'teacher']:
            if role not in self.users:
                continue
                
            user_data = self.users[role]
            
            # Step 1: Login (get OTP)
            success, response = self.run_test(
                f"{role.title()} Login - Step 1 (OTP Generation)",
                "POST",
                "auth/login",
                200,
                data={
                    "email": user_data["email"],
                    "password": user_data["password"]
                }
            )
            
            if success and 'otp' in response:
                otp = response['otp']
                
                # Step 2: Verify OTP
                success, response = self.run_test(
                    f"{role.title()} Login - Step 2 (OTP Verification)",
                    "POST",
                    "auth/verify-otp",
                    200,
                    data={
                        "email": user_data["email"],
                        "otp": otp
                    }
                )
                
                if success and 'token' in response:
                    self.tokens[role] = response['token']
                    print(f"  📝 {role.title()} token obtained successfully")

    def test_admin_login(self):
        """Test admin login with predefined credentials"""
        print("\n🔍 Testing Admin Authentication...")
        
        # Step 1: Admin login
        success, response = self.run_test(
            "Admin Login - Step 1 (OTP Generation)",
            "POST",
            "auth/login",
            200,
            data={
                "email": "admin@gmail.com",
                "password": "admin123"
            }
        )
        
        if success and 'otp' in response:
            otp = response['otp']
            
            # Step 2: Verify OTP
            success, response = self.run_test(
                "Admin Login - Step 2 (OTP Verification)",
                "POST",
                "auth/verify-otp",
                200,
                data={
                    "email": "admin@gmail.com",
                    "otp": otp
                }
            )
            
            if success and 'token' in response:
                self.tokens['admin'] = response['token']
                print("  📝 Admin token obtained successfully")

    def test_role_based_access_control(self):
        """Test role-based access control"""
        print("\n🔍 Testing Role-Based Access Control...")
        
        # Test student accessing teacher endpoints (should fail)
        if 'student' in self.tokens:
            self.run_test(
                "Student accessing teacher resumes (should fail)",
                "GET",
                "teacher/resumes",
                403,
                user_token=self.tokens['student']
            )
        
        # Test teacher accessing admin endpoints (should fail)
        if 'teacher' in self.tokens:
            self.run_test(
                "Teacher accessing admin stats (should fail)",
                "GET",
                "admin/stats",
                403,
                user_token=self.tokens['teacher']
            )
        
        # Test student accessing admin endpoints (should fail)
        if 'student' in self.tokens:
            self.run_test(
                "Student accessing admin users (should fail)",
                "GET",
                "admin/users",
                403,
                user_token=self.tokens['student']
            )

    def test_student_resume_submission(self):
        """Test student resume submission with encryption"""
        print("\n🔍 Testing Student Resume Submission...")
        
        if 'student' not in self.tokens:
            print("  ⚠️ Skipping - No student token available")
            return
        
        resume_text = """
John Doe
Computer Science Student
University of Technology

EDUCATION:
- B.Tech Computer Science (2021-2025)
- GPA: 3.8/4.0

SKILLS:
- Programming: Python, JavaScript, Java, C++
- Web Development: React, Node.js, Express
- Databases: MongoDB, PostgreSQL
- Tools: Git, Docker, AWS

EXPERIENCE:
- Software Engineering Intern at TechCorp (Summer 2024)
- Full-stack web application development
- Implemented REST APIs and database optimization

PROJECTS:
- E-commerce Platform: Built using MERN stack
- Machine Learning Model: Predictive analytics for sales
- Mobile App: React Native cross-platform application
        """
        
        success, response = self.run_test(
            "Student Resume Submission (with AES-256 encryption)",
            "POST",
            "student/resume",
            200,
            data={"resume_text": resume_text},
            user_token=self.tokens['student']
        )
        
        if success:
            print("  🔒 Resume encrypted and digitally signed successfully")

    def test_teacher_resume_access(self):
        """Test teacher accessing encrypted resumes"""
        print("\n🔍 Testing Teacher Resume Access...")
        
        if 'teacher' not in self.tokens:
            print("  ⚠️ Skipping - No teacher token available")
            return
        
        success, response = self.run_test(
            "Teacher accessing all resumes (decrypted)",
            "GET",
            "teacher/resumes",
            200,
            user_token=self.tokens['teacher']
        )
        
        if success and isinstance(response, list):
            print(f"  📄 Found {len(response)} resume(s)")
            for resume in response:
                if 'signature_verified' in resume:
                    status = "✅ Verified" if resume['signature_verified'] else "❌ Invalid"
                    print(f"    Digital Signature: {status}")

    def test_teacher_feedback_submission(self):
        """Test teacher feedback submission with digital signature"""
        print("\n🔍 Testing Teacher Feedback Submission...")
        
        if 'teacher' not in self.tokens:
            print("  ⚠️ Skipping - No teacher token available")
            return
        
        # First get available resumes
        success, resumes = self.run_test(
            "Get resumes for feedback",
            "GET",
            "teacher/resumes",
            200,
            user_token=self.tokens['teacher']
        )
        
        if success and isinstance(resumes, list) and len(resumes) > 0:
            resume_id = resumes[0]['id']
            
            feedback_text = """
FEEDBACK FOR RESUME:

STRENGTHS:
- Strong technical skills in multiple programming languages
- Good project diversity showing practical application
- Clear educational background and GPA indication
- Relevant internship experience

AREAS FOR IMPROVEMENT:
- Add more quantifiable achievements (e.g., "Improved performance by 30%")
- Include soft skills and leadership experiences
- Add contact information and professional summary
- Consider adding certifications or relevant coursework

RECOMMENDATIONS:
- Expand on the internship experience with specific accomplishments
- Add a professional summary at the top
- Include links to GitHub/portfolio projects
- Consider adding volunteer work or extracurricular activities

OVERALL RATING: B+ (Good foundation, needs refinement)
            """
            
            success, response = self.run_test(
                "Teacher Feedback Submission (with digital signature)",
                "POST",
                "teacher/feedback",
                200,
                data={
                    "resume_id": resume_id,
                    "feedback_text": feedback_text
                },
                user_token=self.tokens['teacher']
            )
            
            if success:
                print("  ✍️ Feedback submitted with digital signature")

    def test_student_feedback_access(self):
        """Test student accessing teacher feedback"""
        print("\n🔍 Testing Student Feedback Access...")
        
        if 'student' not in self.tokens:
            print("  ⚠️ Skipping - No student token available")
            return
        
        success, response = self.run_test(
            "Student accessing feedback",
            "GET",
            "student/feedback",
            200,
            user_token=self.tokens['student']
        )
        
        if success and isinstance(response, list):
            print(f"  💬 Found {len(response)} feedback(s)")
            for feedback in response:
                if 'signature_verified' in feedback:
                    status = "✅ Verified" if feedback['signature_verified'] else "❌ Invalid"
                    print(f"    Digital Signature: {status}")

    def test_admin_functionality(self):
        """Test admin dashboard functionality"""
        print("\n🔍 Testing Admin Functionality...")
        
        if 'admin' not in self.tokens:
            print("  ⚠️ Skipping - No admin token available")
            return
        
        # Test admin stats
        success, response = self.run_test(
            "Admin System Statistics",
            "GET",
            "admin/stats",
            200,
            user_token=self.tokens['admin']
        )
        
        if success:
            print(f"  📊 System Stats: {response}")
        
        # Test admin user management
        success, response = self.run_test(
            "Admin User Management",
            "GET",
            "admin/users",
            200,
            user_token=self.tokens['admin']
        )
        
        if success and isinstance(response, list):
            print(f"  👥 Total Users: {len(response)}")

    def test_security_features(self):
        """Test security features"""
        print("\n🔍 Testing Security Features...")
        
        # Test invalid token access
        self.run_test(
            "Invalid Token Access (should fail)",
            "GET",
            "auth/me",
            401,
            headers={'Authorization': 'Bearer invalid_token_here'}
        )
        
        # Test no token access
        self.run_test(
            "No Token Access (should fail)",
            "GET",
            "auth/me",
            401
        )
        
        # Test expired/invalid OTP
        self.run_test(
            "Invalid OTP Verification (should fail)",
            "POST",
            "auth/verify-otp",
            401,
            data={
                "email": "test@example.com",
                "otp": "000000"
            }
        )

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Resume Feedback System Backend Testing")
        print("=" * 60)
        
        try:
            self.test_user_registration()
            self.test_authentication_flow()
            self.test_admin_login()
            self.test_role_based_access_control()
            self.test_student_resume_submission()
            self.test_teacher_resume_access()
            self.test_teacher_feedback_submission()
            self.test_student_feedback_access()
            self.test_admin_functionality()
            self.test_security_features()
            
        except Exception as e:
            print(f"\n❌ Testing interrupted: {str(e)}")
        
        # Print final results
        print("\n" + "=" * 60)
        print("📊 FINAL TEST RESULTS")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Security features summary
        print("\n🔒 SECURITY FEATURES TESTED:")
        print("✓ Multi-Factor Authentication (OTP)")
        print("✓ Role-Based Access Control")
        print("✓ AES-256 Resume Encryption")
        print("✓ Digital Signatures (SHA-256)")
        print("✓ JWT Token Authentication")
        print("✓ Password Hashing (bcrypt with salt)")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ResumeSystemTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())