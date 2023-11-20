import style from '@/styles/slide.module.css'
import clsx from 'clsx';
import { Props } from 'next/script';
import { ReactNode, useEffect } from 'react';
import { InView, useInView } from 'react-intersection-observer';
export type SlideType = 'slide' | 'side' | 'down';

export default function SectionSlide({type = 'slide', className='', onInView, tag='', children} 
: {
    children: ReactNode, 
    type?: SlideType,
    className?:string, 
    tag?: string,
    onInView?:(tag:string)=>void
}){
    return (type === 'side' || type === 'down') ? <article className={clsx(className,style.gallery, style[type], style.snap, 'fullpage')}>
        {children}
    </article>
    :
    <InView threshold={0.8} onChange={()=>{onInView?.(tag)}}>
    <section className={clsx('fullpage central ',style.slide,style.snap,className)}>
        {children}
    </section>
    </InView>
}