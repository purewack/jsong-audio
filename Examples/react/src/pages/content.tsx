import Head from "next/head"
import { useContext, useEffect, useState } from "react"
import { PlayerContext } from "./_app"
import style from '@/styles/content.module.css'
import clsx from "clsx";

export default function Content(){
  const player = useContext(PlayerContext);

  const [nowPlaying, setNowPlaying] = useState('');
  useEffect(()=>{
    const sectStart = (index, overrides)=>{
        setNowPlaying(player.playingNow?.name)
    }
    if(player.onSectionPlayStart){
        const old = player.onSectionPlayStart;
        player.onSectionPlayStart = (index,overrides)=>{
            old(index,overrides)
            sectStart(index,overrides)
        }
    }
    else 
    player.onSectionPlayStart = sectStart
},[])


  return (
    <>
      <Head>
        <title>JSONg Audio: {nowPlaying}</title>
      </Head>
      <article className={clsx(style.gallery, style.vert)}>
        <section className={clsx('fullpage central',style.A,style.snap)}>
          <h1 className={'title'}>
            An Interactive Music format...
          </h1>
          <button onClick={()=>{
            player.play();
          }}>Next</button>
          {/* <p>{nowPlaying}</p> */}
        </section>

        <section className={clsx('fullpage central',style.B,style.snap)}>
        <h1 className={'title'}>
          ...responding to your actions!
        </h1>
        </section>

        <article className={clsx(style.gallery,style.hor, style.snap, 'fullpage')}>
          <section className={clsx('fullpage central ',style.C,style.snap)}>
            <h1 className={'title'}>
              JSONg audio format allows for multiple tracks.
            </h1>
          </section>

          <section className={clsx('fullpage central ',style.D,style.snap)}>
            <h1 className={'title'}>
              Music playback can be changed dynamically.
            </h1>
          </section>
        </article>
      </article>
    </>
  )
}