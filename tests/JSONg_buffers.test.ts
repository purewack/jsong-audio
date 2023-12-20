import {getDataURL} from '../src/JSONg_buffers'

test('decode URI', ()=>{ 
    expect(getDataURL('test', './', './')).toBe('./test');  
})