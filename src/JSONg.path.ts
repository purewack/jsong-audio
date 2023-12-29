
export function getPathFilenameFromURL(url: string) {
  if(!url.length) return ['',''] as const
  
  const _url = new URL(url);
  if(_url.pathname.length <= 1) return [url,''] as const
  
  const path = _url.origin + _url.pathname.substring(0, _url.pathname.lastIndexOf('/')) + '/';
  const filename = _url.pathname.substring(_url.pathname.lastIndexOf('/')+1)
  return [path, filename] as const;
}

export async function fileExistsURL(path: string){
  try{
    const resp = await fetch(path, {method: 'HEAD'});
    if(resp.status === 404) return false;
    return true;
  }
  catch{
    return false;
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
