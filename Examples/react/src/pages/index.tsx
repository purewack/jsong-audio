import styles from '@/styles/index.module.css'
import { useEffect, useRef } from 'react'
import JSONg from 'jsong'
import Head from 'next/head';

export default function Home() {

  const player = useRef<JSONg>();
  useEffect(()=>{
    if(!player.current) {
      player.current = new JSONg(true);
    }
  },[])

  return (
    <>
      <Head>
        <title>JSONg Audio</title>
      </Head>
      <main>
        <h1>
          What is JSONg Audio?
        </h1>
      </main>
    </>
  )
}
