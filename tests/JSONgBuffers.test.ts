import { ToneAudioBuffer } from 'tone';
import {formatURL, loadBuffers, makeBaseURL} from '../src/JSONgBuffers'
import '../src/types.d.ts'

jest.mock('tone', () => ({
    ToneAudioBuffer: jest.fn(),
}));

const mockWindow = {
    location: {
        origin: 'http://test.com',
    },
};
(global as any).window = mockWindow;
  
test('format URI', ()=>{ 
    expect(formatURL('./test')).toBe('test');  
    expect(formatURL('/test')).toBe('test');  
    expect(formatURL('other/test')).toBe('other/test');
    expect(formatURL('/other/test')).toBe('other/test');   
    expect(formatURL('./other/test')).toBe('other/test');   
})

test('base URL resolution', ()=>{
    expect(makeBaseURL()).toBe('http://test.com')
    expect(makeBaseURL('songs/test')).toBe('http://test.com/songs/test')
})

describe('ToneAudioBuffer mock', () => {

    test('should load audio files successfully', async () => {
        const mockManifest: Partial<JSONgManifestFile> = {
            type: 'jsong',
            baseURL: undefined,
            sources: {
                'one':'path/to/audio1.mp3', 
                'two':'path/to/audio2.mp3'
            },
        }

        const mockToneAudioBuffer = {
            load: jest.fn().mockResolvedValue(new Promise(resolve=>{
                resolve(new ToneAudioBuffer());
            })),
        };
    
        (ToneAudioBuffer as unknown as jest.Mock).mockImplementation(() => mockToneAudioBuffer );

        const filePathsKeys = Object.keys(mockManifest.sources as object);
        const loadedBuffers = await loadBuffers(mockManifest as JSONgManifestFile);
    
        expect(Object.keys(loadedBuffers).length).toBe(filePathsKeys.length);
        
        // You can add more specific assertions based on your needs
        expect(mockToneAudioBuffer.load).toHaveBeenCalledTimes(filePathsKeys.length);
        expect(mockToneAudioBuffer.load).toHaveBeenCalledWith((mockManifest.sources as JSONgDataSources).one);
        expect(mockToneAudioBuffer.load).toHaveBeenCalledWith((mockManifest.sources as JSONgDataSources).two);
    });

    test('should fail to load audio files as one is missing', async () => {
        const mockManifest: Partial<JSONgManifestFile> = {
            type: 'jsong',
            baseURL: undefined,
            sources: {
                'one':'path/to/audio1.mp3', 
                'two':'fail/to/audio2.mp3'
            },
        }

        const mockToneAudioBuffer = {
            load: jest.fn().mockImplementation((filePath: string)=>{
                return filePath.includes('fail') 
                ? 
                    Promise.reject(new Error('cannot load'))
                :
                    Promise.resolve(new ToneAudioBuffer());
            })
        };
    
        (ToneAudioBuffer as unknown as jest.Mock).mockImplementation(() => mockToneAudioBuffer);

        const buffers = await expect(loadBuffers(mockManifest as JSONgManifestFile)).rejects.toThrow('cannot load');
        // expect(Object.keys(buffers).length)
    });
    
  });