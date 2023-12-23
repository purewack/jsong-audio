
// if(!dataPath){
//     const sep = (manifestPath.endsWith('/')  ? ' ' : '/')
//     return _loadpath = manifestPath + sep; 
//     if(this.verbose >= VerboseLevel.basic) console.log('[parse] Loading from path',_loadpath)
//     return this.parse(_loadpath + 'audio.jsong', _loadpath);
//   }
// export function checkPath(){
//     const sep = (manifestPath.endsWith('/')  ? ' ' : '/')
//     return _loadpath = manifestPath + sep;
// }

import { ToneAudioBuffer } from "tone";
import { VerboseLevel } from "./JSONg";

export function formatURL(uri:URLString | DataURIString, dataPath: string, manifestPath: string) : URLString{
    const _dataPath = dataPath ? dataPath : manifestPath
    const url = uri.startsWith('data') ? uri : _dataPath + (uri.startsWith('./') ? uri.substring(1) : ('/' + uri))
    return url;
}

export async function loadBuffers(sources: PlayerDataSources, dataPath: string, manifestPath: string, verboseLevel: VerboseLevel = VerboseLevel.none)
: Promise<PlayerBuffers>
{
    const src_keys = Object.keys(sources)
    if(!src_keys.length){
      console.error('[parse][sources] nothing to load')
      throw new Error('nothing to load');
    }

    let loadPromises: Promise<ToneAudioBuffer>[] = [];
    for(const src_id of src_keys){
      const buffer = new ToneAudioBuffer();

      const url = formatURL(sources[src_id], dataPath, manifestPath);

      if(url.startsWith('data'))  ToneAudioBuffer.baseUrl = ''
      else ToneAudioBuffer.baseUrl = window.location.origin
      loadPromises.push(buffer.load(url));

      if(verboseLevel === VerboseLevel.basic) console.info('[parse][sources] adding',src_id);
    }
    
    const loadedBuffers = await Promise.all(loadPromises);
    const resultBuffers: PlayerBuffers = {}
    loadedBuffers.forEach((buffer,i) => {
      resultBuffers[src_keys[i]] = buffer;
      if(verboseLevel === VerboseLevel.parse) console.info('[parse][sources] done buffer', buffer);
    })

    return resultBuffers;
}