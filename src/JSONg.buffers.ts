import { ToneAudioBuffer } from "tone";
import { makeBaseURL, preConditionURL } from "./JSONg.path";
import Logger from "./logger";

export function loadBuffers(manifest: JSONgManifestFile, logger?: Logger)
: Promise<PlayerBuffers>
{
  return new Promise(async (resolve,reject)=>{
    const src_keys = Object.keys(manifest.sources)
    if(!src_keys.length){
      logger?.error(new Error('[parse][sources] nothing to load'))
      reject('nothing to load');
      return;
    }

    let loadPromises: Promise<ToneAudioBuffer>[] = [];
    for(const src_id of src_keys){
      const buffer = new ToneAudioBuffer();

      const url = preConditionURL(manifest.sources[src_id]);

      if(url.startsWith('data')) ToneAudioBuffer.baseUrl = ''
      else ToneAudioBuffer.baseUrl = makeBaseURL(manifest.baseURL);
      loadPromises.push(buffer.load(url));

      logger?.info('[parse][sources] adding',src_id);
    }

    if(!loadPromises || !loadPromises.length){
      reject('no buffers');
      return;
    }
    
    try{
      const loadedBuffers = await Promise.all(loadPromises);
      const resultBuffers: PlayerBuffers = {}
      loadedBuffers.forEach((buffer,i) => {
        resultBuffers[src_keys[i]] = buffer;
        logger?.info('[parse][sources] done buffer', buffer);
      })

      resolve(resultBuffers);
    }
    catch(error){
      reject(error);
    }
  })
}