import fetchManifest, { findManifestURLInFolder } from '../src/JSONg.manifest';
import { prependURL } from '../src/JSONg.paths';
import { JSONgManifestFile } from '../src/types/jsong';

describe('JSONg parsing', () => {
  
  (global as any).window = {
    location: {
        origin: 'http://test.com',
    },
  };

  const jsong: JSONgManifestFile = {
    type: 'jsong',
    version: '0.0.1',
    meta: {
      title: 'My JSONg Project',
      author: 'John Doe',
      created: 1589465600000,
      modified: 1589465600000,
      version: '1.0.0',
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
    tracks: []
  };

  describe('success conditions',()=>{

    let fetchMock: any = undefined;
    beforeEach(() => {
        fetchMock = jest.spyOn(global, "fetch")
        .mockImplementation((input: any)=>{
          //test.com layout:
          // - /song
          // - - other.jsong
          // - /auto
          // - - audio.jsong
          // - /test
          // - - audio.json

          //music.com layout:
          // - /auto
          // - - audio.jsong
          const url = input.toString()
          if(url.endsWith('song/other.jsong')
          || url.endsWith('auto/audio.jsong')
          || url.endsWith('test/audio.json'))
          return Promise.resolve({
            status: 200,
            json: ()=>Promise.resolve({...jsong})
          } as Response)

          return Promise.resolve({status: 404} as Response)
        });
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    

    test('parse a valid JSONg and fall through as object was passed', async () => {
      const [manifest, url, file] = await fetchManifest(jsong)
      expect(manifest).toEqual(jsong);
      expect(url).toBe('http://test.com/');
    });
    
    test('auto find manifest in folder "test"',async ()=>{
      const [filename, data] = await findManifestURLInFolder(prependURL('test').toString());
      expect(filename).toBe('audio.json');
    })


    test('fetch "song/other.jsong"',async ()=>{     
      const [manifest, url, file] = await fetchManifest('song/other.jsong')
      
      expect(fetchMock).toHaveBeenCalled();
      expect(manifest).toEqual(jsong);
      expect(url).toEqual('http://test.com/song/');
      expect(file).toEqual('other.jsong');
    })

    test('fetch from "auto"',async ()=>{
      const [manifest, url, file] = await fetchManifest('auto')
      
      expect(fetchMock).toHaveBeenCalled();
      expect(url).toEqual('http://test.com/auto/');
      expect(file).toEqual('audio.jsong');
      expect(manifest).toEqual(jsong);
    })


    test('fetch external folder - "http://music.com/auto"',async ()=>{
      const [manifest, url, file] = await fetchManifest('http://music.com/auto')
      
      expect(fetchMock).toHaveBeenCalled();
      expect(url).toEqual('http://music.com/auto/');
      expect(file).toEqual('audio.jsong');
      expect(manifest).toEqual(jsong);
    })
  })




  // describe('fail conditions - invalid manifest', ()=>{ 
  //   const wrongJsong = {
  //     //type: 'jsong' - missing
  //     jsongVersion: '0.0.3',
  //     meta: {
  //       title: 'My JSONg Project',
  //   }}

  //   test('parse a invalid JSONg object',async ()=>{
  //     return await fetchManifest(wrongJsong as JSONgManifestFile).catch(er => expect(er).toMatch('Invalid manifest'))
  //   })
  
  //   test('auto find manifest in folder "test"',async ()=>{
  //     const spy = jest.spyOn(global, 'fetch').mockImplementation(
  //       (url: RequestInfo | URL)=>{
  //         const ok = {json: ()=>Promise.resolve({...wrongJsong}), status: 200} as Response
  //         const fail = {status: 404} as Response
  //         return Promise.resolve(url.toString().includes('test/audio.jsong') ? ok : fail)
  //       }
  //     )
  //     return await fetchManifest('test').catch(er => expect(er).toMatch('Invalid manifest'))
  //   })

  // })
});
