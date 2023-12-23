import {formatURL} from '../src/JSONg_buffers'

test('decode URI', ()=>{ 
    expect(formatURL('test', './', './')).toBe('./test');  
})