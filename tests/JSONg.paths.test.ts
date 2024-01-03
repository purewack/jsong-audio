import {fileExistsURL, splitPathFilenameFromURL} from '../src/JSONg.paths'

const mockWindow = {
    location: {
        origin: 'http://test.com',
    },
};
(global as any).window = mockWindow;
 
test('truncate the URL correctly', () => {
    const url = 'https://example.com/path/to/file.html';
    const expected = 'https://example.com/path/to/';
    const actual = splitPathFilenameFromURL(url)[0];
    expect(actual).toBe(expected);
});

test('get filename from folder URL', ()=>{
    const url = 'https://example.com/path/to/file.html';
    const expected = 'file.html';
    const actual = splitPathFilenameFromURL(url)[1];
    expect(actual).toBe(expected);
})

test('get filename from root URL', ()=>{
    const url = 'https://example.com/file.html';
    const expected = 'file.html';
    const actual = splitPathFilenameFromURL(url)[1];
    expect(actual).toBe(expected);
})


test('return the same URL if there are no slashes', () => {
    const url = 'https://example.com';
    const expected = 'https://example.com';
    const actual = splitPathFilenameFromURL(url)[0];
    expect(actual).toBe(expected);
});


test('an empty URL', () => {
    expect(splitPathFilenameFromURL('')).toEqual(['',''])
});

describe('fake file in folder /song/audio.jsong',()=>{ 
    test('check if file exists - ok',async ()=>{
        jest.spyOn(global, 'fetch').mockImplementationOnce(()=>Promise.resolve({status: 200} as Response))
        expect((await fileExistsURL('song/audio.jsong')).exists).toBeTruthy();
    })

    test('check if file exists - fail',async ()=>{
        jest.spyOn(global, 'fetch').mockImplementationOnce(()=>Promise.resolve({status: 404} as Response))
        expect((await fileExistsURL('song/notfound.jsong')).exists).toBeFalsy();
    })

    test('check if file exists - error',async ()=>{
        jest.spyOn(global, 'fetch').mockImplementationOnce(()=>Promise.reject())
        expect((await fileExistsURL('song/audio.jsong')).exists).toBeFalsy();
    })
})

 
// test('format URI', ()=>{ 
//     expect(formatURL('./test')).toBe('test');  
//     expect(formatURL('/test')).toBe('test');  
//     expect(formatURL('other/test')).toBe('other/test');
//     expect(formatURL('/other/test')).toBe('other/test');   
//     expect(formatURL('./other/test')).toBe('other/test');   
// })

// test('base URL resolution', ()=>{
//     expect(makeBaseURL()).toBe('http://test.com')
//     expect(makeBaseURL('songs/test')).toBe('http://test.com/songs/test')
// })
