import { CSSProperties, useContext, useEffect, useRef, useState } from "react"
import JSONg from 'jsong';
import style from '@/styles/nav.module.css'
import { PlayerContext } from "@/pages/_app";

export default function PlayerNav(){

    const player = useContext(PlayerContext);
    const [playerState, setPlayerState] = useState(null)
    const [loopProgress, setLoopProgress] = useState([0,0]);
    
    const [ready, setReady] = useState(false)

    useEffect(()=>{
        if(!player) return;
        const p = player.current;
        p.parse('test_song2').then((reason)=>{
            if(reason === 'loading_full'){
            console.log('Full Load play')
            // p.play();
            setReady(true);
            }
        })
        p.onStateChange=(s)=>{setPlayerState(s)}
        p.onTransport = (pos: string, loopPos?: [number,number])=>{
            if(loopPos){
                setLoopProgress(loopPos);
            }
        }
      
    },[])

    return ready && <nav className={style.nav}>
        <h2>JSONg</h2>
        <span className={style.progress} style={{
                '--progress': playerState === 'playing' ? (1+loopProgress[0]) / loopProgress[1] : 0
            } as CSSProperties}>
        {playerState === 'playing' ? 
            <>{loopProgress[0] + 1} / {loopProgress[1]}</>
        : playerState }
        </span>
        {playerState !== 'playing' ? 
        <button onClick={()=>{
            player?.current.play()
        }}>Play</button>
            : 
        <button onClick={()=>{player?.current.stop('2n')}}>Stop</button>
        }
    </nav>
}