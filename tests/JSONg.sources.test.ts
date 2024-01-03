import { ToneAudioBuffer } from 'tone';
import fetchSources, {fetchSourcePaths} from '../src/JSONg.sources'
import '../src/types.d'

jest.mock('tone', () => ({
    ToneAudioBuffer: jest.fn(),
}));

const mockWindow = {
    location: {
        origin: 'http://test.com',
    },
};
(global as any).window = mockWindow;
  

describe('link resolution',()=>{
    
    jest.spyOn(global, 'fetch').mockImplementation(()=>{
        return Promise.resolve({
            status: 200
        } as Response)
    })

    test('resolve relative links', async ()=>{
        const baseURL = 'http://test.com/song'
        const manifest = {
            sources: {
                'a': './a.mp3',
                'b': './b.wav'
            }
        } as Partial<JSONgManifestFile>

        const res = await fetchSourcePaths(manifest as JSONgManifestFile, baseURL);
        expect(res).toEqual({
            'a': 'http://test.com/song/a.mp3',
            'b': 'http://test.com/song/b.wav'
        })
    })

    test('resolve relative links - root', async ()=>{
        const baseURL = 'http://test.com'
        const manifest = {
            sources: {
                'a': './a.mp3',
                'b': './b.wav'
            }
        } as Partial<JSONgManifestFile>

        const res = await fetchSourcePaths(manifest as JSONgManifestFile, baseURL);
        expect(res).toEqual({
            'a': 'http://test.com/a.mp3',
            'b': 'http://test.com/b.wav'
        })
    })

    test('resolve absolute links', async ()=>{
        const baseURL = 'http://test.com/song'
        const manifest = {
            sources: {
                'a': 'a.mp3',
                'b': 'b.wav'
            }
        } as Partial<JSONgManifestFile>

        const res = await fetchSourcePaths(manifest as JSONgManifestFile, baseURL);
        expect(res).toEqual({
            'a': 'http://test.com/a.mp3',
            'b': 'http://test.com/b.wav'
        })
    })

    test('resolve data links', async ()=>{
        const baseURL = 'http://test.com/song'
        const manifest = {
            sources: {
                'a': 'data:audio',
            }
        } as Partial<JSONgManifestFile>

        const res = await fetchSourcePaths(manifest as JSONgManifestFile, baseURL);
        expect(res).toEqual({
            'a': 'data:audio',
        })
    })

    test('resolve absolute and relative links', async ()=>{
        const baseURL = 'http://test.com/song'
        const manifest = {
            sources: {
                'a': 'a.mp3',
                'b': './b.wav',
            }
        } as Partial<JSONgManifestFile>

        const res = await fetchSourcePaths(manifest as JSONgManifestFile, baseURL);
        expect(res).toEqual({
            'a': 'http://test.com/a.mp3',
            'b': 'http://test.com/song/b.wav'
        })
    })

    test('resolve external link', async ()=>{
        const baseURL = 'http://test.com/song'
        const manifest = {
            sources: {
                'a': 'http://music.com/a.mp3',
            }
        } as Partial<JSONgManifestFile>

        const res = await fetchSourcePaths(manifest as JSONgManifestFile, baseURL);
        expect(res).toEqual({
            'a': 'http://music.com/a.mp3',
        })
    })
    
})

describe('link loading - ToneAudioBuffer mock', () => {

    test('should load audio files successfully', async () => {
        const baseURL = 'http://test.com'
        const mockManifest: Partial<JSONgManifestFile> = {
            type: 'jsong',
            sources: {
                'one':'./path/to/audio1.mp3', 
                'two':'./path/to/audio2.mp3'
            },
        }
        const mockToneAudioBuffer = {
            load: jest.fn().mockResolvedValue(new Promise(resolve=>{
                resolve(new ToneAudioBuffer());
            })),
        };
        (ToneAudioBuffer as unknown as jest.Mock).mockImplementation(() => mockToneAudioBuffer );
        
        const filePaths = await fetchSourcePaths(mockManifest as JSONgManifestFile, baseURL);
        const loadedBuffers = await fetchSources(filePaths as JSONgDataSources);
    
        expect(Object.keys(loadedBuffers).length).toBe(2);
        expect(mockToneAudioBuffer.load).toHaveBeenCalledTimes(2);
        expect(mockToneAudioBuffer.load).toHaveBeenCalledWith(filePaths.one);
        expect(mockToneAudioBuffer.load).toHaveBeenCalledWith(filePaths.two);
    });

    test('should fail to load audio files as one is missing', async () => {
        const baseURL = 'http://test.com'
        const mockManifest: Partial<JSONgManifestFile> = {
            type: 'jsong',
            sources: {
                'one':'./path/to/audio1.mp3', 
                'two':'./fail/to/audio2.mp3'
            },
        }
        const mockToneAudioBuffer = {
            load: jest.fn().mockImplementation((filePath: string)=>{
                console.log(filePath)
                return filePath.includes('fail') 
                ? 
                    Promise.reject(new Error('cannot load'))
                :
                    Promise.resolve(new ToneAudioBuffer());
            })
        };
        (ToneAudioBuffer as unknown as jest.Mock).mockImplementation(() => mockToneAudioBuffer);

        const paths = await fetchSourcePaths(mockManifest as JSONgManifestFile, baseURL);
        return await fetchSources(paths).catch((er)=>expect(er).toBeDefined())
    });
    
});