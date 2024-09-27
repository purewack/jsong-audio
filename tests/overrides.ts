import { PlayerSectionOverrides } from "../src/types/player"
import {splitSectionName} from "../src/overrides"

test('extract override flags from section name', ()=>{
    expect(splitSectionName('test-x->').flags).toMatchObject({
        fade: true,
        once: true
    })
    expect(splitSectionName('test-X->').flags).toMatchObject({
        fade: true,
        once: true
    })
    expect(splitSectionName('test->').flags).toMatchObject({
        fade: false,
        once: true
    })
    expect(splitSectionName('test').flags).toBeUndefined()
})