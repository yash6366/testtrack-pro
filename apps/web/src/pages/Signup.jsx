import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignupForm from '../components/SignupForm';

export default function Signup() {
  const navigate = useNavigate();

  const handleSignupSuccess = () => {
    navigate('/login?message=Signup successful! Please login.');
  };

  return <SignupForm onSuccess={handleSignupSuccess} />;
}
