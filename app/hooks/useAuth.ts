import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const useAuth = () => {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
   
    if (!token) {
      router.push('/user/login'); 
    }
  }, []);
};

export default useAuth;
