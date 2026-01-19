'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Divider } from '@/app/components/ui/Divider';
import { PasswordInput } from '@/app/components/ui/PasswordInput';
import { AuthLayout } from '@/app/components/ui/AuthLayout';
import { motion } from 'framer-motion';

// Form error interface
interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user', // Default role
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [formHeight, setFormHeight] = useState(0);

  // Record the form height before OTP is shown
  useEffect(() => {
    if (!showOTPInput) {
      const form = document.getElementById('signup-form');
      if (form) {
        setFormHeight(form.clientHeight);
      }
    }
  }, [showOTPInput]);

  // Form validation function
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (!/^[A-Za-z\s]+$/.test(formData.name.trim())) {
      errors.name = 'Name can only contain letters and spaces';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      errors.password = 'Password must include at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = 'Password must include at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must include at least one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Clear specific field error when user types
  const clearError = (field: keyof FormErrors) => {
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: undefined });
    }
  };

  const handleSendOTP = async () => {
    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('OTP sent successfully!');
        setShowOTPInput(true);
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    // Validate OTP input
    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp,
          name: formData.name,
          password: formData.password,
          role: formData.role
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Account created successfully!');
        router.push('/');
      } else {
        toast.error(data.error || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      toast.error('Failed to verify OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  // BPMN diagram content for illustration
  const bpmnIllustration = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto px-4 sm:px-8 py-4 sm:py-6 bg-white/10 rounded-2xl backdrop-blur-lg border border-white/20 shadow-2xl"
    >
      <motion.h3 
        className="text-center text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Text to BPMN Conversion
      </motion.h3>
      
      <div className="relative h-[160px] sm:h-[200px] overflow-hidden">
        {/* Text input bubble */}
        <motion.div
          className="absolute left-[30px] sm:left-[50px] top-[8px] sm:top-[10px] max-w-[120px] sm:max-w-[140px] bg-gradient-to-br from-blue-400 to-blue-600 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg"
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, type: "spring", stiffness: 150 }}
        >
          <div className="font-medium">&quot;Start process&quot;</div>
          <div className="absolute bottom-[-6px] left-4 sm:left-6 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-blue-500"></div>
        </motion.div>

        {/* Transformation arrow */}
        <motion.div
          className="absolute left-[65px] sm:left-[90px] top-[40px] sm:top-[50px] flex items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <motion.div 
            className="w-[45px] sm:w-[60px] h-[2px] bg-gradient-to-r from-purple-400 to-indigo-500"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          />
          <motion.div 
            className="w-0 h-0 border-l-[6px] sm:border-l-[8px] border-t-[3px] sm:border-t-[4px] border-b-[3px] sm:border-b-[4px] border-l-indigo-500 border-t-transparent border-b-transparent ml-[-1px]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.2, duration: 0.3 }}
          />
        </motion.div>

        {/* Start Event - Proper BPMN circle */}
        <motion.div
          className="absolute left-[15px] sm:left-[20px] top-[70px] sm:top-[90px] w-[32px] sm:w-[40px] h-[32px] sm:h-[40px] rounded-full bg-white border-[2px] sm:border-[3px] border-green-500 flex items-center justify-center shadow-lg"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 1.4, duration: 0.6, type: "spring", stiffness: 100 }}
        >
          <motion.div 
            className="w-[6px] sm:w-[8px] h-[6px] sm:h-[8px] rounded-full bg-green-500"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.8, duration: 0.3 }}
          />
        </motion.div>

        {/* Sequence Flow 1 */}
        <motion.div className="absolute left-[50px] sm:left-[65px] top-[84px] sm:top-[108px] flex items-center">
          <motion.div 
            className="w-[40px] sm:w-[50px] h-[2px] bg-gray-600"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 2.0, duration: 0.4 }}
          />
          <motion.div 
            className="w-0 h-0 border-l-[5px] sm:border-l-[6px] border-t-[2.5px] sm:border-t-[3px] border-b-[2.5px] sm:border-b-[3px] border-l-gray-600 border-t-transparent border-b-transparent ml-[-1px]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 2.3, duration: 0.2 }}
          />
        </motion.div>

        {/* Task - Proper BPMN rounded rectangle */}
        <motion.div
          className="absolute left-[95px] sm:left-[120px] top-[66px] sm:top-[85px] w-[65px] sm:w-[80px] h-[40px] sm:h-[50px] bg-white border-[2px] border-blue-500 rounded-[6px] sm:rounded-[8px] flex items-center justify-center shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 0.5, type: "spring", stiffness: 120 }}
        >
          <motion.div 
            className="text-[9px] sm:text-[10px] font-semibold text-blue-700 text-center leading-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.8, duration: 0.3 }}
          >
            Process<br/>Text
          </motion.div>
        </motion.div>

        {/* Sequence Flow 2 */}
        <motion.div className="absolute left-[165px] sm:left-[205px] top-[84px] sm:top-[108px] flex items-center">
          <motion.div 
            className="w-[32px] sm:w-[40px] h-[2px] bg-gray-600"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 3.0, duration: 0.4 }}
          />
          <motion.div 
            className="w-0 h-0 border-l-[5px] sm:border-l-[6px] border-t-[2.5px] sm:border-t-[3px] border-b-[2.5px] sm:border-b-[3px] border-l-gray-600 border-t-transparent border-b-transparent ml-[-1px]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 3.3, duration: 0.2 }}
          />
        </motion.div>

        {/* Gateway - Proper BPMN diamond */}
        <motion.div
          className="absolute left-[202px] sm:left-[250px] top-[75px] sm:top-[95px] w-[24px] sm:w-[30px] h-[24px] sm:h-[30px] bg-white border-[2px] border-yellow-500 transform rotate-45 flex items-center justify-center shadow-lg"
          initial={{ scale: 0, rotate: 0 }}
          animate={{ scale: 1, rotate: 45 }}
          transition={{ delay: 3.5, duration: 0.5, type: "spring", stiffness: 100 }}
        >
          <motion.div 
            className="w-[6px] sm:w-[8px] h-[6px] sm:h-[8px] text-yellow-600 transform -rotate-45 text-[6px] sm:text-[8px] font-bold flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.8, duration: 0.3 }}
          >
            ×
          </motion.div>
        </motion.div>

        {/* Sequence Flow 3 */}
        <motion.div className="absolute left-[230px] sm:left-[285px] top-[84px] sm:top-[108px] flex items-center">
          <motion.div 
            className="w-[36px] sm:w-[45px] h-[2px] bg-gray-600"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 4.0, duration: 0.4 }}
          />
          <motion.div 
            className="w-0 h-0 border-l-[5px] sm:border-l-[6px] border-t-[2.5px] sm:border-t-[3px] border-b-[2.5px] sm:border-b-[3px] border-l-gray-600 border-t-transparent border-b-transparent ml-[-1px]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 4.3, duration: 0.2 }}
          />
        </motion.div>

        {/* End Event - Proper BPMN double circle */}
        <motion.div
          className="absolute left-[270px] sm:left-[335px] top-[70px] sm:top-[90px] w-[32px] sm:w-[40px] h-[32px] sm:h-[40px] rounded-full bg-white border-[2px] sm:border-[3px] border-red-500 flex items-center justify-center shadow-lg"
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 4.5, duration: 0.6, type: "spring", stiffness: 100 }}
        >
          <motion.div 
            className="w-[20px] sm:w-[25px] h-[20px] sm:h-[25px] rounded-full border-[2px] border-red-500"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 4.8, duration: 0.3 }}
          />
        </motion.div>

        {/* Labels with proper BPMN terminology */}
        <motion.div
          className="absolute left-[18px] sm:left-[25px] top-[110px] sm:top-[140px] text-[9px] sm:text-[10px] font-medium text-white/90 text-center"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5.0, duration: 0.3 }}
        >
          Start Event
        </motion.div>

        <motion.div
          className="absolute left-[108px] sm:left-[135px] top-[110px] sm:top-[140px] text-[9px] sm:text-[10px] font-medium text-white/90 text-center"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5.2, duration: 0.3 }}
        >
          User Task
        </motion.div>

        <motion.div
          className="absolute left-[194px] sm:left-[240px] top-[110px] sm:top-[140px] text-[9px] sm:text-[10px] font-medium text-white/90 text-center"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5.4, duration: 0.3 }}
        >
          Gateway
        </motion.div>

        <motion.div
          className="absolute left-[275px] sm:left-[345px] top-[110px] sm:top-[140px] text-[9px] sm:text-[10px] font-medium text-white/90 text-center"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5.6, duration: 0.3 }}
        >
          End Event
        </motion.div>

        {/* Animated data flow particles */}
        <motion.div
          className="absolute left-[70px] sm:left-[90px] top-[83px] sm:top-[107px] w-[2px] h-[2px] bg-cyan-400 rounded-full"
          animate={{ 
            x: [0, 240, 240],
            opacity: [0, 1, 1, 0]
          }}
          transition={{ 
            delay: 6.0,
            duration: 2.5,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut"
          }}
        />

        {/* Process completion indicator */}
        <motion.div
          className="absolute right-[8px] sm:right-[10px] top-[15px] sm:top-[20px] w-[16px] sm:w-[20px] h-[16px] sm:h-[20px] rounded-full bg-green-500 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.2, 1], opacity: 1 }}
          transition={{ delay: 6.5, duration: 0.6 }}
        >
          <motion.div 
            className="text-white text-[8px] sm:text-[10px] font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 6.8, duration: 0.3 }}
          >
            ✓
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <AuthLayout
      title=""
      subtitle=""
      bpmnIllustration={bpmnIllustration}
      showFeatures={false}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        style={{
          minHeight: showOTPInput && formHeight ? `${formHeight}px` : 'auto'
        }}
      >
        {/* Decorative elements */}
        <div className="absolute -top-2 -right-2">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full opacity-10"></div>
        </div>
        <div className="absolute -bottom-3 -left-3">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-400 to-blue-600 rounded-full opacity-10"></div>
        </div>

        <div className="mb-6 relative">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-2xl font-bold text-gray-900 mb-1 flex items-center"
          >
            Create your account
            <div className="ml-2 w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-gray-600 text-sm"
          >
            Fill in your details to get started
          </motion.p>
        </div>

        <motion.form
          id="signup-form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (showOTPInput) {
              handleVerifyOTP();
            } else {
              handleSendOTP();
            }
          }}
        >
          {!showOTPInput ? (
            <>
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    clearError('name');
                  }}
                  error={formErrors.name}
                  className="focus:ring-indigo-500 focus:border-indigo-500"
                />

                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    clearError('email');
                  }}
                  error={formErrors.email}
                  className="focus:ring-indigo-500 focus:border-indigo-500"
                />

                <PasswordInput
                  id="password"
                  name="password"
                  required
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    clearError('password');
                  }}
                  error={formErrors.password}
                />

                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    clearError('confirmPassword');
                  }}
                  error={formErrors.confirmPassword}
                />
                <motion.p
                  className="text-xs text-gray-500 -mt-1 pl-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                >
                  <span className="inline-block mr-1">
                    <svg className="w-3 h-3 inline text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </span>
                  Password must be at least 8 characters and include uppercase, lowercase, and numbers
                </motion.p>

                <motion.div
                  className="mt-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Select your role
                  </label>
                  <div className="relative">
                    <select
                      id="role"
                      name="role"
                      className="appearance-none w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="supervisor">Supervisor</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              >
                <Button
                  type="submit"
                  isLoading={isLoading}
                  fullWidth
                  className="mt-6 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 transition-all duration-200 py-2.5"
                >
                  Create Account
                </Button>
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="mb-4 flex flex-col items-center">
                <motion.div
                  className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                >
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </motion.div>
                <motion.h3
                  className="text-lg font-semibold text-gray-900 mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  Verify your email
                </motion.h3>
                <motion.p
                  className="text-sm text-gray-600 text-center mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  We&apos;ve sent a verification code to <span className="font-medium">{formData.email}</span>
                </motion.p>
              </div>

              <motion.div
                className="w-full mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter verification code
                </label>
                <div className="flex space-x-2 justify-center">
                  {[...Array(6)].map((_, index) => (
                    <motion.input
                      key={index}
                      type="text"
                      maxLength={1}
                      className="w-10 h-12 text-center text-lg font-bold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={otp[index] || ''}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.5 + (index * 0.1) }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          const newOtp = otp.split('');
                          newOtp[index] = val;
                          setOtp(newOtp.join(''));

                          // Auto-focus next input
                          if (val && index < 5) {
                            const nextInput = document.querySelector(`input[name=otp-${index + 1}]`);
                            if (nextInput) {
                              (nextInput as HTMLInputElement).focus();
                            }
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        // Handle backspace to focus previous input
                        if (e.key === 'Backspace' && !otp[index] && index > 0) {
                          const prevInput = document.querySelector(`input[name=otp-${index - 1}]`);
                          if (prevInput) {
                            (prevInput as HTMLInputElement).focus();
                          }
                        }
                      }}
                      name={`otp-${index}`}
                    />
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.8 }}
              >
                <Button
                  type="submit"
                  isLoading={isVerifying}
                  fullWidth
                  className="bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 transition-all duration-200 py-2.5"
                >
                  Verify & Create Account
                </Button>
              </motion.div>

              <motion.p
                className="mt-4 text-sm text-gray-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.9 }}
              >
                Didn&apos;t receive the code?{' '}
                <button
                  type="button"
                  className="text-indigo-600 font-medium hover:text-indigo-500"
                  onClick={handleSendOTP}
                  disabled={isLoading}
                >
                  Resend
                </button>
              </motion.p>
            </motion.div>
          )}
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="mt-6 text-center"
        >
          <Link
            href="/signin"
            className="text-indigo-600 hover:text-indigo-500 font-medium text-sm flex items-center justify-center transition-all duration-200 hover:translate-y-[-2px]"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Already have an account? Sign in
          </Link>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
} 