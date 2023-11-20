import {CSSProperties, useContext, useEffect, useRef, useState } from "react"
import JSONg from 'jsong';
import style from '@/styles/nav.module.css'

import clsx from "clsx";
import { PlayerContext } from "@/pages/_app";

export default function PlayerNav({show=true, pending=false}){

    const player = useContext<JSONg>(PlayerContext);
    const [playerState, setPlayerState] = useState(null)
    const [loopProgress, setLoopProgress] = useState([0,0]);
    const isPlaying = playerState === 'playing';
    const [isMute, setIsMute] = useState(false);
    const [nowPlaying, setNowPlaying] = useState('')
    
    useEffect(()=>{
        if(!player) return;
        if(!player) return;
        const p = player;
        p.onStateChange=(s)=>{setPlayerState(s)}
        p.onTransport = (pos: string, loopPos?: [number,number])=>{
            if(loopPos){
                setLoopProgress(loopPos);
            }
        }

        const sectStart = (index, overrides)=>{
            setNowPlaying(p?.playingNow?.name)
        }
        if(p.onSectionPlayStart){
            const old = p.onSectionPlayStart;
            p.onSectionPlayStart = (index,overrides)=>{
                old(index,overrides)
                sectStart(index,overrides)
            }
        }
        else 
        p.onSectionPlayStart = sectStart
    },[])


    const nodeRef = useRef(null);
    return <nav ref={nodeRef} className={clsx(style.nav, show && style.show, pending && style.pending)}>
        <h2>JSONg</h2>
        <span className={style.progress} style={{
            '--progress': isPlaying ? (1+loopProgress[0]) / loopProgress[1] : 0
        } as CSSProperties}>
            {/* {isPlaying ? 
                <>{nowPlaying} : {loopProgress[0] + 1} / {loopProgress[1]}</>
            : playerState } */}
        </span>
 
        <span className={'material-symbols-outlined'} onClick={()=>{
            setIsMute(m => {
                if(!m) player.muteAll()
                else player.unMuteAll()
                return !m;
            })
        }}>{isPlaying && !isMute ? 'volume_up' : 'volume_off'}</span>
    </nav>
}