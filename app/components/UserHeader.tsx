'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { HiOutlineLogout, HiOutlineUser, HiChevronDown } from 'react-icons/hi';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  profilePicture?: string;
}

export default function UserHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    
    // Handle profile update events with data
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.user) {
        setUser(customEvent.detail.user);
        setIsLoading(false);
      } else {
        // Fallback to fetching if event doesn't have user data
        fetchUserData();
      }
    };
    
    // Set up event listener for profile updates
    window.addEventListener('profile-updated', handleProfileUpdate);
    
    // Refresh user data every 5 minutes
    const intervalId = setInterval(fetchUserData, 5 * 60 * 1000);
    
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
      clearInterval(intervalId);
    };
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/signin');
      }
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isLoading) {
    return <div className="h-10 flex items-center px-3"></div>;
  }
  
  // Function to properly capitalize names
  const formatName = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  // Extract initials for avatar
  const getInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return user.name.charAt(0).toUpperCase();
  };
  
  // Get role badge color
  const getRoleBadgeColor = () => {
    if (!user?.role) return 'bg-gray-100 text-gray-600';
    
    switch (user.role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-600';
      case 'supervisor':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-green-100 text-green-600';
    }
  };

  return (
    <div className="h-10 flex items-center justify-end px-3 bg-white">
      {user && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center border border-gray-300 rounded-full px-2 py-1 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 bg-blue-500 rounded-full mr-2 flex items-center justify-center border border-gray-300 overflow-hidden">
              {user.profilePicture ? (
                <Image
                  src={user.profilePicture}
                  alt="Profile Picture"
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-bold">
                  {getInitials()}
                </span>
              )}
            </div>
            <p className="text-xs font-medium mr-2">
              {user.name ? formatName(user.name) : user.email.split('@')[0]}
            </p>
            <span className={`inline-block px-1 py-0.5 rounded-full text-[10px] font-medium capitalize ${getRoleBadgeColor()}`}>
              {user.role || 'user'}
            </span>
            <HiChevronDown className={`w-3 h-3 ml-1 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">
                  {user.name ? formatName(user.name) : user.email.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Navigate to profile page or settings
                  window.location.href = '/edit-profile';
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <HiOutlineUser className="w-4 h-4 mr-3" />
                Profile Settings
              </button>
              
              <button
                onClick={() => {
                  setShowDropdown(false);
                  setShowSignOutConfirm(true);
                }}
                disabled={isSigningOut}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HiOutlineLogout className="w-4 h-4 mr-3" />
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sign Out Confirmation Popup */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <HiOutlineLogout className="w-8 h-8 text-red-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Sign Out</h3>
                <p className="text-sm text-gray-500">Are you sure you want to sign out?</p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSignOutConfirm(false);
                  handleSignOut();
                }}
                disabled={isSigningOut}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {isSigningOut ? 'Signing Out...' : 'Yes, Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 