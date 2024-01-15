import { ToneAudioBuffer } from "tone";
import { rebuildURL, prependURL, fileExistsURL } from "./JSONg.paths";
import { JSONgManifestFile, JSONgDataSources } from "./types/jsong";
import { PlayerBuffers } from "./types/player";

/**
 * Build full URLs to needed source files using the manifest specified files
 * The sources can either be:
 *  * Direct audio data as a data:URI
 *  * A relative path within the containing folder, denoted using './'
 *  * An absolute path starting at the root folder, denoted using no prefix
 * 
 * *Example of paths:*
 * 
 *  Base URL = http://test.com/song/
 * 
 *  ./audio.wav = http://test/com/song/audio.wav
 * 
 *  audio.wav = http://test/com/audio.wav
 * @param manifest JSONg formatted object
 * @param baseURL container folder path
 */
export async function fetchSourcePaths(manifest: JSONgManifestFile, baseURL: string){
  const fullURLs: JSONgDataSources = {};

  const _origin = baseURL.endsWith('/') ? baseURL : baseURL + '/'

  const keys = Object.keys(manifest.sources);
  for(const key of keys){
    let fullURL;
    const path = manifest.sources[key]

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
 * @param paths links to audio sources
 * @returns an array of audio buffers
 */
export default function fetchSources(paths: JSONgDataSources)
: Promise<PlayerBuffers>
{
  return new Promise(async (resolve, reject)=>{
    
    const keys = Object.keys(paths);
  
    if(!keys.length) return new Error('nothing to load')

    ToneAudioBuffer.baseUrl = ''
      
    let loadPromises: Promise<ToneAudioBuffer>[] = [];
    for(const key of keys){
      const buffer = new ToneAudioBuffer();
      loadPromises.push(buffer.load(paths[key]));
    }

    if(!loadPromises || !loadPromises.length) 
      throw new Error('no source buffers');
    
    try{
    const loadedBuffers = await Promise.all(loadPromises);
    const resultBuffers: PlayerBuffers = {}
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