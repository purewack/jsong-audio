import styles from '@/styles/index.module.css'
import { useEffect, useRef, useState } from 'react'
import JSONg from 'jsong'
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {

  return (
    <>
      <Head>
        <title>JSONg Audio</title>
      </Head>
      <main className={'page central'}>
        <h1 className={'title'}>
          What is JSONg Audio?
        </h1>
        <Link href="content">
        <button className={styles.button} 
        >Show Me!</button>
        </Link>
        {/* <button onClick={()=>{
          player.current?.stop()
        }}>Stop</button> */}
      </main>
    </>
  )
}
