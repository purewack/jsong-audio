import { fileExistsURL, splitPathFilenameFromURL, rebuildURL, prependURL } from "./JSONg.paths";
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
  return new Promise(async (resolve, reject)=>{
    const _path = !path.endsWith('/') ? path + '/' : path;
    const expected = [
      'manifest.jsong',
      'manifest.json',
      'audio.jsong',
      'audio.json',
      'song.jsong',
      'song.json'
    ]
    
    const promises = expected.map(async (file) => {
      if ((await fileExistsURL(_path + file)).exists) {
        resolve(file); // Resolve with the first valid link
      }
    });

    // Wait for all promises to settle
    await Promise.all(promises);

    // If no valid links were found, reject
    reject(new Error("No match for auto manifest search"));
  })
}

export default async function fetchManifest(file: string | JSONgManifestFile, logger?: Logger): Promise<[JSONgManifestFile, string, string]>{
  let manifest: JSONgManifestFile;
  let baseURL: string = '';
  let filename: string = '';

  if(typeof file !== 'string') {
    //direct manifest object   
  if(!isManifestValid(file)) return Promise.reject('Invalid manifest');
    return [{...file} , (prependURL('').toString()), filename];
  }  
    
  try{
    const [_url, type] = rebuildURL(file);
    const url = (_url as URL).href;

    if(type === 'folder'){
      try{
        const autoManifestFilename = await findManifestURLInFolder(url);
        baseURL = url
        filename = autoManifestFilename 
      }
      catch{
        return Promise.reject('No match in folder')
      }
    }   
    else {
      //file      
      [baseURL, filename] = splitPathFilenameFromURL(url);
      if(!(await fileExistsURL(baseURL + filename)).exists) throw new Error('no such file');  
    }   

    const manifestFile = await fetch(baseURL + filename);
    manifest = await manifestFile.json();
  }
  catch{
    return Promise.reject('Parsing error');
  }

  if(!isManifestValid(manifest)) return Promise.reject('Invalid manifest');

  return [manifest , baseURL, filename];
}
