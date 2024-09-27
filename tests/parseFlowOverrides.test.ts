import { PlayerSectionOverrides } from "../src/types/player"
import {parseFlowOverrides} from "../src/overrides"

test('extract override flags from section name', ()=>{
    expect(parseFlowOverrides('test-x->').flags).toMatchObject({
        fade: true,
        next: true
    })
    expect(parseFlowOverrides('test-X->').flags).toMatchObject({
        fade: true,
        next: true
    })
    expect(parseFlowOverrides('test->').flags).toMatchObject({
        fade: false,
        next: true
    })
    expect(parseFlowOverrides('test').flags).toBeUndefined()
})