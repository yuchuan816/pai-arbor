'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const handleGoChat = () => {
    router.push('/chat');
  };

  const handleGoTestLab = () => {
    router.push('/test-lab');
  };
  return (
    <div className="flex">
      <button className="px-4" onClick={handleGoChat}>
        Chat
      </button>
      <button className="px-4" onClick={handleGoTestLab}>
        TestLab
      </button>
    </div>
  );
}
