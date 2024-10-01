import { ToneAudioBuffer, ToneAudioBuffers } from "tone";
import { rebuildURL, prependURL, fileExistsURL } from "./JSONg.paths";
import { JSONgManifestFile, JSONgDataSources } from "./types/jsong";
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
 *  Base URL = http://test.com/song/
 * 
 *  ./audio.wav = http://test.com/song/audio.wav
 * 
 *  audio.wav = http://test.com/audio.wav
 * @param manifest JSONg formatted object
 * @param origin container folder path
 */
export async function fetchSourcePaths(sources: JSONgDataSources, origin: string){
  const fullURLs: JSONgDataSources = {};

  const _origin = origin.endsWith('/') ? origin : origin + '/'

  if(!sources) return null;
  
  const keys = Object.keys(sources);
  for(const key of keys){
    let fullURL;
    const path = sources[key]

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
export async function fetchSources(paths: JSONgDataSources)
: Promise<{[key:string] : ToneAudioBuffer}>
{
  return new Promise((resolve, reject) => {
    const buffers: {[key:string] : ToneAudioBuffer} = {};

    const instrumentNames = Object.keys(paths);

    const toneBuffers = new ToneAudioBuffers(
      paths,
      () => {
        console.log("ALLL")
        instrumentNames.forEach(name => {
          buffers[name] = toneBuffers.get(name);
        });
        resolve(buffers);
      }
    );
  });
}