import { fileExistsURL, getPathFilenameFromURL } from "./JSONg.path";
import Logger from "./logger";

export function isManifestValid(manifest: JSONgManifestFile){
  //quit if the provided json is not associated with JSONg audio
  if(manifest?.type !== 'jsong') {
    return false;
  }

  //quit if there are no audio files to load
  if(!manifest?.sources || !Object.keys(manifest?.sources).length) {
    return false
  }

  return true
}

export async function findManifestURLInFolder(path: string): Promise<string>{
  return new Promise((resolve, reject)=>{
    const _path = !path.endsWith('/') ? path + '/' : path;
    const expected = ['manifest.jsong','audio.jsong','manifest.json','audio.json']
     let found = false;
    expected.forEach(async url => {
      try{
        if(await fileExistsURL(_path + url))
        found = true;
        resolve(url);
      }
      catch{}
    })

    if(!found) reject();
  })
}

export async function fetchManifest(file: string | JSONgManifestFile, logger?: Logger): Promise<[JSONgManifestFile, string, string]>{
  let manifest: JSONgManifestFile;
  let baseURL: string = '';
  let filename: string = '';

  if(typeof file === 'string') {
    try{
      let [_url, _file] = getPathFilenameFromURL(file);
      
      //folder
      if(_file === '' && _url.endsWith('/')){
        try{
          const autoManifestFilename = await findManifestURLInFolder(_url);
          [baseURL, filename] = getPathFilenameFromURL(autoManifestFilename);
        }
        catch{
          logger?.error(new Error('could not automatically find .jsong in the URL'));
          return Promise.reject('no match')
        }
      }
      //file
      else{
        baseURL = _url;
        filename = _file;
        if(!(await fileExistsURL(baseURL + filename))) throw new Error('no such file');  
      }

      try {
        const manifestFile = await fetch(baseURL + filename);
        manifest = await manifestFile.json();
      }
      catch(error){
        throw error;
      }
    }
    catch{
      throw new Error('[parse][json] parsing error');
    }
  }
  //direct manifest object
  else {
    manifest = {...file};
  }  
  
  return [manifest , baseURL, filename];
}
