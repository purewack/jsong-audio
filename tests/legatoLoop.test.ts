import {nextSectionLegatoOffset} from "../src/util/timing"

describe('legato loop',()=>{
    test('long to short 4->2', ()=>{
        expect(nextSectionLegatoOffset(0.66,4,2).toFixed(2)).toBe("1.64")
        expect(nextSectionLegatoOffset(0.2,4,2).toFixed(2)).toBe("0.80")
        expect(nextSectionLegatoOffset(0.5,4,2).toFixed(2)).toBe("1.00")
    })

    test('long to short 2->1', ()=>{
        expect(nextSectionLegatoOffset(0.66,2,1).toFixed(2)).toBe("0.32")
        expect(nextSectionLegatoOffset(0.2,2,1).toFixed(2)).toBe("0.40")
        expect(nextSectionLegatoOffset(0.5,2,1).toFixed(2)).toBe("0.00")
    })  
    test('long to short 4->2', ()=>{
        expect(nextSectionLegatoOffset(0.66,4,2).toFixed(2)).toBe("1.64")
        expect(nextSectionLegatoOffset(0.2,4,2).toFixed(2)).toBe("0.80")
        expect(nextSectionLegatoOffset(0.5,4,2).toFixed(2)).toBe("1.00")
    })
    test('long to short 3->1', ()=>{
        expect(nextSectionLegatoOffset(0.66,3,1).toFixed(2)).toBe("0.98")
        expect(nextSectionLegatoOffset(0.2,3,1).toFixed(2)).toBe("0.60")
        expect(nextSectionLegatoOffset(0.5,3,1).toFixed(2)).toBe("0.50")
    })

    test('short to long 2->4', ()=>{
        expect(nextSectionLegatoOffset(0.66,2,4).toFixed(2)).toBe("2.32")
        expect(nextSectionLegatoOffset(0.2,2,4).toFixed(2)).toBe("0.40")
        expect(nextSectionLegatoOffset(0.5,2,4).toFixed(2)).toBe("2.00")
        expect(nextSectionLegatoOffset(0.9,2,4).toFixed(2)).toBe("3.80")
    })

    test('same length', ()=>{
        expect(nextSectionLegatoOffset(0.66,2,2).toFixed(2)).toBe("1.32")
        expect(nextSectionLegatoOffset(0.2,2,2).toFixed(2)).toBe("0.40")
        expect(nextSectionLegatoOffset(0.5,2,2).toFixed(2)).toBe("1.00")
        expect(nextSectionLegatoOffset(0.9,2,2).toFixed(2)).toBe("1.80")
  
        expect(nextSectionLegatoOffset(0.66,1,1).toFixed(2)).toBe("0.66")
        expect(nextSectionLegatoOffset(0.2,1,1).toFixed(2)).toBe("0.20")

        expect(nextSectionLegatoOffset(0.7,16,16).toFixed(2)).toBe("11.20")
    })
})