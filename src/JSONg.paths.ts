export function prependURL(url: string): URL{
  try{ //check for url validity
    const u = new URL(url);
    return u;
  }
  catch { //automatically prepend window location to (public) relative path
    return new URL(window.location.origin + (url ? '/' + url : ''))
  }
}

export function rebuildURL(url: string){
  //file
  if(url.endsWith('.jsong') || url.endsWith('json')){
    return [prependURL(url), 'file'];
  }
  
  if(!url.endsWith('/')) url += '/'
  return [prependURL(url), 'folder'];
}

export function splitPathFilenameFromURL(url: string) {
  
  let _url = prependURL(url);

  if(!url.length) return ['',''] as const
  
  if(_url.pathname.length <= 1) return [url,''] as const
  
  const path = _url.origin + _url.pathname.substring(0, _url.pathname.lastIndexOf('/')) + '/';
  const filename = _url.pathname.substring(_url.pathname.lastIndexOf('/')+1)
  return [path, filename] as const;
}

export async function fileExistsURL(path: string){
  try{
    const resp = await fetch(path, {method: 'HEAD'});
    return {exists: (resp.status !== 404), path};
  }
  catch{
    return {exists:false, path};
  }
}

// export function preConditionURL(uri:URLString | DataURIString) : URLString {
//   if(uri.startsWith('./')) return uri.substring(2);
//   else if(uri.startsWith('/')) return uri.substring(1);
//   return uri 
// }

// export function originURL(url?: string){
//   return url ? window.location.origin + '/' + (url) :  window.location.origin
// }
