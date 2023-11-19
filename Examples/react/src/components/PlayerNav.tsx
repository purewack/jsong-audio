import { CSSProperties, useEffect, useRef, useState } from "react"
import JSONg from 'jsong';
import style from '@/styles/nav.module.css'

export default function PlayerNav(){
    useEffect(()=>{
        console.log('render');
    })
    const player = useRef<JSONg>();
    const [playerState, setPlayerState] = useState(null)
    const [loopProgress, setLoopProgress] = useState([0,0]);
    useEffect(()=>{
      if(!player.current) {
        const p = new JSONg(true);
        p.parse('test_song2').then((reason)=>{
          if(reason === 'loading_full'){
            console.log('Full Load play')
            // p.play();
          }
        })
        player.current = p
        p.onStateChange=(s)=>{setPlayerState(s)}
        p.onTransport = (pos: string, loopPos?: [number,number])=>{
            if(loopPos){
                setLoopProgress(loopPos);
            }
        }
      }
    },[])

    return <nav className={style.nav}>
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
            player.current?.play()
        }}>Play</button>
            : 
        <button onClick={()=>{player.current?.stop('2n')}}>Stop</button>
        }
    </nav>
}