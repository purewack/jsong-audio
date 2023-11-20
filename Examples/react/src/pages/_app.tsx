import PlayerNav from '@/components/PlayerNav'
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Dispatch, SetStateAction, createContext, useEffect, useReducer, useState } from 'react'
import JSONg from 'jsong';
import { usePathname } from 'next/navigation';

export const PlayerContext = createContext<JSONg>(player)

export default function App({ Component, pageProps }: AppProps) {
  
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(()=>{
    const p = new JSONg();
    p.parse('test_song2').then((reason)=>{
      if(reason === 'loading_full'){
      console.log('Full Load play')
      // p.play();
      setReady(true);
      }
    })
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

  return player && ready && <>
    <PlayerContext.Provider value={player}>
      <PlayerNav show={path !== '/'} pending={pending}/>
      <Component {...pageProps}/>
    </PlayerContext.Provider>
  </>
}
