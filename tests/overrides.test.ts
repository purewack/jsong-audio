import {splitSectionName} from "../src/sectionsBuild"

test('extract override flags from section name', ()=>{
    expect(splitSectionName('test-x->')).toMatchObject({
        fade: true,
        once: true
    })
    expect(splitSectionName('test-X->')).toMatchObject({
        fade: true,
        once: true
    })
    expect(splitSectionName('test->')).toMatchObject({
        fade: false,
        once: true
    })
    expect(splitSectionName('test->')).toMatchObject({
        fade: false,
        once: true
    })
    expect(splitSectionName('test-|')).toMatchObject({
        legato: true,
    })
    expect(splitSectionName('test')).toMatchObject({
        name: 'test'
    })
    expect(splitSectionName('test-')).toMatchObject({
        name: 'test'
    })
})