import PlayerNav from '@/components/PlayerNav'
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Dispatch, MutableRefObject, SetStateAction, createContext, useEffect, useRef, useState } from 'react'
import JSONg from 'jsong';

export const PlayerContext = createContext<MutableRefObject<JSONg | null> | null>(null)

export default function App({ Component, pageProps }: AppProps) {
  
  const player = useRef<JSONg | null>(null)

  useEffect(()=>{
    if(!player.current) {
      const p = new JSONg(true);
      player.current = p;
    }
  },[])

  return <>
    <PlayerContext.Provider value={player}>
      <PlayerNav />
      <Component {...pageProps} />
    </PlayerContext.Provider>
  </>
}
