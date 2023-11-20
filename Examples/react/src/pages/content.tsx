import Head from "next/head"
import { useContext, useEffect, useState } from "react"
import { PlayerContext } from "./_app"
import style from '@/styles/content.module.css'
import clsx from "clsx";
import SectionSlide from "@/components/SectionSlide";

export default function Content(){
 
  const [section, setSection] = useState('');
  useEffect(()=>{
    console.log('=========section',section);
  },[section])

  const player = useContext(PlayerContext);
  const [nowPlaying, setNowPlaying] = useState('');
  useEffect(()=>{
    const sectStart = (index: PlayerSectionIndex, overrides): void=>{
        setNowPlaying(player.playingNow?.name)
        setSection(player.playingNow?.name)
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

  const onNext = (tag:string)=>{
    player.play()
    console.log('++++++++play',tag)
  }


  return (
    <>
      <Head>
        <title>JSONg Audio: {nowPlaying}</title>
      </Head>

      <SectionSlide type='down'>
        <SectionSlide tag='A' className={style.A}>
          <h1 className={'title'}>
            An Interactive Music format...
          </h1>
          <button onClick={()=>{
            player.play();
          }}>Next</button>
          {/* <p>{nowPlaying}</p> */}
        </SectionSlide>

        <SectionSlide tag='B' onInView={onNext} className={style.B}>
          <h1 className={'title'}>
            ...responding to your actions!
          </h1>
        </SectionSlide>

        {<SectionSlide type="side">
          <SectionSlide tag='C' onInView={onNext} className={style.C}>
            <h1 className={'title'}>
              JSONg audio format allows for multiple tracks.
            </h1>
          </SectionSlide>

          {<SectionSlide tag='D' onInView={onNext} className={style.D}> 
            <h1 className={'title'}>
              Music playback can be changed dynamically.
            </h1>
          </SectionSlide>}
        </SectionSlide>}
      </SectionSlide>
    </>
  )
}