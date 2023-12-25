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

    const mockManifest: Partial<JSONgManifestFile> = {
        type: 'jsong',
        baseURL: undefined,
        sources: {
            'one':'path/to/audio1.mp3', 
            'two':'path/to/audio2.mp3'
        },
    }

    test('should load audio files successfully', async () => {
        const mockToneAudioBuffer = {
            load: jest.fn().mockResolvedValue({/* mock return value */}),
        };
    
        (ToneAudioBuffer as unknown as jest.Mock).mockImplementation((filePath: string) => {
            return mockToneAudioBuffer;
        });


        const filePathsKeys = Object.keys(mockManifest.sources as object);
        const loadedBuffers = await loadBuffers(mockManifest as JSONgManifestFile);
    
        expect(loadedBuffers.length).toBe(filePathsKeys.length);
    
        // You can add more specific assertions based on your needs
        expect(ToneAudioBuffer.load).toHaveBeenCalledTimes(filePathsKeys.length);
        expect(ToneAudioBuffer.load).toHaveBeenCalledWith(filePathsKeys[0]);
        expect(ToneAudioBuffer.load).toHaveBeenCalledWith(filePathsKeys[1]);
    });
  });