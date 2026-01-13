'use client';

import { useState, useEffect, useRef } from 'react';
import { profileSchema, changePasswordSchema } from '@/lib/validations';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/lib/authService';
import { useRouter } from 'next/navigation';
import FormBuilder from '@/components/FormBuilder';
import { Upload, Camera } from 'lucide-react';

export default function ProfilePage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const { user, updateProfile, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size should be less than 2MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    setUploadingAvatar(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('profile_image', avatarFile);
      
      const response = await authService.uploadAvatar(formData);
      
      if (response.data) {
        setSuccess('Profile picture updated successfully!');
        setAvatarFile(null);
        setAvatarPreview(null);
        // Refresh user data
        await authService.getCurrentUser();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileSubmit = async (data) => {
    setError('');
    setSuccess('');

    try {
      const result = await updateProfile(data);
      
      if (result.success) {
        setSuccess('Profile updated successfully!');
      } else {
        setError(typeof result.error === 'object' 
          ? JSON.stringify(result.error) 
          : result.error
        );
        throw new Error(result.error);
      }
    } catch (err) {
      setError('Failed to update profile');
      throw err;
    }
  };

  const handlePasswordSubmit = async (data) => {
    setError('');
    setSuccess('');

    try {
      await authService.changePassword({
        old_password: data.old_password,
        new_password: data.new_password,
      });
      
      setSuccess('Password changed successfully!');
    } catch (err) {
      const errorMsg = err.response?.data?.old_password?.[0] || 
                      err.response?.data?.error || 
                      'Failed to change password';
      setError(errorMsg);
      throw err;
    }
  };

  // Profile form configuration
  const profileFormConfig = {
    schema: profileSchema,
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      state: user?.state || '',
      bio: user?.bio || '',
    },
    onSubmit: handleProfileSubmit,
    fields: [
      {
        name: 'first_name',
        label: 'First Name',
        type: 'text',
        placeholder: 'John',
      },
      {
        name: 'last_name',
        label: 'Last Name',
        type: 'text',
        placeholder: 'Doe',
      },
      {
        name: 'phone',
        label: 'Phone Number',
        type: 'tel',
        placeholder: '+919876543210',
      },
     
      {
        name: 'state',
        label: 'State/Province',
        type: 'text',
        placeholder: 'California',
      },
      {
        name: 'bio',
        label: 'Bio',
        type: 'textarea',
        placeholder: 'Tell us about yourself...',
        rows: 4,
      },
    ],
    submitButton: {
      text: 'Update Profile',
      loadingText: 'Updating...',
    },
    error: activeTab === 'profile' ? error : '',
    success: activeTab === 'profile' ? success : '',
  };

  // Password form configuration
  const passwordFormConfig = {
    schema: changePasswordSchema,
    defaultValues: {
      old_password: '',
      new_password: '',
      new_password_confirm: '',
    },
    onSubmit: handlePasswordSubmit,
    fields: [
      {
        name: 'old_password',
        label: 'Current Password',
        type: 'password',
        placeholder: 'Enter your current password',
      },
      {
        name: 'new_password',
        label: 'New Password',
        type: 'password',
        placeholder: 'Enter new password',
      },
      {
        name: 'new_password_confirm',
        label: 'Confirm New Password',
        type: 'password',
        placeholder: 'Re-enter new password',
      },
    ],
    submitButton: {
      text: 'Change Password',
      loadingText: 'Changing...',
    },
    error: activeTab === 'password' ? error : '',
    success: activeTab === 'password' ? success : '',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userInitials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || user.username?.[0] || 'U'}`.toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                {/* Avatar Display */}
                <div className="relative">
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                    {avatarPreview || user.profile_image ? (
                      <img
                        src={avatarPreview || user.profile_image}
                        alt={user.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-semibold text-gray-600">
                        {userInitials}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {user.first_name && user.last_name 
                      ? `${user.first_name} ${user.last_name}` 
                      : user.username}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-medium">@{user.username}</span> • {user.email}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {user.role}
                    </span>
                    {user.student_status && (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        {user.student_status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setError('');
                  setSuccess('');
                }}
                className={`${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Profile Information
              </button>
              <button
                onClick={() => {
                  setActiveTab('password');
                  setError('');
                  setSuccess('');
                }}
                className={`${
                  activeTab === 'password'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Change Password
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {activeTab === 'profile' ? (
              <div className="max-w-2xl space-y-6">
                {/* Avatar Upload Section */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Picture</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="h-32 w-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                        {avatarPreview || user.profile_image ? (
                          <img
                            src={avatarPreview || user.profile_image}
                            alt={user.username}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl font-semibold text-gray-600">
                            {userInitials}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 rounded-full bg-blue-600 p-2 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <Camera className="h-5 w-5" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-3">
                        Upload a profile picture. JPG, PNG or GIF. Max size 2MB.
                      </p>
                      {avatarFile && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleAvatarUpload}
                            disabled={uploadingAvatar}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {uploadingAvatar ? 'Uploading...' : 'Upload Picture'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAvatarFile(null);
                              setAvatarPreview(null);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Form */}
                <FormBuilder config={profileFormConfig} />
              </div>
            ) : (
              <div className="max-w-md">
                <FormBuilder config={passwordFormConfig} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
