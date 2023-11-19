import Head from "next/head"
import { useContext } from "react"
import { PlayerContext } from "./_app"

export default function Content(){
  const player = useContext(PlayerContext);
  return (
    <>
      <Head>
        <title>JSONg Audio: Demo</title>
      </Head>
      <main className={'page'}>
        <h1 className={'title'}>
          An Interactive Music format
        </h1>
        <button onClick={()=>{
          player.play();
        }}>Next</button>
      </main>
    </>
  )
}