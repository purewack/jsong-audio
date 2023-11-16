import styles from '@/styles/index.module.css'
import { useEffect, useRef } from 'react'
import JSONg from 'jsong'

export default function Home() {

  const player = useRef<JSONg>();
  useEffect(()=>{
    if(!player.current) {
      player.current = new JSONg(true);
    }
  },[])

  return (
    <>
      <main>
        <h1>
          What is JSONg audio?
        </h1>
      </main>
    </>
  )
}
