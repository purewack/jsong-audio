import '../src/types.d'
import fetchManifest, { findManifestURLInFolder } from '../src/JSONg.manifest';

describe('JSONg parsing', () => {
  const jsong: JSONgManifestFile = {
    type: 'jsong',
    jsongVersion: '0.0.3',
    meta: {
      title: 'My JSONg Project',
      author: 'John Doe',
      createdOn: 1589465600000,
      timestamp: 1589465600000,
      projectVersion: '1.0.0',
      createdUsing: 'JSONg Studio 1.0.0',
    },
    playback: {
      bpm: 120,
      meter: [4,4],
      flow: ['A','B','C','A'],
      map: {
        'A': {
          region: [0, 1],
        },
        'B': {
          region: [1, 2],
        },
        'C': {
          region: [2, 3],
        },
      },
    },
    tracks: [],
    sources: {
      'bass': './bass.mp3',
      'drum': 'drums.mp3',
      'guitar': 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=='
    },
  };

  describe('success conditions',()=>{

    (global as any).window = {
      location: {
          origin: 'http://test.com',
      },
    };

    test('parse a valid JSONg and fall through as object was passed', async () => {
      const [manifest, url, file] = await fetchManifest(jsong)
      expect(manifest).toEqual(jsong);
      expect(url).toBe('http://test.com/');
    });
    
    test('auto find manifest in folder "test"',async ()=>{
      const spy = jest.spyOn(global, 'fetch').mockImplementation(
        (url: RequestInfo | URL)=>{
          const ok = {status: 200} as Response
          const fail = {status: 404} as Response
          return Promise.resolve(url.toString().includes('test/audio.jsong') ? ok : fail)
        }
      )

      const result = await findManifestURLInFolder('test');
      expect(result).toBe('audio.jsong');
    })


    test('fetch "song/other.jsong"',async ()=>{
      const spy = jest.spyOn(global, 'fetch').mockImplementation(()=>{
        return Promise.resolve({
          json: ()=>Promise.resolve({
            ...jsong
          })
        } as Response)
      })
      
      const [manifest, url, file] = await fetchManifest('song/other.jsong')
      
      expect(spy).toHaveBeenCalled();
      expect(manifest).toEqual(jsong);
      expect(url).toEqual('http://test.com/song/');
      expect(file).toEqual('other.jsong');
    })

    test('fetch from "song"',async ()=>{
      const spy = jest.spyOn(global, 'fetch').mockImplementation((url, options)=>{
        if(url.toString().includes('auto/audio.jsong')){
          return Promise.resolve({
            status: 200,
            json: ()=>Promise.resolve({
              ...jsong
            })
          } as Response)
        }
        return Promise.resolve({status: 404} as Response)
      })
      
      const [manifest, url, file] = await fetchManifest('auto')
      
      expect(spy).toHaveBeenCalled();
      expect(url).toEqual('http://test.com/auto/');
      expect(file).toEqual('audio.jsong');
      expect(manifest).toEqual(jsong);
    })
  })

  describe('fail conditions - invalid manifest', ()=>{ 
    const wrongJsong = {
      //type: 'jsong' - missing
      jsongVersion: '0.0.3',
      meta: {
        title: 'My JSONg Project',
    }}

    test('parse a invalid JSONg object',async ()=>{
      return await fetchManifest(wrongJsong as JSONgManifestFile).catch(er => expect(er).toMatch('Invalid manifest'))
    })
  
    test('auto find manifest in folder "test"',async ()=>{
      const spy = jest.spyOn(global, 'fetch').mockImplementation(
        (url: RequestInfo | URL)=>{
          const ok = {json: ()=>Promise.resolve({...wrongJsong}), status: 200} as Response
          const fail = {status: 404} as Response
          return Promise.resolve(url.toString().includes('test/audio.jsong') ? ok : fail)
        }
      )
      return await fetchManifest('test').catch(er => expect(er).toMatch('Invalid manifest'))
    })

  })
});
