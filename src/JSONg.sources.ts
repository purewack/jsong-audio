import { ToneAudioBuffer, ToneAudioBuffers } from "tone";
import { rebuildURL, prependURL, fileExistsURL } from "./JSONg.paths";
import { JSONgDataSources } from "./types/jsong";
// import { PlayerBuffers } from "./types/player";

/**
 * Build full URLs to needed source files using the manifest specified files
 * The sources can either be:
 *  * Direct audio data as a data:URI
 *  * A relative path within the containing folder, denoted using './'
 *  * An absolute path starting at the root folder, denoted using no prefix
 * 
 * *Example of paths:*
 * 
 *  origin URL = http://test.com/song/
 *  - `./audio.wav` = http://test.com/song/audio.wav
 *  - `./nested/audio.wav` = http://test.com/song/nested/audio.wav
 *  - __`nested/audio.wav`__ = http://test.com/nested/audio.wav
 *  - `audio.mp3` = http://test.com/audio.mp3
 *  
 * @param sources object with key names referring to track names and values are links
 * @param origin container folder path
 */
export async function compileSourcePaths(sources: JSONgDataSources, origin: string){
  const fullURLs: JSONgDataSources = {};

  const _origin = origin.endsWith('/') ? origin : origin + '/'

  if(!sources) return null;
  
  const keys = Object.keys(sources);
  for(const key of keys){
    let fullURL;
    const path = sources[key]
    // console.log("check path",key,path)
    if (path.startsWith('data:')) {
      // Direct audio data as a data:URI
      fullURL = path;
    } else if (path.startsWith('./')) {
      // A relative path within the containing folder, denoted using './'
      fullURL = _origin + path.substring(2);
    } else {
      // An absolute path starting at the root folder, denoted using no prefix
      fullURL = prependURL(path).toString();
    }

    // if(! (await fileExistsURL(fullURL))) throw new Error(`Source does not exist: ${fullURL}`)

    fullURLs[key] = fullURL; 
  }

  return fullURLs;
}

/**
 * Return all needed audio buffers built from the provided links
 * @param paths links to audio sources per track name `{track: url}`
 * @returns an array of audio buffers
 */
export async function fetchSources(paths: JSONgDataSources)
: Promise<{[key:string] : ToneAudioBuffer}>
{
  return new Promise(async (resolve, reject)=>{
    
    const keys = Object.keys(paths);
  
    if(!keys.length) return new Error('nothing to load')

    ToneAudioBuffer.baseUrl = ''
      
    let loadPromises: Promise<ToneAudioBuffer>[] = [];
    for(const key of keys){
      const buffer = new ToneAudioBuffer()
      // console.log("[source] loading", key, paths[key].slice(0,128))
      loadPromises.push(buffer.load(paths[key]));
    }

    if(!loadPromises || !loadPromises.length) 
      throw new Error('no source buffers');
    
    try{
      const loadedBuffers = await Promise.all(loadPromises);
      const resultBuffers: any = {}
      loadedBuffers.forEach((buffer,i) => {
        resultBuffers[keys[i]] = buffer;
      })
      resolve(resultBuffers); 
      }
    catch {
      reject('buffer source load failure')
    } 
  })
}