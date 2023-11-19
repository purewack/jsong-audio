import PlayerNav from '@/components/PlayerNav'
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Dispatch, SetStateAction, createContext, useEffect, useState } from 'react'
import JSONg from 'jsong';
import { usePathname } from 'next/navigation';

export type PlayerType = [
  JSONg, 
];
export const PlayerContext = createContext<JSONg>()

export default function App({ Component, pageProps }: AppProps) {
  
  const [player, setPlayer] = useState<JSONg | null>(null)
  const [pending, setPending] = useState(false);

  useEffect(()=>{
    // if(!player) return;
    const p = new JSONg();
    setPlayer(p);
    p.onSectionWillStart = ()=>{
      setPending(true);
    }
    p.onSectionPlayStart = ()=>{
      setPending(false);
    }
    p.onSectionCancelChange = ()=>{
      setPending(false);
    }
  },[])

  const path = usePathname();

  return player && <>
    <PlayerContext.Provider value={player}>
      <PlayerNav show={path !== '/'} pending={pending}/>
      <Component {...pageProps} />
    </PlayerContext.Provider>
  </>
}
