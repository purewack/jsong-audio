import { JSONgManifestFile } from "./types/jsong";
import { fileExistsURL, splitPathFilenameFromURL, rebuildURL, prependURL } from "./JSONg.paths";

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


  return true
}

/**
 * Automatically try to find a manifest file in a provided folder link
 * @param path a URL to a folder
 * @returns filename found inside the provided folder
 */
export async function findManifestURLInFolder(path: string): Promise<[string, object]>{
  // return new Promise(async (resolve, reject)=>{
    const _path = !path.endsWith('/') ? path + '/' : path;
    const expected = [
      'manifest.jsong',
      'manifest.json',
      'audio.jsong',
      'audio.json',
      'song.jsong',
      'song.json'
    ]

    for (const file of expected) {
      const url = new URL(file,_path);
      try {
          const response = await fetch(url);
          const json = await response.json();
          return [file, json];
      } catch (error) {
          // console.error(`Error fetching ${url}:`, error);
      }
    }
    throw new Error('No URLs successfully fetched');
    
    // const promises = expected.map(async (file) => {
    //   try{
    //     await fetch(_path + file)
    //     return Promise.resolve(file); 
    //   }
    //   catch{
    //     return Promise.reject(file);
    //   }
    // });

    // // Wait for all promises to settle
    // const settled = await Promise.allSettled(promises);
    // let res;
    // settled.filter(p => {
    //   p.status === 'fulfilled'
    //   res = p
    // });
    // if(res){
    //   resolve(res.value);
    //   return
    // }
    // // If no valid links were found, reject
    // reject(new Error("No match for auto manifest search"));
  // })
}


/**
 * Actual fetch function to get the manifest file from the provided path / object
 * @param loc either a link to a manifest file or a JSONg formatted object
 * @returns [JSONg manifest, URL of the containing folder, manifest filename]
 */
export default async function fetchManifest(loc: string | JSONgManifestFile): Promise<[JSONgManifestFile, string, string]>{
  let manifest: JSONgManifestFile;
  let baseURL: string = '';
  let filename: string = '';

  if(typeof loc !== 'string') {
    //direct manifest object   
  if(!isManifestValid(loc)) return Promise.reject('Invalid manifest');
    return [{...loc} , (prependURL('').toString()), filename];
  }  
    
  try{
    const [_url, type] = rebuildURL(loc);
    const url = (_url as URL).href;

    if(type === 'folder'){
      try{
        const [autoManifestFilename, jsongManifest] = await findManifestURLInFolder(url);
        baseURL = url
        filename = autoManifestFilename 
        if(!isManifestValid(jsongManifest as JSONgManifestFile)) return Promise.reject('Invalid manifest');
        return [jsongManifest as JSONgManifestFile, baseURL, filename];
      }
      catch{
        return Promise.reject('No match in folder')
      }
    }   
    else {
      //file      
      try{
        [baseURL, filename] = splitPathFilenameFromURL(url);
        const manifestFile = await fetch(baseURL + filename);
        manifest = await manifestFile.json()
        if(!isManifestValid(manifest as JSONgManifestFile)) return Promise.reject('Invalid manifest');
        return [manifest as JSONgManifestFile, baseURL, filename];
      }
      catch{
        return Promise.reject(`JSON parse error ${baseURL + filename}`);
      }
    }   
  }
  catch{
    return Promise.reject('Parsing error');
  }
}
