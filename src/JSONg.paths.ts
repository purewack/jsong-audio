/**
 * Automatically construct a base url for other links in this context
 * @param url path to a folder or a file
 * @return full URL
 */
export function prependURL(url: string): URL{
  try{ //check for url validity
    const u = new URL(url);
    return u;
  }
  catch { //automatically prepend window location to (public) relative path
    return new URL(window.location.origin + (url ? '/' + url : ''))
  }
}

/**
 * Determine if the URL is pointing to a folder or a specific file
 * @param url to a folder or a file
 * @returns [URL, 'folder' | 'file]
 */
export function rebuildURL(url: string){
  //file
  if(url.endsWith('.jsong') || url.endsWith('json')){
    return [prependURL(url), 'file'];
  }
  
  if(!url.endsWith('/')) url += '/'
  return [prependURL(url), 'folder'];
}


/**
 * Split the provided URL into a path to the containing folder
 * and the filename of the manifest file
 * @param url path to file
 * @returns [URL of folder, filename] 
 */
export function splitPathFilenameFromURL(url: string) {
  
  let _url = prependURL(url);

  if(!url.length) return ['',''] as const
  
  if(_url.pathname.length <= 1) return [url,''] as const
  
  const path = _url.origin + _url.pathname.substring(0, _url.pathname.lastIndexOf('/')) + '/';
  const filename = _url.pathname.substring(_url.pathname.lastIndexOf('/')+1)
  return [path, filename] as const;
}

/**
 * @deprecated Servers can mask responses and return 200 even if file is not real
 * 
 * check if the provided URL points to a real file that exists
 * @param path to file to be checked
 * @returns boolean promise 
 */
export async function fileExistsURL(path: string){
  try{
    const resp = await fetch(path);
    const jsong = await resp.json()
    console.warn(resp, jsong)
    return {exists: (resp.status !== 404), path};
  }
  catch{
    return {exists:false, path};
  }
}
