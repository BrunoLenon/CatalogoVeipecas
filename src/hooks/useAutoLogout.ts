import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const useAutoLogout = (timeoutMinutes = 30) => {
  const timeout = timeoutMinutes * 60 * 1000;
  const timer = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }, timeout);
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll'];

    events.forEach(event =>
      window.addEventListener(event, resetTimer)
    );

    resetTimer(); // inicia o timer

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach(event =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, []);
};

export default useAutoLogout;
