import { fileExistsURL, splitPathFilenameFromURL, rebuildURL, prependURL } from "./JSONg.paths";
import Logger from "./logger";

/**
 * Brief check for the data type of the parsed JSON
 * @param manifest JSONg formatted object
 * @returns boolean
 */
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

/**
 * Automatically try to find a manifest file in a provided folder link
 * @param path a URL to a folder
 * @returns filename found inside the provided folder
 */
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


/**
 * Actual fetch function to get the manifest file from the provided path / object
 * @param file either a link to a manifest file or a JSONg formatted object
 * @returns [JSONg manifest, URL of the containing folder, manifest filename]
 */
export default async function fetchManifest(file: string | JSONgManifestFile): Promise<[JSONgManifestFile, string, string]>{
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
