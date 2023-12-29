import '../src/types.d'
import { fetchManifest } from '../src/JSONg.parse';
import { fileExistsURL } from '../src/JSONg.path';

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
    sources: {},
  };

  test('should parse a valid JSONg and fall through as object was passed', async () => {
    const [manifest, url, file] = await fetchManifest(jsong)
    expect(manifest).toEqual(jsong);
  });


  describe('direct file path',()=>{ 
    test('fetch song/audio.jsong',async ()=>{
      const spy = jest.spyOn(global, 'fetch').mockImplementationOnce(()=>{
        return Promise.resolve({
        json: ()=>Promise.resolve({
          type: 'jsong',
          jsongVersion: '0.0.3',
          meta: {
            title: 'My JSONg Project',
            author: 'John Doe',
            createdOn: 1589465600000,
            timestamp: 1589465600000,
            projectVersion: '1.0.0',
            createdUsing: 'JSONg Studio 1.0.0',
          }
        })
       } as Response)
      })
      const [manifest, url, file] = await fetchManifest(jsong)
      expect(manifest).toEqual(jsong);
    })
  })
});
