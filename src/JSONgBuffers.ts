import { ToneAudioBuffer } from "tone";

export function formatURL(uri:URLString | DataURIString) : URLString {
  if(uri.startsWith('./')) return uri.substring(2);
  else if(uri.startsWith('/')) return uri.substring(1);
  return uri 
}

export function makeBaseURL(baseURL?: string){
  return baseURL ? window.location.origin + '/' + (baseURL) :  window.location.origin
}

export function loadBuffers(manifest: JSONgManifestFile, verboseLevel: VerboseLevel = undefined)
: Promise<PlayerBuffers>
{
  return new Promise(async (resolve,reject)=>{
    const src_keys = Object.keys(manifest.sources)
    if(!src_keys.length){
      console.error('[parse][sources] nothing to load')
      reject('nothing to load');
      return;
    }

    let loadPromises: Promise<ToneAudioBuffer>[] = [];
    for(const src_id of src_keys){
      const buffer = new ToneAudioBuffer();

      const url = formatURL(manifest.sources[src_id]);

      if(url.startsWith('data')) ToneAudioBuffer.baseUrl = ''
      else ToneAudioBuffer.baseUrl = makeBaseURL(manifest.baseURL);
      loadPromises.push(buffer.load(url));

      if(verboseLevel === 'all') console.info('[parse][sources] adding',src_id);
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
        if(verboseLevel === 'all') console.info('[parse][sources] done buffer', buffer);
      })

      resolve(resultBuffers);
    }
    catch(error){
      reject(error);
    }
  })
}