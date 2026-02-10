import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

export default function Login() {
  const [searchParams] = useSearchParams();

  return <LoginForm message={searchParams.get('message')} />;
}
