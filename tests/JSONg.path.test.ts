import {fileExistsURL, getPathFilenameFromURL} from '../src/JSONg.path'

test('truncate the URL correctly', () => {
    const url = 'https://example.com/path/to/file.html';
    const expected = 'https://example.com/path/to/';
    const actual = getPathFilenameFromURL(url)[0];
    expect(actual).toBe(expected);
});

test('get filename from folder URL', ()=>{
    const url = 'https://example.com/path/to/file.html';
    const expected = 'file.html';
    const actual = getPathFilenameFromURL(url)[1];
    expect(actual).toBe(expected);
})

test('get filename from root URL', ()=>{
    const url = 'https://example.com/file.html';
    const expected = 'file.html';
    const actual = getPathFilenameFromURL(url)[1];
    expect(actual).toBe(expected);
})


test('return the same URL if there are no slashes', () => {
    const url = 'https://example.com';
    const expected = 'https://example.com';
    const actual = getPathFilenameFromURL(url)[0];
    expect(actual).toBe(expected);
});

test('return an empty string if the URL is empty', () => {
    const url = '';
    const expected = '';
    const actual = getPathFilenameFromURL(url)[0];
    expect(actual).toBe(expected);
});

describe('fake file in folder /song/audio.jsong',()=>{ 
    test('check if file exists - ok',async ()=>{
        jest.spyOn(global, 'fetch').mockImplementationOnce(()=>Promise.resolve({status: 200} as Response))
        expect(await fileExistsURL('song/audio.jsong')).toBeTruthy();
    })

    test('check if file exists - fail',async ()=>{
        jest.spyOn(global, 'fetch').mockImplementationOnce(()=>Promise.resolve({status: 404} as Response))
        expect(await fileExistsURL('song/notfound.jsong')).toBeFalsy();
    })

    test('check if file exists - error',async ()=>{
        jest.spyOn(global, 'fetch').mockImplementationOnce(()=>Promise.reject())
        expect(await fileExistsURL('song/audio.jsong')).toBeFalsy();
    })
})

// const mockWindow = {
//     location: {
//         origin: 'http://test.com',
//     },
// };
// (global as any).window = mockWindow;
  
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
